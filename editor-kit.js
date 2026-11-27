// Editor settings and tools shared by every page with a code editor (CodeMirror 5):
//  - text: font (bundled, installed or any other), size (Ctrl + wheel, Ctrl + = / - / 0), line spacing, ligatures
//  - editing: tab width, tabs or spaces, word wrap, line numbers, current line, brackets, folding, matching words
//  - commands: toggle comment (Ctrl + /), move and copy lines (Alt + arrows), find and replace, go to line, rename (F2)
//  - formatting (Shift + Alt + F): Artistic Style (AStyle, WebAssembly build "wastyle") for C, C++ and Java,
//    Ruff for Python, and a built-in indenter for Verilog
//  - naming tips: names that do not follow the chosen style (camelCase, snake_case, PascalCase, UPPER_CASE) are
//    underlined, with a one-click rename of every use (needs a tree-sitter parser from the page)
// Settings live in localStorage ('ccp.editor') and apply to every attached editor at once.
(function () {
  'use strict';
  const KEY = 'ccp.editor';
  const ASTYLE = 'https://cdn.jsdelivr.net/npm/wastyle@0.0.5/dist/astyle.wasm';
  const RUFF = 'https://cdn.jsdelivr.net/npm/@wasm-fmt/ruff_fmt@0.15.20/ruff_fmt_web.js';
  const FONT_CSS = 'https://fonts.googleapis.com/css2?family=';
  const WEB_FONTS = ['JetBrains Mono', 'Fira Code', 'Source Code Pro', 'IBM Plex Mono', 'Roboto Mono', 'Inconsolata', 'Ubuntu Mono'];
  const SYSTEM_FONTS = ['Cascadia Code', 'Cascadia Mono', 'Consolas', 'Courier New', 'Lucida Console', 'Menlo', 'Monaco', 'SF Mono', 'DejaVu Sans Mono', 'Liberation Mono', 'Noto Sans Mono', 'Ubuntu Mono'];
  const NAMING_DEFAULT = {
    c: { var: 'camel', fn: 'camel', type: 'pascal', const: 'upper' },
    cpp: { var: 'camel', fn: 'camel', type: 'pascal', const: 'upper' },
    java: { var: 'camel', fn: 'camel', type: 'pascal', const: 'upper' },
    python: { var: 'snake', fn: 'snake', type: 'pascal', const: 'upper' }
  };
  const DEF = {
    font: 'JetBrains Mono', size: 14, lh: 1.55, liga: true,
    tab: 4, tabs: false, wrap: false, lines: true, active: true, brackets: true, fold: true, occ: true,
    style: 'allman', aopts: ['pad-oper', 'pad-header', 'pad-comma', 'indent-switches'], aextra: '',
    pyWidth: 88, pyQuote: 'double',
    naming: true, conv: NAMING_DEFAULT, ignore: []
  };
  const STYLES = [
    ['allman', 'Allman (ANSI): braces on their own lines'],
    ['java', 'Java: opening brace at the end of the line'],
    ['kr', 'K&R: functions on their own line, the rest attached'],
    ['stroustrup', 'Stroustrup: like K&R, else on a new line'],
    ['1tbs', 'One True Brace: K&R, braces always added'],
    ['google', 'Google: attached, class access labels half-indented'],
    ['linux', 'Linux kernel: K&R with 8-wide indents'],
    ['gnu', 'GNU: braces on their own lines, indented'],
    ['whitesmith', 'Whitesmiths: braces indented with the code'],
    ['ratliff', 'Ratliff (banner): closing brace indented'],
    ['horstmann', 'Horstmann: run-in braces'],
    ['pico', 'Pico: run-in braces, closing brace attached'],
    ['lisp', 'Lisp: closing braces attached to the last line'],
    ['mozilla', 'Mozilla'], ['webkit', 'WebKit'], ['vtk', 'VTK']
  ];
  const AOPTS = [
    ['pad-oper', 'Spaces around operators', 'a=b+c  →  a = b + c'],
    ['pad-header', 'Space after if, for, while', 'if(x)  →  if (x)'],
    ['pad-comma', 'Space after commas', 'f(a,b)  →  f(a, b)'],
    ['unpad-paren', 'Remove spaces inside ( )', 'f( a )  →  f(a)'],
    ['add-braces', 'Add braces to one-line if / for / while', 'if (x) y++;  →  if (x) { y++; }'],
    ['break-blocks', 'Blank line around if / for / while blocks', ''],
    ['indent-switches', 'Indent case labels inside switch', ''],
    ['align-pointer=name', 'Put * and & next to the name', 'int* p  →  int *p'],
    ['delete-empty-lines', 'Delete empty lines inside functions', ''],
    ['break-return-type', 'Return type on its own line (C style)', '']
  ];
  const CONVS = [['camel', 'camelCase'], ['pascal', 'PascalCase'], ['snake', 'snake_case'], ['upper', 'UPPER_CASE'], ['any', 'any style']];
  const KINDS = [['var', 'Variables'], ['fn', 'Functions and methods'], ['type', 'Classes, structs, types'], ['const', 'Constants']];
  const LANG_NAMES = { c: 'C', cpp: 'C++', java: 'Java', python: 'Python' };

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let S = load();
  function load() {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
    const out = Object.assign({}, DEF, s);
    out.conv = {};
    for (const l of Object.keys(NAMING_DEFAULT)) out.conv[l] = Object.assign({}, NAMING_DEFAULT[l], (s.conv || {})[l]);
    if (!Array.isArray(out.aopts)) out.aopts = DEF.aopts.slice();
    if (!Array.isArray(out.ignore)) out.ignore = [];
    out.size = Math.min(40, Math.max(8, +out.size || 14));
    return out;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} }
  window.addEventListener('storage', e => { if (e.key === KEY) { S = load(); applyAll(); } });   // another tab changed them

  /* ---------------- styles ---------------- */
  const css = document.createElement('style');
  css.textContent = `
.CodeMirror-activeline-background{background:color-mix(in oklab,var(--accent) 7%,transparent)}
.cm-matchhighlight{background:color-mix(in oklab,var(--accent) 16%,transparent); border-radius:2px}
.CodeMirror-foldgutter{width:.9em}
.CodeMirror-foldgutter-open,.CodeMirror-foldgutter-folded{color:var(--muted); cursor:pointer}
.CodeMirror-foldgutter-open:after{content:"\\25BE"} .CodeMirror-foldgutter-folded:after{content:"\\25B8"}
.CodeMirror-foldmarker{color:var(--accent-ink); background:var(--accent); border-radius:4px; padding:0 5px; font-family:inherit; text-shadow:none; cursor:pointer}
.CodeMirror-dialog{background:var(--surface); color:var(--ink); border-color:var(--line)!important; font:13px "Atkinson Hyperlegible",system-ui,sans-serif; padding:6px 10px; z-index:15}
.CodeMirror-dialog input{font:13px "JetBrains Mono",monospace; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:5px; padding:3px 6px; width:16em}
.CodeMirror-dialog button{font:700 12px "Atkinson Hyperlegible",sans-serif; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:5px; padding:2px 8px; cursor:pointer}
.CodeMirror-dialog .CodeMirror-search-hint{color:var(--muted)}
.cm-searching{background:color-mix(in oklab,var(--warn) 30%,transparent)}
.cm-nametip{text-decoration:underline wavy color-mix(in oklab,var(--accent) 75%,transparent); text-decoration-skip-ink:none; text-underline-offset:3px}
.ek-bubble{z-index:20; background:var(--surface); color:var(--ink); border:1px solid var(--line); border-radius:8px; box-shadow:0 6px 18px rgba(0,0,0,.18); padding:6px 8px; font:13px/1.35 "Atkinson Hyperlegible",system-ui,sans-serif; display:flex; gap:8px; align-items:center; max-width:min(620px,90vw); margin-top:4px}
.ek-bubble code{font:12.5px "JetBrains Mono",monospace; color:var(--accent); font-weight:700; white-space:nowrap}
.ek-bubble>span{white-space:nowrap}
.ek-bubble button{font:700 12px "Atkinson Hyperlegible",sans-serif; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:6px; padding:2px 8px; cursor:pointer; white-space:nowrap}
.ek-bubble button.p{background:var(--accent); border-color:var(--accent); color:var(--accent-ink)}
.ek-bubble .m{color:var(--muted); font-size:12px}
.ek-chip{font:700 .72rem "JetBrains Mono",monospace; text-transform:none; letter-spacing:0; border:1px solid var(--line); background:var(--surface); color:var(--accent); border-radius:999px; padding:1px 8px; cursor:pointer}
.ek-chip[hidden]{display:none}
.ek-toast{position:fixed; left:50%; bottom:20px; transform:translateX(-50%); background:var(--ink); color:var(--bg); padding:9px 16px; border-radius:9px; font:.9rem "Atkinson Hyperlegible",system-ui,sans-serif; z-index:90; max-width:min(560px,90vw); box-shadow:0 8px 24px rgba(0,0,0,.25); white-space:pre-wrap}
dialog.ek-dlg{border:1px solid var(--line); border-radius:12px; background:var(--surface); color:var(--ink); padding:0; width:min(720px,calc(100vw - 24px)); max-height:calc(100dvh - 32px); box-shadow:0 20px 60px rgba(0,0,0,.3)}
dialog.ek-dlg::backdrop{background:rgba(0,0,0,.25)}
.ek-dlg form{display:flex; flex-direction:column; max-height:calc(100dvh - 34px)}
.ek-dlg .hd{display:flex; align-items:center; gap:10px; padding:12px 16px; border-bottom:1px solid var(--line)}
.ek-dlg .hd b{font:800 1.15rem "Bricolage Grotesque",system-ui,sans-serif; flex:1}
.ek-dlg .tb{display:flex; gap:2px; padding:6px 12px 0; border-bottom:1px solid var(--line); flex-wrap:wrap}
.ek-dlg .tb button{font:700 .85rem "Atkinson Hyperlegible",sans-serif; border:1px solid transparent; border-bottom:0; background:none; color:var(--muted); padding:6px 12px; border-radius:7px 7px 0 0; cursor:pointer}
.ek-dlg .tb button[aria-selected="true"]{color:var(--ink); border-color:var(--line); background:var(--surface); margin-bottom:-1px}
.ek-dlg .bd{overflow:auto; padding:14px 16px; display:flex; flex-direction:column; gap:12px; font-size:.9rem}
.ek-dlg .sec{display:none; flex-direction:column; gap:10px} .ek-dlg .sec.on{display:flex}
.ek-dlg .r{display:grid; grid-template-columns:150px minmax(0,1fr); gap:6px 12px; align-items:center}
.ek-dlg .r>span{color:var(--muted)}
.ek-dlg .chk{display:flex; gap:8px; align-items:flex-start; cursor:pointer}
.ek-dlg .chk small{display:block; color:var(--muted); font:12px "JetBrains Mono",monospace}
.ek-dlg .grid2{display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:8px 16px}
.ek-dlg select,.ek-dlg input[type=text],.ek-dlg input[type=number]{font:13px "JetBrains Mono",monospace; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:6px; padding:5px 7px; max-width:100%}
.ek-dlg input[type=range]{width:100%; accent-color:var(--accent)}
.ek-dlg .inl{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
.ek-dlg .note{color:var(--muted); font-size:.82rem; margin:0}
.ek-dlg .pv{margin:0; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:var(--code-bg,var(--bg)); overflow:auto; max-height:230px; white-space:pre; font-size:13px}
.ek-dlg table.nm{border-collapse:collapse; font-size:.85rem}
.ek-dlg table.nm th,.ek-dlg table.nm td{padding:4px 8px; border-bottom:1px solid var(--line); text-align:left}
.ek-dlg table.nm th{color:var(--muted); font-weight:700}
.ek-dlg .ft{display:flex; gap:8px; justify-content:flex-end; padding:10px 16px; border-top:1px solid var(--line)}
.ek-dlg .btn{font:700 .85rem "Atkinson Hyperlegible",sans-serif; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:7px; padding:5px 11px; cursor:pointer}
.ek-dlg .btn.primary{background:var(--accent); border-color:var(--accent); color:var(--accent-ink)}
.ek-dlg kbd{font:12px "JetBrains Mono",monospace; border:1px solid var(--line); border-bottom-width:2px; border-radius:4px; padding:0 4px; background:var(--bg)}
.ek-dlg .keys{display:grid; grid-template-columns:max-content 1fr; gap:4px 14px; font-size:.85rem}
@media (max-width:560px){ .ek-dlg .r{grid-template-columns:minmax(0,1fr)} }`;
  document.head.appendChild(css);

  /* ---------------- fonts ---------------- */
  const loadedFonts = new Set();
  function ensureFont(name) {
    if (!WEB_FONTS.includes(name) || loadedFonts.has(name) || name === 'JetBrains Mono') return;
    loadedFonts.add(name);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = /^https?:/.test(FONT_CSS) ? FONT_CSS + name.replace(/ /g, '+') + ':wght@400;700&display=swap' : FONT_CSS + name.toLowerCase().replace(/ /g, '-') + '.css';
    l.onload = () => { if (document.fonts) document.fonts.load(`14px "${name}"`).then(() => editors.forEach(e => e.cm.refresh())); };
    document.head.appendChild(l);
  }
  let installedCache = null;
  function installedFonts() {   // the monospace fonts on this computer (width test against two fallbacks)
    if (installedCache) return installedCache;
    const c = document.createElement('canvas').getContext('2d'), txt = 'mmmmmmmmmmlli10OO{}';
    const w = f => { c.font = '40px ' + f; return c.measureText(txt).width; };
    const base = ['monospace', 'serif'].map(w);
    installedCache = SYSTEM_FONTS.filter(f => ['monospace', 'serif'].some((b, i) => w(`"${f}", ${b}`) !== base[i]));
    return installedCache;
  }
  const fontStack = f => `"${String(f).replace(/["\\]/g, '')}", "JetBrains Mono", ui-monospace, Consolas, monospace`;

  /* ---------------- attaching editors ---------------- */
  const editors = [];   // {cm, o}
  function attach(cm, o) {
    prune();
    o = Object.assign({ lang: () => 'cpp', format: true, naming: false, brackets: true, lineNumbers: true }, o || {});
    const e = { cm, o, tips: [], tipMarks: [], bubble: null };
    editors.push(e);
    cm.addKeyMap({
      Tab: c => { if (c.somethingSelected()) c.indentSelection('add'); else c.replaceSelection(S.tabs ? '\t' : ' '.repeat(S.tab)); },
      'Shift-Tab': c => c.indentSelection('subtract'),
      'Ctrl-/': c => c.toggleComment && c.toggleComment({ indent: true }), 'Cmd-/': c => c.toggleComment && c.toggleComment({ indent: true }),
      'Alt-Up': c => moveLines(c, -1), 'Alt-Down': c => moveLines(c, 1),
      'Shift-Alt-Up': c => copyLines(c, -1), 'Shift-Alt-Down': c => copyLines(c, 1),
      'Shift-Alt-F': c => { if (o.format) format(c); }, 'Shift-Ctrl-I': c => { if (o.format) format(c); },
      'Ctrl-G': 'jumpToLine', 'Cmd-L': 'jumpToLine',
      'Ctrl-H': 'replace', 'Cmd-Alt-F': 'replace',
      F2: c => rename(c), 'Ctrl-.': c => fixTipAtCursor(e), 'Cmd-.': c => fixTipAtCursor(e),
      'Ctrl-Q': c => c.foldCode && c.foldCode(c.getCursor())
    }, true);
    // text size keys; in the desktop app the View menu has them (Ctrl + = / - / 0) and calls zoom() itself
    if (!window.desktop) cm.addKeyMap({ 'Ctrl-=': () => zoom(1), 'Ctrl-+': () => zoom(1), 'Ctrl--': () => zoom(-1), 'Ctrl-0': () => zoom(0), 'Cmd-=': () => zoom(1), 'Cmd--': () => zoom(-1), 'Cmd-0': () => zoom(0) }, true);
    cm.getWrapperElement().addEventListener('wheel', ev => {
      if (!ev.ctrlKey && !ev.metaKey) return;
      ev.preventDefault();
      zoom(ev.deltaY < 0 ? 1 : -1);
    }, { passive: false });
    apply(e);
    let modeT = 0;
    cm.on('optionChange', (_, opt) => { if (opt === 'mode') { clearTimeout(modeT); modeT = setTimeout(() => apply(e), 0); } });   // folding differs per language
    if (o.naming) {
      let t = 0;
      cm.on('changes', () => { clearTimeout(t); t = setTimeout(() => checkNames(e), 900); });
      cm.on('swapDoc', () => { clearTimeout(t); t = setTimeout(() => checkNames(e), 200); });
      cm.on('cursorActivity', () => showBubble(e));
      if (o.chip) o.chip.onclick = () => nextTip(e);
      setTimeout(() => checkNames(e), 600);
    }
    return { check: () => checkNames(e), detach: () => { const i = editors.indexOf(e); if (i >= 0) editors.splice(i, 1); } };
  }
  function apply(e) {
    const { cm, o } = e;
    ensureFont(S.font);
    const w = cm.getWrapperElement();
    w.style.fontFamily = fontStack(S.font);
    w.style.fontSize = S.size + 'px';
    w.style.lineHeight = String(S.lh);
    w.style.fontVariantLigatures = S.liga ? 'normal' : 'none';
    const lang = o.lang();
    cm.setOption('tabSize', S.tab);
    cm.setOption('indentUnit', S.tab);
    cm.setOption('indentWithTabs', !!S.tabs);
    if (o.wrap !== false) cm.setOption('lineWrapping', !!S.wrap);
    if (o.lineNumbers) cm.setOption('lineNumbers', !!S.lines);
    if (CodeMirror.defineOption && 'styleActiveLine' in CodeMirror.defaults) cm.setOption('styleActiveLine', !!S.active);
    if (o.brackets && 'autoCloseBrackets' in CodeMirror.defaults) cm.setOption('autoCloseBrackets', !!S.brackets);
    if ('highlightSelectionMatches' in CodeMirror.defaults) cm.setOption('highlightSelectionMatches', S.occ ? { showToken: /\w/, minChars: 2, delay: 120, annotateScrollbar: false } : false);
    if ('foldGutter' in CodeMirror.defaults && o.fold !== false) {
      const finder = CodeMirror.fold && (lang === 'python' || lang === 'verilog' ? CodeMirror.fold.indent : CodeMirror.fold.combine ? CodeMirror.fold.combine(CodeMirror.fold.brace, CodeMirror.fold.comment || (() => {})) : CodeMirror.fold.brace);
      cm.setOption('foldOptions', { rangeFinder: finder, widget: '⋯' });
      cm.setOption('foldGutter', !!S.fold);
      const g = (cm.getOption('gutters') || []).filter(x => x !== 'CodeMirror-foldgutter');
      if (S.fold) g.push('CodeMirror-foldgutter');
      cm.setOption('gutters', g);
    }
    cm.refresh();
  }
  function prune() {   // forget editors that were removed from the page (notebook cells)
    for (let i = editors.length - 1; i >= 0; i--) if (!editors[i].cm.getWrapperElement().isConnected) editors.splice(i, 1);
  }
  function applyAll() { prune(); editors.forEach(apply); editors.forEach(e => { if (e.o.naming) checkNames(e); }); }
  let toastT = 0;
  function toast(msg, ms = 2600) {
    let t = document.querySelector('.ek-toast');
    if (!t) { t = document.createElement('div'); t.className = 'ek-toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, ms);
  }
  function zoom(d) {
    S.size = d === 0 ? DEF.size : Math.min(40, Math.max(8, S.size + d));
    save(); prune(); editors.forEach(apply);
    toast('Editor text size ' + S.size + (d === 0 ? ' (default)' : '') + '   ·   Ctrl + 0 resets', 1300);
    const r = document.getElementById('ek-size'); if (r) { r.value = S.size; const v = document.getElementById('ek-sizev'); if (v) v.textContent = S.size; }
  }

  /* ---------------- line commands ---------------- */
  function lineSpans(c) {   // merged [from, to] line ranges of the selections
    const spans = [];
    for (const r of c.listSelections()) {
      let a = Math.min(r.anchor.line, r.head.line), b = Math.max(r.anchor.line, r.head.line);
      const end = r.anchor.line > r.head.line ? r.anchor : r.head;
      if (b > a && end.ch === 0) b--;
      if (spans.length && a <= spans[spans.length - 1][1] + 1) spans[spans.length - 1][1] = Math.max(spans[spans.length - 1][1], b); else spans.push([a, b]);
    }
    return spans;
  }
  function moveLines(c, dir) {
    const spans = lineSpans(c), last = c.lastLine();
    if (spans.some(([a, b]) => (dir < 0 ? a === 0 : b === last))) return;
    c.operation(() => {
      const sels = c.listSelections();
      for (const [a, b] of dir < 0 ? spans : spans.slice().reverse()) {
        const text = c.getRange({ line: a, ch: 0 }, { line: b, ch: c.getLine(b).length });
        if (dir < 0) {
          const above = c.getLine(a - 1);
          c.replaceRange(text + '\n' + above, { line: a - 1, ch: 0 }, { line: b, ch: c.getLine(b).length }, '+move');
        } else {
          const below = c.getLine(b + 1);
          c.replaceRange(below + '\n' + text, { line: a, ch: 0 }, { line: b + 1, ch: below.length }, '+move');
        }
      }
      c.setSelections(sels.map(s => ({ anchor: { line: s.anchor.line + dir, ch: s.anchor.ch }, head: { line: s.head.line + dir, ch: s.head.ch } })));
    });
  }
  function copyLines(c, dir) {
    const spans = lineSpans(c);
    c.operation(() => {
      for (const [a, b] of spans.slice().reverse()) {
        const text = c.getRange({ line: a, ch: 0 }, { line: b, ch: c.getLine(b).length });
        c.replaceRange(text + '\n', { line: a, ch: 0 }, undefined, '+copy');
      }
      if (dir > 0) {
        const n = spans.reduce((s, [a, b]) => s + b - a + 1, 0);
        c.setSelections(c.listSelections().map(s => ({ anchor: { line: s.anchor.line + n, ch: s.anchor.ch }, head: { line: s.head.line + n, ch: s.head.ch } })));
      }
    });
  }

  /* ---------------- formatting ---------------- */
  let astyle = null;
  function loadAstyle() {
    if (!astyle) astyle = (async () => {
      let inst;
      const mem = () => inst.exports.memory;
      const wasi = {
        environ_sizes_get: (c, s) => { const v = new DataView(mem().buffer); v.setUint32(c, 0, true); v.setUint32(s, 0, true); return 0; },
        environ_get: () => 0, proc_exit: code => { throw new Error('AStyle stopped (' + code + ')'); }
      };
      const r = await fetch(ASTYLE);
      if (!r.ok) throw new Error('could not download AStyle (' + r.status + ')');
      inst = (await WebAssembly.instantiate(await r.arrayBuffer(), { wasi_snapshot_preview1: wasi })).instance;
      inst.exports._initialize();
      const enc = new TextEncoder(), dec = new TextDecoder();
      return (code, opts) => {
        const E = inst.exports, c = enc.encode(code), op = enc.encode(opts);
        const p = E.alloc_buffer(4 + c.length + 1 + op.length + 1);
        let u8 = new Uint8Array(mem().buffer);
        u8.set(c, p + 4); u8[p + 4 + c.length] = 0; u8.set(op, p + 5 + c.length); u8[p + 5 + c.length + op.length] = 0;
        const ok = E.wastyle(p + 4, p + 5 + c.length, p);
        const rp = new DataView(mem().buffer).getUint32(p, true);
        u8 = new Uint8Array(mem().buffer);
        let n = rp; while (rp && u8[n]) n++;
        const out = rp ? dec.decode(u8.slice(rp, n)) : '';
        E.free_buffer(p); if (rp) E.free_buffer(rp);
        return [!!ok, out];
      };
    })().catch(err => { astyle = null; throw err; });
    return astyle;
  }
  let ruff = null;
  function loadRuff() {
    if (!ruff) ruff = import(RUFF).then(async m => { await m.default(); return m.format; }).catch(err => { ruff = null; throw err; });
    return ruff;
  }
  function astyleOptions(lang) {
    const o = ['style=' + S.style, S.tabs ? 'indent=tab=' + S.tab : 'indent=spaces=' + S.tab, 'mode=' + (lang === 'java' ? 'java' : 'c')];
    for (const a of S.aopts) if (lang !== 'java' || !/pointer|return-type/.test(a)) o.push(a);
    for (const x of String(S.aextra || '').split(/[\s,]+/)) if (/^[\w=.-]+$/.test(x.replace(/^--?/, ''))) o.push(x.replace(/^--?/, ''));
    return o.join(' ');
  }
  async function formatText(text, lang) {
    if (lang === 'python') {
      const f = await loadRuff();
      try { return f(text, 'main.py', { indent_style: S.tabs ? 'tab' : 'space', indent_width: S.tab, line_width: +S.pyWidth || 88, quote_style: S.pyQuote || 'double' }); }
      catch (err) { throw new Error('Python could not be formatted — fix the syntax error first.\n' + String(err && err.message || err).split('\n')[0]); }
    }
    if (lang === 'verilog') return formatVerilog(text);
    const f = await loadAstyle();
    const [ok, out] = f(text, astyleOptions(lang));
    if (!ok) throw new Error('AStyle: ' + out.trim());
    return out;
  }
  async function format(c) {
    const e = editors.find(x => x.cm === c), lang = e ? e.o.lang() : 'cpp';
    const text = c.getValue();
    let out;
    try { out = await formatText(text, lang); }
    catch (err) { toast(err.message || String(err), 5000); return false; }
    if (c.getValue() !== text) return false;   // typed meanwhile
    if (!/\n$/.test(text) && /\n$/.test(out)) out = out.replace(/\n$/, '');
    if (out === text) { toast('Already formatted'); return true; }
    // keep the cursor next to the same code: count the non-space characters before it
    const cur = c.indexFromPos(c.getCursor());
    let k = 0; for (let i = 0; i < cur; i++) if (!/\s/.test(text[i])) k++;
    let j = 0; while (j < out.length && k > 0) { if (!/\s/.test(out[j])) k--; j++; }
    const info = c.getScrollInfo();
    c.operation(() => {
      c.replaceRange(out, { line: 0, ch: 0 }, { line: c.lastLine(), ch: c.getLine(c.lastLine()).length }, '+format');
      c.setCursor(c.posFromIndex(j));
      c.scrollTo(info.left, info.top);
    });
    toast(lang === 'python' ? 'Formatted with Ruff' : lang === 'verilog' ? 'Formatted (indentation)' : 'Formatted with AStyle · ' + S.style);
    return true;
  }
  // Verilog: re-indent from the structure (begin/end, case, module, fork, functions, open brackets) and trim spaces
  function formatVerilog(text) {
    const unit = S.tabs ? '\t' : ' '.repeat(S.tab);
    const OPEN = /\b(begin|case|casez|casex|fork|function|task|generate|module|macromodule|primitive|specify|table|interface|class|package|program|covergroup|clocking|config)\b/g;
    const CLOSE = /\b(end|endcase|join|join_any|join_none|endfunction|endtask|endgenerate|endmodule|endprimitive|endspecify|endtable|endinterface|endclass|endpackage|endprogram|endgroup|endclocking|endconfig)\b/g;
    const lines = text.replace(/\r\n?/g, '\n').split('\n');
    const out = []; let depth = 0, hang = 0, inBlock = false, blank = 0;
    for (const raw of lines) {
      const t = raw.trim();
      if (!t) { if (++blank <= 2) out.push(''); continue; }
      blank = 0;
      // code without comments and strings, for counting
      let code = '';
      for (let i = 0; i < t.length; i++) {
        if (inBlock) { if (t[i] === '*' && t[i + 1] === '/') { inBlock = false; i++; } continue; }
        if (t[i] === '/' && t[i + 1] === '*') { inBlock = true; i++; continue; }
        if (t[i] === '/' && t[i + 1] === '/') break;
        if (t[i] === '"') { const e = t.indexOf('"', i + 1); i = e < 0 ? t.length : e; code += '""'; continue; }
        code += t[i];
      }
      if (/^`(timescale|define|include|ifdef|ifndef|else|elsif|endif|default_nettype|resetall|undef)\b/.test(t)) { out.push(t); continue; }
      const opens = (code.match(OPEN) || []).length - (/\bextern\b|\bpure\s+virtual\b/.test(code) ? 1 : 0);
      const closes = (code.match(CLOSE) || []).length;
      const pOpen = (code.match(/[([{]/g) || []).length, pClose = (code.match(/[)\]}]/g) || []).length;
      const lead = /^(end\w*|join\w*)\b/.test(code) ? 1 : 0;
      const leadP = (/^[)\]}]+/.exec(code) || [''])[0].length;
      const level = Math.max(0, depth - lead - Math.min(leadP, Math.max(0, pClose - pOpen + leadP)) + (hang && !lead && !/^begin\b/.test(code) ? 1 : 0));
      out.push(unit.repeat(level) + t.replace(/\s+$/, ''));
      depth = Math.max(0, depth + opens - closes + pOpen - pClose);
      // a one-statement if / else / for / always without begin: indent the next line only
      if (/^(\b(end\s+)?else\b|if\b|for\b|while\b|repeat\b|forever\b|always(_ff|_comb|_latch)?\b|initial\b|else\s+if\b)/.test(code.replace(/^end\s+/, '')) && !/;\s*$/.test(code) && !/\bbegin\b/.test(code) && pOpen === pClose) hang = 1;
      else hang = 0;
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n') + '\n';
  }

  /* ---------------- naming tips ---------------- */
  const words = n => n.replace(/^_+|_+$/g, '').split(/_+|(?<=[a-z0-9])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/).filter(Boolean).map(w => w.toLowerCase());
  const cap = w => w[0].toUpperCase() + w.slice(1);
  const CONVERT = {
    camel: n => { const w = words(n); return w.length ? w[0] + w.slice(1).map(cap).join('') : n; },
    pascal: n => words(n).map(cap).join(''),
    snake: n => words(n).join('_'),
    upper: n => words(n).join('_').toUpperCase()
  };
  const OK = {
    camel: n => /^[a-z][a-zA-Z0-9]*$/.test(n),
    pascal: n => /^[A-Z][a-zA-Z0-9]*$/.test(n),
    snake: n => /^[a-z][a-z0-9_]*$/.test(n) && !/__/.test(n),
    upper: n => /^[A-Z][A-Z0-9_]*$/.test(n) && !/__/.test(n)
  };
  const EXEMPT = new Set(['main', 'argc', 'argv', 'args', 'self', 'cls', 'serialVersionUID', 'npos', 'size_t', 'll', 'ull', 'ld', 'pii', 'vi', 'vll', 'MOD', 'INF', 'N', 'M']);
  function followsStyle(name, conv) {
    if (conv === 'any' || EXEMPT.has(name) || /^__\w+__$/.test(name)) return true;
    const n = name.replace(/^_+|_+$/g, '');
    if (!n) return true;
    if (n.length === 1) return conv === 'pascal' || conv === 'upper' ? /[A-Za-z]/.test(n) : /[a-z]/.test(n) || conv === 'any';
    return OK[conv](n);
  }
  // declarations in a tree-sitter tree: [{name, kind, from, to}] (from/to: {row, column} of the name)
  function declarations(tree, lang) {
    const out = [];
    const add = (node, kind) => { if (node && /identifier$/.test(node.type)) out.push({ name: node.text, kind, from: node.startPosition, to: node.endPosition }); };
    const C = lang === 'c' || lang === 'cpp';
    function unwrap(d) {   // a C declarator -> [name node, is a function]
      let fn = false;
      for (let k = 0; d && k < 20; k++) {
        if (/^(identifier|field_identifier|type_identifier)$/.test(d.type)) return [d, fn];
        if (d.type === 'function_declarator') fn = true;
        if (/qualified_identifier|operator_name|destructor_name|template_function|operator_cast/.test(d.type)) return [null, fn];
        d = d.childForFieldName('declarator') || d.namedChildren.find(x => /declarator|identifier/.test(x.type)) || null;
      }
      return [null, fn];
    }
    const isConstDecl = n => n.children.some(x => x.type === 'type_qualifier' && /^(const|constexpr)$/.test(x.text)) || n.children.some(x => x.type === 'storage_class_specifier' && x.text === 'constexpr');
    const mods = n => { const m = n.namedChildren.find(x => x.type === 'modifiers'); return m ? m.text : ''; };
    function walk(n, depth) {
      if (depth > 400) return;
      const t = n.type;
      if (C) {
        if (t === 'function_definition') { const [id] = unwrap(n.childForFieldName('declarator')); add(id, 'fn'); }
        else if (t === 'declaration' || t === 'field_declaration') {
          const top = n.parent && (n.parent.type === 'translation_unit' || n.parent.type === 'declaration_list');
          for (const d of n.childrenForFieldName ? n.childrenForFieldName('declarator') : []) {
            const [id, fn] = unwrap(d);
            add(id, fn ? 'fn' : top && isConstDecl(n) ? 'const' : 'var');
          }
        } else if (t === 'parameter_declaration' || t === 'optional_parameter_declaration') { const [id] = unwrap(n.childForFieldName('declarator')); add(id, 'var'); }
        else if (t === 'for_range_loop') { const [id] = unwrap(n.childForFieldName('declarator')); add(id, 'var'); }
        else if (/^(struct|class|union|enum)_specifier$/.test(t) && n.childForFieldName('body')) add(n.childForFieldName('name'), 'type');
        else if (t === 'type_definition') { for (const d of n.childrenForFieldName('declarator')) { const [id] = unwrap(d); add(id, 'type'); } }
        else if (t === 'alias_declaration') add(n.childForFieldName('name'), 'type');
        else if (t === 'enumerator') add(n.childForFieldName('name'), 'const');
        else if (t === 'preproc_def') add(n.childForFieldName('name'), 'const');
      } else if (lang === 'java') {
        if (/^(class|interface|enum|record|annotation_type)_declaration$/.test(t)) add(n.childForFieldName('name'), 'type');
        else if (t === 'method_declaration') add(n.childForFieldName('name'), 'fn');
        else if (t === 'variable_declarator') {
          const p = n.parent, m = p && p.type === 'field_declaration' ? mods(p) : '';
          add(n.childForFieldName('name'), p && (p.type === 'field_declaration' || p.type === 'constant_declaration') && (/\bstatic\b/.test(m) && /\bfinal\b/.test(m) || p.type === 'constant_declaration') ? 'const' : 'var');
        } else if (/^(formal_parameter|spread_parameter|catch_formal_parameter|enhanced_for_statement)$/.test(t)) add(n.childForFieldName('name'), 'var');
        else if (t === 'enum_constant') add(n.childForFieldName('name'), 'const');
      } else if (lang === 'python') {
        if (t === 'function_definition') add(n.childForFieldName('name'), 'fn');
        else if (t === 'class_definition') add(n.childForFieldName('name'), 'type');
        else if (t === 'parameters' || t === 'lambda_parameters') {
          for (const p of n.namedChildren) {
            if (p.type === 'identifier') add(p, 'var');
            else if (/default_parameter|typed_parameter/.test(p.type)) add(p.childForFieldName('name') || p.namedChildren.find(x => x.type === 'identifier'), 'var');
          }
        } else if (t === 'assignment' || t === 'for_statement' || t === 'for_in_clause') {
          const left = n.childForFieldName('left');
          const top = t === 'assignment' && n.parent && n.parent.type === 'expression_statement' && n.parent.parent && n.parent.parent.type === 'module';
          const ids = [];
          (function g(x) { if (!x) return; if (x.type === 'identifier') ids.push(x); else if (/pattern_list|tuple_pattern|list_pattern|tuple|list|parenthesized/.test(x.type)) x.namedChildren.forEach(g); })(left);
          for (const id of ids) add(id, top && /^[A-Z][A-Z0-9_]*$/.test(id.text) ? 'const' : 'var');
        }
      }
      for (const ch of n.namedChildren) walk(ch, depth + 1);
    }
    walk(tree.rootNode, 0);
    return out;
  }
  function identifierNodes(tree) {   // every name in the code (not inside strings or comments)
    const out = [];
    (function walk(n, d) {
      if (d > 400) return;
      if (/^(identifier|field_identifier|type_identifier|namespace_identifier|statement_identifier)$/.test(n.type)) out.push(n);
      for (const ch of n.namedChildren) walk(ch, d + 1);
    })(tree.rootNode, 0);
    return out;
  }
  async function parse(e) {
    const lang = e.o.lang();
    if (!e.o.parser || !NAMING_DEFAULT[lang]) return null;
    const p = await e.o.parser(lang);
    return p ? { tree: p.parse(e.cm.getValue()), lang } : null;
  }
  async function checkNames(e) {
    const seq = e.seq = (e.seq || 0) + 1, c = e.cm;
    const off = !S.naming || (e.o.enabled && !e.o.enabled()) || !NAMING_DEFAULT[e.o.lang()];
    if (off) { setTips(e, []); return; }
    let parsed;
    try { parsed = await parse(e); } catch (_) { parsed = null; }
    if (!parsed || seq !== e.seq) { if (parsed) parsed.tree.delete(); return; }
    const conv = S.conv[parsed.lang], seen = new Set(), tips = [];
    for (const d of declarations(parsed.tree, parsed.lang)) {
      const key = d.kind + ':' + d.name;
      if (seen.has(key) || S.ignore.includes(d.name)) continue;
      seen.add(key);
      const want = conv[d.kind];
      if (followsStyle(d.name, want)) continue;
      const lead = /^_*/.exec(d.name)[0], trail = /_*$/.exec(d.name)[0];
      const to = lead + CONVERT[want](d.name) + trail;
      if (!to || to === d.name || !/^[A-Za-z_]\w*$/.test(to)) continue;
      tips.push({ name: d.name, kind: d.kind, want, to, from: { line: d.from.row, ch: d.from.column }, end: { line: d.to.row, ch: d.to.column } });
    }
    parsed.tree.delete();
    setTips(e, tips);
  }
  const KIND_WORD = { var: 'variable', fn: 'function', type: 'type', const: 'constant' };
  function setTips(e, tips) {
    e.tipMarks.forEach(m => m.clear());
    e.tips = tips;
    e.tipMarks = tips.map(t => e.cm.markText(t.from, t.end, { className: 'cm-nametip', attributes: { title: `Naming: ${KIND_WORD[t.kind]}s are ${CONVS.find(c => c[0] === t.want)[1]} here → ${t.to}   (Ctrl + . to rename)` } }));
    if (e.o.chip) {
      e.o.chip.hidden = !tips.length;
      e.o.chip.textContent = tips.length + (tips.length === 1 ? ' naming tip' : ' naming tips');
      e.o.chip.title = tips.map(t => `line ${t.from.line + 1}: ${t.name} → ${t.to}`).join('\n') + '\n\nClick to go to the next one';
    }
    showBubble(e);
  }
  function tipAt(e, pos) {
    for (let i = 0; i < e.tipMarks.length; i++) {
      const r = e.tipMarks[i].find();
      if (r && r.from.line === pos.line && r.from.ch <= pos.ch && pos.ch <= r.to.ch) return e.tips[i];
    }
    return null;
  }
  function hideBubble(e) { if (e.bubble) { e.bubble.remove(); e.bubble = null; } }
  function showBubble(e) {
    hideBubble(e);
    const c = e.cm;
    if (c.somethingSelected()) return;
    const t = tipAt(e, c.getCursor());
    if (!t) return;
    const b = document.createElement('div');
    b.className = 'ek-bubble';
    b.innerHTML = `<span>💡 ${esc(KIND_WORD[t.kind][0].toUpperCase() + KIND_WORD[t.kind].slice(1))} names: <b>${esc(CONVS.find(x => x[0] === t.want)[1])}</b> → <code>${esc(t.to)}</code></span><button type="button" class="p" data-a="fix" title="Rename every use (Ctrl + .)">Rename</button><button type="button" data-a="ign" title="Do not suggest this name again">Ignore</button><button type="button" data-a="set" title="Choose the naming styles">Styles…</button>`;
    b.addEventListener('mousedown', ev => ev.preventDefault());
    b.onclick = ev => {
      const a = ev.target.closest('button') && ev.target.closest('button').dataset.a;
      if (a === 'fix') renameTo(e, t.name, t.to);
      else if (a === 'ign') { S.ignore.push(t.name); save(); checkNames(e); }
      else if (a === 'set') openSettings('naming');
    };
    const r = tipAt(e, c.getCursor()) && e.tipMarks[e.tips.indexOf(t)].find();
    c.addWidget(r ? r.to : c.getCursor(), b, false);
    e.bubble = b;
  }
  function fixTipAtCursor(e) {
    const t = tipAt(e, e.cm.getCursor());
    if (t) renameTo(e, t.name, t.to); else if (e.tips.length) nextTip(e); else return CodeMirror.Pass;
  }
  function nextTip(e) {
    if (!e.tips.length) return;
    const c = e.cm, cur = c.getCursor();
    const ranges = e.tipMarks.map(m => m.find()).filter(Boolean);
    const next = ranges.find(r => r.from.line > cur.line || (r.from.line === cur.line && r.from.ch > cur.ch)) || ranges[0];
    if (!next) return;
    c.focus(); c.setCursor(next.from); c.scrollIntoView(next.from, 80);
  }
  // rename every use of a name in this editor (tree-sitter: only real names; otherwise whole words outside comments)
  async function renameTo(e, from, to) {
    const c = e.cm, text = c.getValue();
    let spots = null;
    try {
      const parsed = await parse(e);
      if (parsed) {
        const ids = identifierNodes(parsed.tree);
        if (ids.some(n => n.text === to)) { parsed.tree.delete(); toast(`"${to}" is already used in this code, so ${from} was not renamed.`, 4000); return; }
        spots = ids.filter(n => n.text === from).map(n => [n.startIndex, n.endIndex]);
        if (!spots.every(([a, b]) => text.slice(a, b) === from)) spots = ids.filter(n => n.text === from).map(n => { const a = c.indexFromPos({ line: n.startPosition.row, ch: n.startPosition.column }); return [a, a + from.length]; });
        parsed.tree.delete();
      }
    } catch (_) { spots = null; }
    if (!spots) {
      const plain = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"/g, m => ' '.repeat(m.length));
      if (new RegExp('\\b' + to + '\\b').test(plain)) { toast(`"${to}" is already used in this code, so ${from} was not renamed.`, 4000); return; }
      spots = []; const re = new RegExp('(?<![\\w$])' + from.replace(/\$/g, '\\$') + '(?![\\w$])', 'g'); let m;
      while ((m = re.exec(plain))) spots.push([m.index, m.index + from.length]);
    }
    spots = spots.filter(([a, b]) => text.slice(a, b) === from);
    if (!spots.length) return;
    c.operation(() => {
      for (const [a, b] of spots.sort((x, y) => y[0] - x[0])) c.replaceRange(to, c.posFromIndex(a), c.posFromIndex(b), '+rename');
    });
    toast(`Renamed ${from} → ${to} (${spots.length} place${spots.length === 1 ? '' : 's'}) · Ctrl + Z undoes it`);
    checkNames(e);
  }
  function rename(c) {
    const e = editors.find(x => x.cm === c);
    let p = c.getCursor();
    const ln = c.getLine(p.line);
    if (!/\w/.test(ln[p.ch] || '') && /\w/.test(ln[p.ch - 1] || '')) p = { line: p.line, ch: p.ch - 1 };   // cursor just after the name
    const w = c.findWordAt(p), name = c.getRange(w.anchor, w.head);
    if (!/^[A-Za-z_]\w*$/.test(name)) { toast('Put the cursor on a name to rename it.'); return; }
    const box = `<span>Rename <b>${esc(name)}</b> to </span><input type="text" value="${esc(name)}" spellcheck="false"> <span class="CodeMirror-search-hint">Enter renames every use · Esc cancels</span>`;
    if (!c.openDialog) { toast('Rename needs the dialog add-on.'); return; }
    c.openDialog(box, v => { v = (v || '').trim(); if (v && v !== name) { if (!/^[A-Za-z_]\w*$/.test(v)) toast('A name is made of letters, digits and _ and does not start with a digit.'); else renameTo(e, name, v); } }, { value: name, selectValueOnOpen: true, closeOnBlur: true });
  }

  /* ---------------- the settings window ---------------- */
  const SAMPLE = {
    cpp: '#include <iostream>\nusing namespace std;\nint max_of(int a,int b){if(a>b){return a;}else{return b;}}\nint main(){int* p=nullptr;int total_sum=0;\nfor(int i=0;i<5;i++)total_sum+=i;\nswitch(total_sum){case 10:cout<<"ten"<<endl;break;default:break;}\ncout<<max_of(3,7)<<endl;return 0;}\n',
    java: 'public class Main{static int maxOf(int a,int b){if(a>b){return a;}else{return b;}}\npublic static void main(String[] args){int total=0;\nfor(int i=0;i<5;i++)total+=i;\nSystem.out.println(maxOf(3,total));}}\n'
  };
  let dlg = null, curTab = 'text';
  function openSettings(tab) {
    if (!dlg) build();
    sync();
    showTab(tab || curTab);
    if (!dlg.open) dlg.showModal();
    previewFormat();
  }
  function showTab(t) {
    curTab = t;
    dlg.querySelectorAll('.tb button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === t)));
    dlg.querySelectorAll('.sec').forEach(s => s.classList.toggle('on', s.dataset.t === t));
  }
  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'ek-dlg';
    const fontOpts = () => {
      const inst = installedFonts();
      return `<optgroup label="Included">${WEB_FONTS.map(f => `<option>${esc(f)}</option>`).join('')}</optgroup>` +
        (inst.length ? `<optgroup label="On this computer">${inst.filter(f => !WEB_FONTS.includes(f)).map(f => `<option>${esc(f)}</option>`).join('')}</optgroup>` : '') +
        '<option value="__other">Other font…</option>';
    };
    const chk = (id, label, small) => `<label class="chk"><input type="checkbox" id="${id}"><span>${label}${small ? `<small>${esc(small)}</small>` : ''}</span></label>`;
    dlg.innerHTML = `<form method="dialog">
      <div class="hd"><b>Editor settings</b><button class="btn" value="close" title="Close (Esc)">Close</button></div>
      <div class="tb" role="tablist">
        <button type="button" data-t="text">Text</button><button type="button" data-t="edit">Editing</button>
        <button type="button" data-t="format">Format (AStyle)</button><button type="button" data-t="naming">Naming</button><button type="button" data-t="keys">Shortcuts</button>
      </div>
      <div class="bd">
        <div class="sec" data-t="text">
          <div class="r"><span>Font</span><div class="inl"><select id="ek-font">${fontOpts()}</select><input type="text" id="ek-fontother" placeholder="Font name, e.g. Hack" hidden style="width:14em"></div></div>
          <div class="r"><span>Size <b id="ek-sizev"></b></span><div class="inl" style="flex-wrap:nowrap"><button type="button" class="btn" id="ek-smaller" title="Smaller (Ctrl + -)">A−</button><input type="range" id="ek-size" min="8" max="40" step="1"><button type="button" class="btn" id="ek-bigger" title="Bigger (Ctrl + =)">A+</button></div></div>
          <div class="r"><span>Line spacing <b id="ek-lhv"></b></span><input type="range" id="ek-lh" min="1.1" max="2.4" step="0.05"></div>
          <div class="r"><span></span>${chk('ek-liga', 'Ligatures', 'some fonts join != -> <= into one sign')}</div>
          <p class="note">Ctrl + mouse wheel over the editor, or Ctrl + = and Ctrl + − while typing, changes the size; Ctrl + 0 goes back to ${DEF.size}.</p>
        </div>
        <div class="sec" data-t="edit">
          <div class="r"><span>Tab width</span><div class="inl"><select id="ek-tab"><option>2</option><option>3</option><option>4</option><option>8</option></select>
            <label class="chk"><input type="checkbox" id="ek-tabs"><span>Indent with tab characters</span></label></div></div>
          <div class="grid2">
            ${chk('ek-wrap', 'Wrap long lines')}${chk('ek-lines', 'Line numbers')}
            ${chk('ek-active', 'Highlight the current line')}${chk('ek-brackets', 'Close brackets and quotes')}
            ${chk('ek-fold', 'Fold blocks', 'arrows beside the line numbers; Ctrl + Q')}${chk('ek-occ', 'Highlight other uses of the word at the cursor')}
          </div>
        </div>
        <div class="sec" data-t="format">
          <p class="note">Shift + Alt + F formats the code. C, C++ and Java use Artistic Style (AStyle); Python uses Ruff; Verilog is re-indented.</p>
          <div class="r"><span>Brace style</span><select id="ek-style">${STYLES.map(([v, d]) => `<option value="${v}">${esc(d)}</option>`).join('')}</select></div>
          <div class="grid2">${AOPTS.map(([v, l, s]) => chk('ek-a-' + v.replace(/\W/g, '_'), l, s)).join('')}</div>
          <div class="r"><span>More AStyle options</span><input type="text" id="ek-aextra" placeholder="e.g. max-code-length=100 break-after-logical" spellcheck="false"></div>
          <div class="r"><span>Preview</span><div class="inl"><select id="ek-pvlang"><option value="cpp">C / C++</option><option value="java">Java</option></select><span class="note" id="ek-pvnote"></span></div></div>
          <pre class="pv" id="ek-pv"></pre>
          <div class="r"><span>Python (Ruff)</span><div class="inl">Line width <input type="number" id="ek-pyw" min="40" max="200" style="width:5em"> Quotes <select id="ek-pyq"><option value="double">"double"</option><option value="single">'single'</option><option value="preserve">keep</option></select></div></div>
        </div>
        <div class="sec" data-t="naming">
          ${chk('ek-naming', 'Underline names that do not follow the naming style', 'click one to rename it everywhere, or press Ctrl + .')}
          <table class="nm"><thead><tr><th></th>${Object.keys(LANG_NAMES).map(l => `<th>${LANG_NAMES[l]}</th>`).join('')}</tr></thead><tbody>
            ${KINDS.map(([k, label]) => `<tr><th>${label}</th>${Object.keys(LANG_NAMES).map(l => `<td><select data-conv="${l}.${k}">${CONVS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}</select></td>`).join('')}</tr>`).join('')}
          </tbody></table>
          <p class="note">Constants are #define names, enum values, const / constexpr at file level, Java static final fields and Python module-level UPPER names. One-letter names (i, n, x) are always fine.</p>
          <div class="inl"><button type="button" class="btn" id="ek-nmreset">Usual styles</button><button type="button" class="btn" id="ek-unign" title="">Show ignored names again</button><span class="note" id="ek-ignn"></span></div>
          <p class="note">F2 renames the name under the cursor in any language.</p>
        </div>
        <div class="sec" data-t="keys">
          <div class="keys">
            <kbd>Shift + Alt + F</kbd><span>Format the code</span>
            <kbd>Ctrl + /</kbd><span>Comment or uncomment the lines</span>
            <kbd>Alt + ↑ / ↓</kbd><span>Move the lines up or down</span>
            <kbd>Shift + Alt + ↑ / ↓</kbd><span>Copy the lines up or down</span>
            <kbd>Ctrl + D</kbd><span>Delete the line</span>
            <kbd>Ctrl + F</kbd><span>Find (Enter: next, Shift + Enter: previous)</span>
            <kbd>Ctrl + H</kbd><span>Replace</span>
            <kbd>Ctrl + G</kbd><span>Go to line</span>
            <kbd>F2</kbd><span>Rename the name under the cursor everywhere</span>
            <kbd>Ctrl + .</kbd><span>Apply the naming tip at the cursor</span>
            <kbd>Ctrl + Q</kbd><span>Fold or unfold the block</span>
            <kbd>Ctrl + = / − / 0</kbd><span>Bigger, smaller, default text (also Ctrl + wheel)</span>
            <kbd>Ctrl + Z / Ctrl + Y</kbd><span>Undo / redo</span>
          </div>
        </div>
      </div>
      <div class="ft"><button type="button" class="btn" id="ek-reset">Reset everything</button><span style="flex:1"></span><button class="btn primary" value="close">Done</button></div>
    </form>`;
    document.body.appendChild(dlg);
    const q = id => dlg.querySelector('#' + id);
    dlg.querySelector('.tb').onclick = ev => { const b = ev.target.closest('button[data-t]'); if (b) { showTab(b.dataset.t); if (b.dataset.t === 'format') previewFormat(); } };
    const ch = () => { save(); editors.forEach(apply); };
    q('ek-font').onchange = () => {
      const v = q('ek-font').value;
      q('ek-fontother').hidden = v !== '__other';
      if (v === '__other') { q('ek-fontother').focus(); return; }
      S.font = v; ch();
    };
    q('ek-fontother').oninput = () => { const v = q('ek-fontother').value.trim(); if (v) { S.font = v; ch(); } };
    q('ek-size').oninput = () => { S.size = +q('ek-size').value; q('ek-sizev').textContent = S.size; ch(); };
    q('ek-smaller').onclick = () => zoom(-1); q('ek-bigger').onclick = () => zoom(1);
    q('ek-lh').oninput = () => { S.lh = +q('ek-lh').value; q('ek-lhv').textContent = S.lh.toFixed(2); ch(); };
    const bool = (id, k, then) => { q(id).onchange = () => { S[k] = q(id).checked; ch(); if (then) then(); }; };
    bool('ek-liga', 'liga'); bool('ek-tabs', 'tabs', previewFormat); bool('ek-wrap', 'wrap'); bool('ek-lines', 'lines'); bool('ek-active', 'active');
    bool('ek-brackets', 'brackets'); bool('ek-fold', 'fold'); bool('ek-occ', 'occ');
    bool('ek-naming', 'naming', () => editors.forEach(e => e.o.naming && checkNames(e)));
    q('ek-tab').onchange = () => { S.tab = +q('ek-tab').value; ch(); previewFormat(); };
    q('ek-style').onchange = () => { S.style = q('ek-style').value; save(); previewFormat(); };
    for (const [v] of AOPTS) q('ek-a-' + v.replace(/\W/g, '_')).onchange = ev => { S.aopts = S.aopts.filter(x => x !== v); if (ev.target.checked) S.aopts.push(v); save(); previewFormat(); };
    q('ek-aextra').oninput = () => { S.aextra = q('ek-aextra').value; save(); clearTimeout(pvT); pvT = setTimeout(previewFormat, 300); };
    q('ek-pvlang').onchange = previewFormat;
    q('ek-pyw').onchange = () => { S.pyWidth = Math.min(200, Math.max(40, +q('ek-pyw').value || 88)); save(); };
    q('ek-pyq').onchange = () => { S.pyQuote = q('ek-pyq').value; save(); };
    dlg.querySelectorAll('select[data-conv]').forEach(s => { s.onchange = () => { const [l, k] = s.dataset.conv.split('.'); S.conv[l][k] = s.value; save(); editors.forEach(e => e.o.naming && checkNames(e)); }; });
    q('ek-nmreset').onclick = () => { S.conv = JSON.parse(JSON.stringify(NAMING_DEFAULT)); save(); sync(); editors.forEach(e => e.o.naming && checkNames(e)); };
    q('ek-unign').onclick = () => { S.ignore = []; save(); sync(); editors.forEach(e => e.o.naming && checkNames(e)); };
    q('ek-reset').onclick = () => { if (!confirm('Put every editor setting back to the default?')) return; S = load(); Object.assign(S, JSON.parse(JSON.stringify(DEF))); save(); sync(); applyAll(); previewFormat(); };
    dlg.addEventListener('close', () => { const e = editors[0]; if (e) e.cm.focus(); });
  }
  function sync() {
    const q = id => dlg.querySelector('#' + id);
    const known = [...q('ek-font').options].some(o => o.value === S.font);
    q('ek-font').value = known ? S.font : '__other';
    q('ek-fontother').hidden = known; if (!known) q('ek-fontother').value = S.font;
    q('ek-size').value = S.size; q('ek-sizev').textContent = S.size;
    q('ek-lh').value = S.lh; q('ek-lhv').textContent = (+S.lh).toFixed(2);
    for (const [id, k] of [['ek-liga', 'liga'], ['ek-tabs', 'tabs'], ['ek-wrap', 'wrap'], ['ek-lines', 'lines'], ['ek-active', 'active'], ['ek-brackets', 'brackets'], ['ek-fold', 'fold'], ['ek-occ', 'occ'], ['ek-naming', 'naming']]) q(id).checked = !!S[k];
    q('ek-tab').value = String(S.tab);
    q('ek-style').value = S.style;
    for (const [v] of AOPTS) q('ek-a-' + v.replace(/\W/g, '_')).checked = S.aopts.includes(v);
    q('ek-aextra').value = S.aextra || '';
    q('ek-pyw').value = S.pyWidth; q('ek-pyq').value = S.pyQuote;
    dlg.querySelectorAll('select[data-conv]').forEach(s => { const [l, k] = s.dataset.conv.split('.'); s.value = S.conv[l][k]; });
    q('ek-ignn').textContent = S.ignore.length ? S.ignore.length + ' ignored: ' + S.ignore.slice(0, 6).join(', ') + (S.ignore.length > 6 ? '…' : '') : '';
    q('ek-unign').hidden = !S.ignore.length;
    const e = editors[0]; if (e && e.o.lang() === 'java') q('ek-pvlang').value = 'java';
  }
  let pvT = 0, pvSeq = 0;
  async function previewFormat() {
    if (!dlg || curTab !== 'format') return;
    const q = id => dlg.querySelector('#' + id), lang = q('ek-pvlang').value, seq = ++pvSeq;
    q('ek-pvnote').textContent = 'Formatting…';
    try {
      const out = await formatText(SAMPLE[lang], lang);
      if (seq !== pvSeq) return;
      q('ek-pv').textContent = out;
      q('ek-pvnote').textContent = 'astyle ' + astyleOptions(lang).replace(/ ?mode=\w+/, '');
      if (window.CodeMirror && CodeMirror.runMode) { q('ek-pv').textContent = ''; CodeMirror.runMode(out, lang === 'java' ? 'text/x-java' : 'text/x-c++src', q('ek-pv')); q('ek-pv').classList.add('cm-s-default'); }
      q('ek-pv').style.fontFamily = fontStack(S.font);
    } catch (err) { if (seq === pvSeq) { q('ek-pv').textContent = ''; q('ek-pvnote').textContent = err.message || String(err); } }
  }

  window.EditorKit = {
    attach, openSettings, format, formatText, zoom, settings: () => S, rename,
    _test: { declarations, followsStyle, CONVERT, formatVerilog, astyleOptions }
  };
})();
