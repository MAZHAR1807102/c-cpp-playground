// Flowcharts from source code (C, C++, Java, Python). No DOM: the page (visualize.js) and the Node tests share it.
//   buildCharts(tree.rootNode, lang)  -> { charts: [{ name, title, line, endLine, ir }], hasError }
//   layoutChart(chart)                -> { w, h, nodes, edges, dots }   (absolute coordinates)
//   renderSVG(layout)                 -> '<svg …>' string
// The syntax tree comes from tree-sitter. Statements become a small tree ("IR") of seq / stmt / if / loop / multi
// (switch, match, try handlers) / jump nodes, which is laid out top to bottom: decisions are diamonds, loops get a
// back edge on the left and their exit on the right, break and continue use lettered connector circles.

/* ---------------------------------------------------------------- IR ---------------------------------------------------------------- */
const clean = s => s.replace(/\s+/g, ' ').trim().replace(/;$/, '').trim();
function unparen(s) {
  s = clean(s);
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0, ok = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth++; else if (s[i] === ')') depth--;
      if (depth === 0 && i < s.length - 1) { ok = false; break; }
    }
    if (!ok) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}
const L1 = n => n.startPosition.row + 1;
const L2 = n => n.endPosition.row + 1;
const named = n => n ? n.namedChildren.filter(c => c.type !== 'comment' && c.type !== 'line_comment' && c.type !== 'block_comment') : [];
const field = (n, f) => n.childForFieldName(f);
const seq = items => ({ t: 'seq', items: items.flatMap(i => !i ? [] : i.t === 'seq' ? i.items : [i]) });
const stmt = (text, n, kind = 'proc') => ({ t: 'stmt', kind, text: clean(text), line: L1(n), endLine: L2(n) });
const INFINITE = new Set(['', '1', 'true', 'True']);

const IO = {
  c: /\b(printf|puts|putchar|scanf|getchar|gets|fgets|fputs|fprintf|fscanf|sscanf|sprintf|snprintf)\s*\(/,
  cpp: /\b(cout|cin|cerr|clog|printf|puts|putchar|scanf|getchar|getline|fgets)\b/,
  java: /\bSystem\.(out|err)\.|\.(next(Int|Line|Double|Long|Float|Boolean|Short|Byte)?|readLine|hasNext\w*)\s*\(/,
  python: /(^|[^\w.])(print|input)\s*\(|\bsys\.std(in|out|err)\b/
};
function classify(text, lang, fns) {
  if (IO[lang].test(text)) return /\b(scanf|getchar|gets|fgets|fscanf|cin|getline|input|next\w*|readLine|stdin)\b/.test(text) && !/\b(printf|cout|print|System\.out)\b/.test(text) ? 'in' : 'out';
  for (const f of fns) if (new RegExp('(^|[^\\w.])' + f.replace(/[^\w]/g, '') + '\\s*\\(').test(text)) return 'call';
  return 'proc';
}

/* C and C++ */
function cStmt(n, cx) {
  switch (n.type) {
    case 'compound_statement': return seq(named(n).map(c => cStmt(c, cx)));
    case ';': return null;
    case 'expression_statement': { if (!named(n).length) return null; const s = stmt(n.text, n); s.kind = classify(s.text, cx.lang, cx.fns); return s; }
    case 'declaration': {
      // a function prototype inside a function is not a step
      if (named(n).some(d => d.type === 'function_declarator')) return null;
      const s = stmt(n.text, n); s.kind = classify(s.text, cx.lang, cx.fns); return s;
    }
    case 'if_statement': {
      let alt = field(n, 'alternative');
      if (alt && alt.type === 'else_clause') alt = named(alt)[0];
      const cond = field(n, 'condition');
      return { t: 'if', cond: unparen(cond ? cond.text : ''), line: L1(n), endLine: cond ? L2(cond) : L1(n),
        then: seq([cStmt(field(n, 'consequence'), cx)]), else: alt ? seq([cStmt(alt, cx)]) : null };
    }
    case 'while_statement': { const c = field(n, 'condition'); return { t: 'loop', kind: 'while', cond: unparen(c ? c.text : ''), line: L1(n), endLine: c ? L2(c) : L1(n), body: seq([cStmt(field(n, 'body'), cx)]) }; }
    case 'do_statement': { const c = field(n, 'condition'); return { t: 'loop', kind: 'do', cond: unparen(c ? c.text : ''), line: c ? L1(c) : L2(n), endLine: L2(n), body: seq([cStmt(field(n, 'body'), cx)]) }; }
    case 'for_statement': {
      const init = field(n, 'initializer'), cond = field(n, 'condition'), upd = field(n, 'update');
      return { t: 'loop', kind: 'for', line: L1(n), endLine: L1(n), cond: cond ? unparen(cond.text) : '',
        init: init ? stmt(init.text, init) : null, update: upd ? stmt(upd.text, upd) : null, body: seq([cStmt(field(n, 'body'), cx)]) };
    }
    case 'for_range_loop': {
      const d = field(n, 'declarator'), r = field(n, 'right');
      return { t: 'loop', kind: 'each', cond: `next ${clean(d ? d.text : '?')} in ${clean(r ? r.text : '?')}`, line: L1(n), endLine: L1(n), body: seq([cStmt(field(n, 'body'), cx)]) };
    }
    case 'switch_statement': {
      const c = field(n, 'condition');
      const cases = named(field(n, 'body')).filter(k => k.type === 'case_statement').map(k => {
        const v = field(k, 'value');
        return { label: v ? 'case ' + clean(v.text) : 'default', line: L1(k), body: seq(named(k).filter(s => s !== v && s.id !== (v && v.id)).map(s => cStmt(s, cx))) };
      });
      return multiCases({ t: 'multi', kind: 'switch', head: 'switch ' + unparen(c ? c.text : ''), line: L1(n), endLine: c ? L2(c) : L1(n) }, cases, true);
    }
    case 'return_statement': return { t: 'jump', kind: 'return', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'break_statement': return { t: 'jump', kind: 'break', text: 'break', line: L1(n), endLine: L2(n) };
    case 'continue_statement': return { t: 'jump', kind: 'continue', text: 'continue', line: L1(n), endLine: L2(n) };
    case 'throw_statement': return { t: 'jump', kind: 'throw', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'goto_statement': return stmt(n.text, n);
    case 'labeled_statement': { const inner = named(n).filter(c => c.type !== 'statement_identifier'); const lab = named(n).find(c => c.type === 'statement_identifier'); return seq([stmt((lab ? lab.text : '') + ':', n), ...inner.map(c => cStmt(c, cx))]); }
    case 'try_statement': {
      const handlers = named(n).filter(c => c.type === 'catch_clause').map(c => { const p = field(c, 'parameters'); return { label: 'catch ' + clean(p ? p.text : '(...)'), line: L1(c), body: seq([cStmt(field(c, 'body'), cx)]) }; });
      return tryIR(n, seq([cStmt(field(n, 'body'), cx)]), handlers, null, null);
    }
    default:
      if (/^preproc|^(type_definition|struct_specifier|enum_specifier|class_specifier|alias_declaration|using_declaration|static_assert_declaration|namespace_alias_definition)$/.test(n.type)) return null;
      return stmt(n.text, n);
  }
}
function cFunctions(root, lang) {
  const out = [];
  (function walk(n, scope) {
    for (const c of named(n)) {
      if (c.type === 'function_definition') {
        let d = field(c, 'declarator');
        while (d && d.type !== 'function_declarator' && field(d, 'declarator')) d = field(d, 'declarator');
        if (!d || d.type !== 'function_declarator') continue;
        const id = field(d, 'declarator'), params = field(d, 'parameters');
        const base = clean(id ? id.text : '?');
        out.push({ name: scope && !base.includes('::') ? scope + '::' + base : base, params: clean(params ? params.text : '()'), node: c, body: field(c, 'body') });
      } else if (/^(class_specifier|struct_specifier|union_specifier)$/.test(c.type)) {
        const nm = field(c, 'name'), b = field(c, 'body');
        if (b) walk(b, nm ? clean(nm.text) : scope);
      } else if (/^(namespace_definition|linkage_specification|template_declaration|declaration_list|field_declaration_list|preproc_ifdef|preproc_if|preproc_else|preproc_elif|declaration|field_declaration)$/.test(c.type)) walk(c, scope);
    }
  })(root, '');
  return out;
}

/* Java */
function jStmt(n, cx) {
  switch (n.type) {
    case 'block': case 'constructor_body': return seq(named(n).map(c => jStmt(c, cx)));
    case ';': return null;
    case 'expression_statement': case 'local_variable_declaration': { const s = stmt(n.text, n); s.kind = classify(s.text, 'java', cx.fns); return s; }
    case 'if_statement': {
      const cond = field(n, 'condition'), alt = field(n, 'alternative');
      return { t: 'if', cond: unparen(cond ? cond.text : ''), line: L1(n), endLine: cond ? L2(cond) : L1(n), then: seq([jStmt(field(n, 'consequence'), cx)]), else: alt ? seq([jStmt(alt, cx)]) : null };
    }
    case 'while_statement': { const c = field(n, 'condition'); return { t: 'loop', kind: 'while', cond: unparen(c ? c.text : ''), line: L1(n), endLine: c ? L2(c) : L1(n), body: seq([jStmt(field(n, 'body'), cx)]) }; }
    case 'do_statement': { const c = field(n, 'condition'); return { t: 'loop', kind: 'do', cond: unparen(c ? c.text : ''), line: c ? L1(c) : L2(n), endLine: L2(n), body: seq([jStmt(field(n, 'body'), cx)]) }; }
    case 'for_statement': {
      const inits = n.childrenForFieldName('init').filter(Boolean), cond = field(n, 'condition'), upds = n.childrenForFieldName('update').filter(Boolean);
      return { t: 'loop', kind: 'for', line: L1(n), endLine: L1(n), cond: cond ? unparen(cond.text) : '',
        init: inits.length ? stmt(inits.map(i => i.text).join(', '), inits[0]) : null,
        update: upds.length ? stmt(upds.map(u => u.text).join(', '), upds[0]) : null, body: seq([jStmt(field(n, 'body'), cx)]) };
    }
    case 'enhanced_for_statement': {
      const nm = field(n, 'name'), v = field(n, 'value');
      return { t: 'loop', kind: 'each', cond: `next ${clean(nm ? nm.text : '?')} in ${clean(v ? v.text : '?')}`, line: L1(n), endLine: L1(n), body: seq([jStmt(field(n, 'body'), cx)]) };
    }
    case 'switch_expression': case 'switch_statement': {
      const c = field(n, 'condition'), body = field(n, 'body');
      const cases = [];
      let colon = false;
      for (const g of named(body)) {
        const labels = named(g).filter(k => k.type === 'switch_label');
        const label = labels.map(l => clean(l.text).replace(/:$/, '').trim()).join(', ') || 'case';
        const rest = named(g).filter(k => k.type !== 'switch_label');
        if (g.type === 'switch_block_statement_group') colon = true;
        cases.push({ label, line: L1(g), body: seq(rest.map(s => jStmt(s, cx))) });
      }
      return multiCases({ t: 'multi', kind: 'switch', head: 'switch ' + unparen(c ? c.text : ''), line: L1(n), endLine: c ? L2(c) : L1(n) }, cases, colon);
    }
    case 'return_statement': return { t: 'jump', kind: 'return', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'yield_statement': return { t: 'jump', kind: 'return', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'break_statement': return { t: 'jump', kind: 'break', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'continue_statement': return { t: 'jump', kind: 'continue', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'throw_statement': return { t: 'jump', kind: 'throw', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'labeled_statement': { const inner = named(n).slice(1); return seq(inner.map(c => jStmt(c, cx))); }
    case 'synchronized_statement': return seq([jStmt(field(n, 'body') || named(n).pop(), cx)]);
    case 'try_statement': case 'try_with_resources_statement': {
      const handlers = named(n).filter(c => c.type === 'catch_clause').map(c => { const p = named(c).find(k => k.type === 'catch_formal_parameter'); return { label: 'catch ' + clean(p ? p.text : ''), line: L1(c), body: seq([jStmt(field(c, 'body'), cx)]) }; });
      const fin = named(n).find(c => c.type === 'finally_clause');
      const res = field(n, 'resources');
      return tryIR(n, seq([res ? stmt('try ' + res.text, res) : null, jStmt(field(n, 'body'), cx)]), handlers, null, fin ? seq([jStmt(named(fin).find(k => k.type === 'block'), cx)]) : null);
    }
    case 'local_class_declaration': case 'class_declaration': case 'record_declaration': case 'enum_declaration': case 'interface_declaration': return null;
    default: return stmt(n.text, n);
  }
}
function jFunctions(root) {
  const out = [];
  (function walk(n, cls) {
    for (const c of named(n)) {
      if (/^(class_declaration|interface_declaration|enum_declaration|record_declaration)$/.test(c.type)) {
        const nm = field(c, 'name'), b = field(c, 'body');
        if (b) walk(b, nm ? nm.text : cls);
      } else if (c.type === 'method_declaration' || c.type === 'constructor_declaration' || c.type === 'compact_constructor_declaration') {
        const nm = field(c, 'name'), p = field(c, 'parameters'), b = field(c, 'body');
        if (b) out.push({ name: (cls ? cls + '.' : '') + (nm ? nm.text : '?'), short: nm ? nm.text : '?', params: clean(p ? p.text : '()'), node: c, body: b });
      } else if (/^(class_body|enum_body|enum_body_declarations|interface_body)$/.test(c.type)) walk(c, cls);
    }
  })(root, '');
  // "Main.main" reads better as "main" when the method name is unique
  for (const f of out) if (out.filter(g => g.short === f.short).length === 1) f.name = f.short;
  return out;
}

/* Python */
function pBlock(n, cx) { return seq(named(n).map(c => pStmt(c, cx))); }
function pStmt(n, cx) {
  switch (n.type) {
    case 'block': case 'module': return pBlock(n, cx);
    case 'expression_statement': {
      const k = named(n);
      if (k.length === 1 && (k[0].type === 'string' || k[0].type === 'concatenated_string')) return null;   // a docstring
      const s = stmt(n.text, n); s.kind = classify(s.text, 'python', cx.fns); return s;
    }
    case 'decorated_definition': { const d = field(n, 'definition'); return d ? pStmt(d, cx) : null; }
    case 'function_definition': {
      if (cx.top) return null;   // module-level functions get their own chart
      const nm = field(n, 'name'), p = field(n, 'parameters');
      return { t: 'stmt', kind: 'proc', text: `define ${nm ? nm.text : '?'}${clean(p ? p.text : '()')}`, line: L1(n), endLine: L1(n) };
    }
    case 'class_definition': { if (cx.top) return null; const nm = field(n, 'name'); return { t: 'stmt', kind: 'proc', text: 'define class ' + (nm ? nm.text : '?'), line: L1(n), endLine: L1(n) }; }
    case 'if_statement': {
      const alts = n.childrenForFieldName('alternative').filter(Boolean);
      const build = (cond, condNode, line, cons, i) => {
        const a = alts[i];
        let els = null;
        if (a && a.type === 'elif_clause') els = seq([build(field(a, 'condition'), field(a, 'condition'), L1(a), field(a, 'consequence'), i + 1)]);
        else if (a && a.type === 'else_clause') els = pBlock(field(a, 'body'), cx);
        return { t: 'if', cond: unparen(cond ? cond.text : ''), line, endLine: condNode ? L2(condNode) : line, then: pBlock(cons, cx), else: els };
      };
      return build(field(n, 'condition'), field(n, 'condition'), L1(n), field(n, 'consequence'), 0);
    }
    case 'while_statement': {
      const c = field(n, 'condition'), alt = field(n, 'alternative');
      return { t: 'loop', kind: 'while', cond: clean(c ? c.text : ''), line: L1(n), endLine: c ? L2(c) : L1(n), body: pBlock(field(n, 'body'), cx), else: alt ? pBlock(field(alt, 'body'), cx) : null };
    }
    case 'for_statement': {
      const l = field(n, 'left'), r = field(n, 'right'), alt = field(n, 'alternative');
      return { t: 'loop', kind: 'each', cond: `next ${clean(l ? l.text : '?')} in ${clean(r ? r.text : '?')}`, line: L1(n), endLine: L1(n), body: pBlock(field(n, 'body'), cx), else: alt ? pBlock(field(alt, 'body'), cx) : null };
    }
    case 'try_statement': {
      const handlers = named(n).filter(c => c.type === 'except_clause' || c.type === 'except_group_clause').map(c => {
        const head = clean(c.text.slice(0, c.text.indexOf(':') < 0 ? c.text.length : c.text.indexOf(':')));
        const blk = named(c).find(k => k.type === 'block');
        return { label: head, line: L1(c), body: blk ? pBlock(blk, cx) : seq([]) };
      });
      const els = named(n).find(c => c.type === 'else_clause'), fin = named(n).find(c => c.type === 'finally_clause');
      return tryIR(n, pBlock(field(n, 'body'), cx), handlers, els ? pBlock(field(els, 'body'), cx) : null, fin ? pBlock(named(fin).find(k => k.type === 'block'), cx) : null);
    }
    case 'with_statement': {
      const wc = named(n).find(c => c.type === 'with_clause');
      return { t: 'group', label: 'with ' + clean(wc ? wc.text : ''), line: L1(n), endLine: L1(n), body: pBlock(field(n, 'body'), cx) };
    }
    case 'match_statement': {
      const subj = n.childrenForFieldName('subject').filter(Boolean).map(s => s.text).join(', ');
      const body = field(n, 'body');
      const cases = named(body).filter(c => c.type === 'case_clause').map(c => {
        const pats = named(c).filter(k => k.type === 'case_pattern').map(k => clean(k.text)).join(', ');
        const g = field(c, 'guard');
        return { label: 'case ' + pats + (g ? ' ' + clean(g.text) : ''), line: L1(c), body: pBlock(field(c, 'consequence'), cx) };
      });
      return multiCases({ t: 'multi', kind: 'match', head: 'match ' + clean(subj), line: L1(n), endLine: L1(n) }, cases, false);
    }
    case 'return_statement': return { t: 'jump', kind: 'return', text: clean(n.text), line: L1(n), endLine: L2(n) };
    case 'break_statement': return { t: 'jump', kind: 'break', text: 'break', line: L1(n), endLine: L2(n) };
    case 'continue_statement': return { t: 'jump', kind: 'continue', text: 'continue', line: L1(n), endLine: L2(n) };
    case 'raise_statement': return { t: 'jump', kind: 'throw', text: clean(n.text), line: L1(n), endLine: L2(n) };
    default: { const s = stmt(n.text, n); s.kind = classify(s.text, 'python', cx.fns); return s; }
  }
}
function pFunctions(root) {
  const out = [];
  (function walk(n, cls) {
    for (let c of named(n)) {
      if (c.type === 'decorated_definition') c = field(c, 'definition') || c;
      if (c.type === 'function_definition') {
        const nm = field(c, 'name'), p = field(c, 'parameters');
        out.push({ name: (cls ? cls + '.' : '') + (nm ? nm.text : '?'), params: clean(p ? p.text : '()'), node: c, body: field(c, 'body') });
      } else if (c.type === 'class_definition') { const nm = field(c, 'name'), b = field(c, 'body'); if (b) walk(b, nm ? nm.text : cls); }
    }
  })(root, '');
  return out;
}

// switch / match: case labels with an empty body that fall into the next case are merged ("case 1, case 2");
// a trailing break ends the case (it does not leave a loop)
function multiCases(m, cases, fallthrough) {
  const out = [];
  let pendingLabels = [];
  for (const c of cases) {
    const items = c.body.items;
    if (fallthrough && !items.length) { pendingLabels.push(c.label); continue; }
    let fall = false;
    const last = items[items.length - 1];
    if (last && last.t === 'jump' && last.kind === 'break' && last.text === 'break') items.pop();
    else if (fallthrough && !(last && last.t === 'jump')) fall = true;
    out.push({ label: [...pendingLabels, c.label].join(', '), line: c.line, body: c.body, fall: fall && c !== cases[cases.length - 1] });
    pendingLabels = [];
  }
  if (pendingLabels.length) out.push({ label: pendingLabels.join(', '), line: m.line, body: seq([]), fall: false });
  if (!out.some(c => /^(default|case _)\b/.test(c.label) || /\bdefault\b/.test(c.label))) out.push({ label: 'no match', line: m.line, body: seq([]), fall: false, implicit: true });
  m.cases = out;
  return m;
}
function tryIR(n, body, handlers, elseBody, finBody) {
  const cases = [{ label: 'No', line: L1(n), body: elseBody || seq([]) }, ...handlers.map(h => ({ ...h, label: h.label }))];
  return seq([
    { t: 'group', label: 'try', line: L1(n), endLine: L1(n), body },
    handlers.length ? { t: 'multi', kind: 'try', head: 'error raised?', line: L1(n), endLine: L1(n), cases } : (elseBody && elseBody.items.length ? elseBody : null),
    finBody ? { t: 'group', label: 'finally', line: finBody.items[0] ? finBody.items[0].line : L1(n), endLine: L1(n), body: finBody } : null
  ]);
}

export function buildCharts(root, lang) {
  const fns = lang === 'python' ? pFunctions(root) : lang === 'java' ? jFunctions(root) : cFunctions(root, lang);
  const names = [...new Set(fns.map(f => (f.short || f.name).split(/::|\./).pop()))].filter(s => /^\w+$/.test(s));
  const charts = [];
  if (lang === 'python') {
    const ir = pStmt(root, { fns: names, top: true });
    if (ir && ir.items.length) charts.push({ name: 'program', title: 'Main program', params: '', line: 1, endLine: L2(root), ir, top: true });
  }
  for (const f of fns) {
    const st = lang === 'python' ? pBlock : lang === 'java' ? jStmt : cStmt;
    const ir = f.body ? seq([st(f.body, { lang, fns: names, top: false })]) : seq([]);
    charts.push({ name: f.name, title: f.name + f.params, params: f.params, line: L1(f.node), endLine: L2(f.node), ir });
  }
  return { charts, hasError: root.hasError };
}

/* ---------------------------------------------------------------- layout ---------------------------------------------------------------- */
const CW = 7.25, LH = 15, GAP = 24, HG = 26;
function wrap(text, max, maxLines = 3) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (let w of words) {
    while (w.length > max) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, max)); w = w.slice(max); }
    if (!cur) cur = w; else if ((cur + ' ' + w).length <= max) cur += ' ' + w; else { lines.push(cur); cur = w; }
  }
  if (cur || !lines.length) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].slice(0, max - 1) + '…'; }
  return lines;
}
// a single shape
function shapeBlock(shape, text, ir, extra = {}) {
  const lines = wrap(text, shape === 'dec' ? 24 : 30, shape === 'dec' ? 3 : 4);
  const tw = Math.max(...lines.map(l => l.length)) * CW, th = lines.length * LH;
  let w, h;
  if (shape === 'dec') { w = Math.max(110, tw * 1.35 + 44); h = Math.max(54, th * 1.45 + 30); }
  else if (shape === 'term') { w = Math.max(90, tw + 40); h = th + 18; }
  else if (shape === 'in' || shape === 'out') { w = Math.max(90, tw + 46); h = th + 18; }
  else if (shape === 'call') { w = Math.max(90, tw + 40); h = th + 18; }
  else if (shape === 'conn') { w = 24; h = 24; }
  else { w = Math.max(80, tw + 26); h = th + 18; }
  return {
    L: w / 2, R: w / 2, h, w, ft: shape !== 'term' || !!extra.ft, shape, lines,
    draw(cx, y, out) {
      const node = { id: out.nodes.length, shape, x: cx - w / 2, y, w, h, lines, text, line: ir ? ir.line : 0, endLine: ir ? (ir.endLine || ir.line) : 0, ...extra };
      out.nodes.push(node);
      return node;
    }
  };
}
const arrow = (out, pts, opt = {}) => out.edges.push({ pts, arrow: opt.arrow !== false, label: opt.label, at: opt.at, cls: opt.cls });
const topIn = (b, y) => y + (b.inPad || 0);

function layoutSeq(blocks) {
  const L = Math.max(0, ...blocks.map(b => b.L)), R = Math.max(0, ...blocks.map(b => b.R));
  const h = blocks.reduce((s, b) => s + b.h, 0) + GAP * Math.max(0, blocks.length - 1);
  return {
    L, R, h, ft: blocks.length ? blocks[blocks.length - 1].ft : true, inPad: blocks.length ? blocks[0].inPad || 0 : 0, empty: !blocks.length,
    draw(cx, y, out, ctx) {
      let yy = y;
      blocks.forEach((b, i) => {
        if (i > 0) { if (blocks[i - 1].ft) arrow(out, [[cx, yy - GAP], [cx, topIn(b, yy)]]); }
        b.draw(cx, yy, out, ctx);
        yy += b.h + GAP;
      });
    }
  };
}

function lay(ir, ctx) {
  switch (ir.t) {
    case 'seq': return layoutSeq(ir.items.map(i => lay(i, ctx)));
    case 'stmt': return shapeBlock(ir.kind === 'in' || ir.kind === 'out' ? ir.kind : ir.kind === 'call' ? 'call' : 'proc', ir.text, ir, { kind: ir.kind });
    case 'jump': {
      if (ir.kind === 'return' || ir.kind === 'throw') return shapeBlock('term', ir.text, ir, { kind: ir.kind, end: true });
      // break / continue: a small box with a lettered connector; the same letter marks where it goes
      const tgt = ctx.loops[ctx.loops.length - 1];
      const b = shapeBlock('jump', ir.text, ir, { kind: ir.kind });
      if (!tgt) return Object.assign(b, { ft: true });
      const letterRef = ir.kind === 'break' ? tgt.brk : tgt.cont;
      return {
        L: b.L, R: b.R + 40, h: b.h, ft: false,
        draw(cx, y, out) {
          const n = b.draw(cx, y, out);
          if (!letterRef.letter) letterRef.letter = ctx.nextLetter();
          const c = { id: out.nodes.length, shape: 'conn', x: cx + b.w / 2 + 16, y: y + b.h / 2 - 12, w: 24, h: 24, lines: [letterRef.letter], text: (ir.kind === 'break' ? 'leaves the loop: continues at ' : 'next round of the loop: continues at ') + letterRef.letter, line: ir.line, endLine: ir.line, conn: letterRef.letter };
          out.nodes.push(c);
          arrow(out, [[cx + b.w / 2, y + b.h / 2], [c.x, y + b.h / 2]]);
          n.connTo = letterRef.letter;
        }
      };
    }
    case 'group': {
      const inner = lay(ir.body, ctx);
      const label = shapeBlock('glabel', ir.label, ir);
      const pad = 14, lh = 24;
      const L = Math.max(inner.L, 60) + pad, R = Math.max(inner.R, label.w - Math.max(inner.L, 60) + 20) + pad;
      return {
        L, R, h: lh + inner.h + pad + (inner.empty ? 8 : 0), ft: inner.ft || inner.empty, inPad: 0,
        draw(cx, y, out, c2) {
          out.groups.push({ x: cx - L, y, w: L + R, h: lh + inner.h + pad + (inner.empty ? 8 : 0), label: wrap(ir.label, 40, 1)[0], line: ir.line, endLine: ir.endLine || ir.line, full: ir.label });
          if (!inner.empty) { arrow(out, [[cx, y], [cx, topIn(inner, y + lh)]]); inner.draw(cx, y + lh, out, c2); }
          const bottom = y + lh + inner.h + pad + (inner.empty ? 8 : 0);
          if (inner.ft || inner.empty) arrow(out, [[cx, inner.empty ? y : y + lh + inner.h], [cx, bottom]], { arrow: false });
        }
      };
    }
    case 'if': {
      const D = shapeBlock('dec', ir.cond + ' ?', ir, { kind: 'if' });
      const T = lay(ir.then, ctx), E = ir.else ? lay(ir.else, ctx) : null;
      if (!E || E.empty) {
        // no else: Yes goes straight down through the body, No goes round on the right
        const lane = Math.max(D.w / 2, T.R) + HG;
        const yB = D.h + GAP, yJ = yB + T.h + (T.empty ? 0 : GAP);
        return {
          L: Math.max(D.L, T.L), R: lane + 8, h: yJ, ft: true,
          draw(cx, y, out, c2) {
            D.draw(cx, y, out);
            if (!T.empty) {
              arrow(out, [[cx, y + D.h], [cx, topIn(T, y + yB)]], { label: 'Yes', at: [cx + 6, y + D.h + 13] });
              T.draw(cx, y + yB, out, c2);
              if (T.ft) arrow(out, [[cx, y + yB + T.h], [cx, y + yJ]], { arrow: false });
            } else arrow(out, [[cx, y + D.h], [cx, y + yJ]], { arrow: false, label: 'Yes', at: [cx + 6, y + D.h + 13] });
            arrow(out, [[cx + D.w / 2, y + D.h / 2], [cx + lane, y + D.h / 2], [cx + lane, y + yJ], [cx, y + yJ]], { arrow: false, label: 'No', at: [cx + D.w / 2 + 6, y + D.h / 2 - 6] });
            if (T.ft || T.empty) out.dots.push([cx, y + yJ]);
          }
        };
      }
      const offT = Math.max(D.w / 2, T.R + HG / 2), offE = Math.max(D.w / 2, E.L + HG / 2);
      const yB = D.h + 18, body = Math.max(T.h, E.h), yJ = yB + body + GAP;
      const ft = T.ft || E.ft;
      return {
        L: Math.max(D.L, offT + T.L), R: Math.max(D.R, offE + E.R), h: ft ? yJ : yB + body, ft,
        draw(cx, y, out, c2) {
          D.draw(cx, y, out);
          const xT = cx - offT, xE = cx + offE, my = y + D.h / 2;
          for (const [B, x, lab, corner] of [[T, xT, 'Yes', cx - D.w / 2], [E, xE, 'No', cx + D.w / 2]]) {
            const at = [lab === 'Yes' ? corner - 26 : corner + 6, my - 6];
            if (B.empty) { arrow(out, [[corner, my], [x, my], [x, y + yJ], [cx, y + yJ]], { arrow: false, label: lab, at }); continue; }
            arrow(out, [[corner, my], [x, my], [x, topIn(B, y + yB)]], { label: lab, at });
            B.draw(x, y + yB, out, c2);
            if (B.ft) arrow(out, [[x, y + yB + B.h], [x, y + yJ], [cx, y + yJ]], { arrow: false });
          }
          if ((T.ft || T.empty) && (E.ft || E.empty)) out.dots.push([cx, y + yJ]);
        }
      };
    }
    case 'loop': {
      const info = { brk: { used: false }, cont: { used: false } };
      // find out first whether the body uses break / continue (they need a connector)
      (function scan(n, depth) {
        if (!n) return;
        if (n.t === 'jump' && depth === 0) { if (n.kind === 'break') info.brk.used = true; if (n.kind === 'continue') info.cont.used = true; }
        if (n.t === 'seq') n.items.forEach(i => scan(i, depth));
        if (n.t === 'if') { scan(n.then, depth); scan(n.else, depth); }
        if (n.t === 'group') scan(n.body, depth);
        if (n.t === 'multi') n.cases.forEach(c => scan(c.body, n.kind === 'switch' ? depth + 1 : depth));   // break in a switch leaves the switch
        if (n.t === 'loop') { scan(n.body, depth + 1); scan(n.else, depth); }
      })(ir.body, 0);
      ctx.loops.push(info);
      const bodyIR = seq([...ir.body.items]);
      const body = lay(bodyIR, ctx);
      ctx.loops.pop();
      const cont = info.cont.used ? shapeBlock('conn', '', null) : null;
      const upd = ir.update ? lay(ir.update, ctx) : null;
      const tail = layoutSeq([body, ...(cont ? [{ ...cont, draw: (cx, y, out) => { const n = cont.draw(cx, y, out); n.lines = [info.cont.letter || '?']; n.conn = info.cont.letter; n.text = 'continue goes here'; n.line = ir.line; n.endLine = ir.line; } }] : []), ...(upd ? [upd] : [])].filter(b => !b.empty));
      const tailFt = tail.empty || tail.ft || !!cont;
      const D = shapeBlock('dec', (INFINITE.has(ir.cond) ? 'repeat forever' : ir.cond) + (INFINITE.has(ir.cond) ? '' : ' ?'), ir, { kind: 'loop' });
      const forever = INFINITE.has(ir.cond);
      const els = ir.else && ir.else.items.length ? lay(ir.else, ctx) : null;
      const brk = info.brk.used ? shapeBlock('conn', '', null) : null;
      const laneL = Math.max(D.w / 2, tail.L) + HG, laneR = Math.max(D.w / 2, tail.R, els ? els.R : 0) + HG;
      const init = ir.init ? lay(ir.init, ctx) : null;
      let core;
      if (ir.kind === 'do') {
        // body first, then the test; Yes goes back up on the left
        const yD = 16 + tail.h + (tail.empty ? 0 : GAP), yX = yD + D.h + GAP;
        core = {
          L: laneL + 8, R: Math.max(D.R, tail.R) + 8, h: yX, ft: true, inPad: 16,
          draw(cx, y, out, c2) {
            const yt = y + 16;
            if (!tail.empty) { tail.draw(cx, yt, out, c2); if (tailFt) arrow(out, [[cx, yt + tail.h], [cx, y + yD]]); }
            else arrow(out, [[cx, y + 8], [cx, y + yD]]);
            D.draw(cx, y + yD, out);
            arrow(out, [[cx - D.w / 2, y + yD + D.h / 2], [cx - laneL, y + yD + D.h / 2], [cx - laneL, y + 8], [cx, y + 8]], { label: 'Yes', at: [cx - D.w / 2 - 28, y + yD + D.h / 2 - 6] });
            arrow(out, [[cx, y + 8], [cx, topIn(tail, yt)]], { arrow: !tail.empty });
            arrow(out, [[cx, y + yD + D.h], [cx, y + yX]], { arrow: false, label: 'No', at: [cx + 6, y + yD + D.h + 13] });
          }
        };
      } else {
        const yD = 18, yBody = yD + D.h + GAP, yBack = yBody + tail.h + (tail.empty ? 0 : 14), yX = yBack + 22;
        core = {
          L: laneL + 8, R: forever ? Math.max(D.R, tail.R) + 8 : laneR + 8, h: forever && !info.brk.used ? yBack : yX, ft: !forever || info.brk.used, inPad: yD,
          draw(cx, y, out, c2) {
            D.draw(cx, y + yD, out);
            if (!tail.empty) {
              arrow(out, [[cx, y + yD + D.h], [cx, topIn(tail, y + yBody)]], { label: forever ? '' : 'Yes', at: [cx + 6, y + yD + D.h + 13] });
              tail.draw(cx, y + yBody, out, c2);
            }
            if (tailFt) arrow(out, [[cx, tail.empty ? y + yD + D.h : y + yBody + tail.h], [cx, y + yBack], [cx - laneL, y + yBack], [cx - laneL, y + 9], [cx, y + 9]], { label: tail.empty && !forever ? 'Yes' : '', at: [cx + 6, y + yD + D.h + 13] });
            if (!forever) arrow(out, [[cx + D.w / 2, y + yD + D.h / 2], [cx + laneR, y + yD + D.h / 2], [cx + laneR, y + yX], [cx, y + yX]], { arrow: false, label: 'No', at: [cx + D.w / 2 + 6, y + yD + D.h / 2 - 6] });
          }
        };
      }
      const after = [];
      if (els) after.push(els);
      if (brk) after.push({ ...brk, draw: (cx, y, out) => { const n = brk.draw(cx, y, out); n.lines = [info.brk.letter || '?']; n.conn = info.brk.letter; n.text = 'break goes here'; n.line = ir.line; n.endLine = ir.line; } });
      return layoutSeq([init, core, ...after].filter(Boolean));
    }
    case 'multi': {
      const D = shapeBlock('dec', ir.head, ir, { kind: ir.kind });
      const cols = ir.cases.map(c => {
        const inner = c.body.items.length ? lay(c.body, ctx) : null;
        const lw = Math.min(32, c.label.length) * 6.6 + 10;
        const L = Math.max(inner ? inner.L : 0, lw / 2, 20), R = Math.max(inner ? inner.R : 0, lw / 2, 20);
        return { c, inner, L, R, h: inner ? inner.h : 0, ft: c.fall ? false : inner ? inner.ft : true };
      });
      const W = cols.reduce((s, k) => s + k.L + k.R, 0) + HG * (cols.length - 1);
      let x = -W / 2;
      for (const k of cols) { k.x = x + k.L; x += k.L + k.R + HG; }
      const yBus = D.h + 14, yTop = yBus + 30, body = Math.max(...cols.map(k => k.h)), yJ = yTop + body + GAP;
      const ft = cols.some(k => k.ft);
      return {
        L: Math.max(D.L, W / 2), R: Math.max(D.R, W / 2), h: ft ? yJ : yTop + body, ft,
        draw(cx, y, out, c2) {
          D.draw(cx, y, out);
          const xs = cols.map(k => cx + k.x);
          arrow(out, [[cx, y + D.h], [cx, y + yBus]], { arrow: false });
          arrow(out, [[Math.min(...xs, cx), y + yBus], [Math.max(...xs, cx), y + yBus]], { arrow: false });
          const fts = [];
          cols.forEach((k, i) => {
            const xx = xs[i];
            out.labels.push({ x: xx + 5, y: y + yBus + 17, text: wrap(k.c.label, 32, 1)[0], full: k.c.label, line: k.c.line });
            if (k.inner) {
              arrow(out, [[xx, y + yBus], [xx, topIn(k.inner, y + yTop)]]);
              k.inner.draw(xx, y + yTop, out, c2);
              if (k.c.fall && k.inner.ft) {
                out.labels.push({ x: xx + 5, y: y + yTop + k.inner.h + 14, text: 'falls into next case ↴', full: 'No break: the program continues with the next case', cls: 'fall', line: k.c.line });
              } else if (k.inner.ft) { arrow(out, [[xx, y + yTop + k.inner.h], [xx, y + yJ]], { arrow: false }); fts.push(xx); }
            } else { arrow(out, [[xx, y + yBus], [xx, y + yJ]], { arrow: false }); fts.push(xx); }
          });
          if (fts.length) { arrow(out, [[Math.min(...fts, cx), y + yJ], [Math.max(...fts, cx), y + yJ]], { arrow: false }); out.dots.push([cx, y + yJ]); }
        }
      };
    }
  }
  throw new Error('unknown IR ' + ir.t);
}

export function layoutChart(chart) {
  let letters = 0;
  const ctx = { loops: [], nextLetter: () => String.fromCharCode(65 + (letters++ % 26)) + (letters > 26 ? Math.ceil(letters / 26) : '') };
  const start = shapeBlock('term', chart.top ? 'Start' : 'Start: ' + chart.title, { line: chart.line, endLine: chart.line }, { kind: 'start', ft: true });
  const body = lay(chart.ir, ctx);
  const blocks = [start, body];
  if (body.ft) blocks.push(shapeBlock('term', 'End', { line: chart.endLine, endLine: chart.endLine }, { kind: 'end' }));
  const all = layoutSeq(blocks.filter(b => !b.empty));
  const M = 22;
  const out = { nodes: [], edges: [], dots: [], labels: [], groups: [] };
  const cx = M + all.L;
  all.draw(cx, M, out, ctx);
  // a break/continue connector box may be drawn before its target got a letter (or vice versa): fill in
  return { w: Math.ceil(all.L + all.R + 2 * M), h: Math.ceil(all.h + 2 * M), ...out };
}

/* ---------------------------------------------------------------- SVG ---------------------------------------------------------------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function shapePath(n) {
  const { x, y, w, h } = n;
  switch (n.shape) {
    case 'term': return `<rect class="s" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(h / 2, 18)}"/>`;
    case 'dec': return `<polygon class="s" points="${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}"/>`;
    case 'in': case 'out': return `<polygon class="s" points="${x + 12},${y} ${x + w},${y} ${x + w - 12},${y + h} ${x},${y + h}"/>`;
    case 'call': return `<rect class="s" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><path class="s2" d="M${x + 8} ${y}V${y + h}M${x + w - 8} ${y}V${y + h}"/>`;
    case 'conn': return `<circle class="s" cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2}"/>`;
    case 'jump': return `<rect class="s" x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}"/>`;
    default: return `<rect class="s" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>`;
  }
}
export function renderSVG(lay) {
  const parts = [`<svg xmlns="http://www.w3.org/2000/svg" class="fc" viewBox="0 0 ${lay.w} ${lay.h}" width="${lay.w}" height="${lay.h}" role="img" aria-label="Flowchart">`,
    '<defs><marker id="fcArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="ah"/></marker></defs>'];
  for (const g of lay.groups) parts.push(`<g class="fc-g" data-line="${g.line}" data-end="${g.endLine}"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="8"/><text x="${g.x + 10}" y="${g.y + 16}">${esc(g.label)}</text><title>${esc(g.full)}</title></g>`);
  for (const e of lay.edges) {
    const d = e.pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    parts.push(`<path class="fc-e${e.cls ? ' ' + e.cls : ''}" d="${d}"${e.arrow ? ' marker-end="url(#fcArrow)"' : ''}/>`);
    if (e.label) parts.push(`<text class="fc-el" x="${e.at[0]}" y="${e.at[1]}">${esc(e.label)}</text>`);
  }
  for (const [x, y] of lay.dots) parts.push(`<circle class="fc-dot" cx="${x}" cy="${y}" r="3"/>`);
  for (const l of lay.labels) parts.push(`<text class="fc-cl${l.cls ? ' ' + l.cls : ''}" x="${l.x}" y="${l.y}">${esc(l.text)}<title>${esc(l.full)}</title></text>`);
  for (const n of lay.nodes) {
    const cls = `fc-n fc-${n.shape}${n.kind ? ' k-' + n.kind : ''}`;
    const cy = n.y + n.h / 2 - (n.lines.length - 1) * LH / 2 + 4.5;
    const text = n.lines.map((l, i) => `<tspan x="${n.x + n.w / 2}" y="${cy + i * LH}">${esc(l)}</tspan>`).join('');
    parts.push(`<g class="${cls}" data-id="${n.id}" data-line="${n.line}" data-end="${n.endLine}"${n.conn ? ` data-conn="${esc(n.conn)}"` : ''}${n.connTo ? ` data-conn-to="${esc(n.connTo)}"` : ''}>${shapePath(n)}<text>${text}</text><title>${esc(n.text)}${n.line ? ' (line ' + n.line + ')' : ''}</title></g>`);
  }
  parts.push('</svg>');
  return parts.join('');
}
