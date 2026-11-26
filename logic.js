// Truth tables -> logic. Quine-McCluskey finds the prime implicants (don't-cares help), Petrick's method picks the
// smallest cover (exact up to a few dozen primes, then greedy). Gives the sum of products, the product of sums,
// the canonical forms, and Verilog: a module with one assign per output, plus a testbench that checks every row.
// Works in the page (window.Logic) and in Node (for tests).
(function (root) {
  'use strict';

  // an implicant: { v: value bits, m: mask of the bits that matter, terms: [minterms it covers] }
  function primes(n, ones, dcs) {
    let groups = new Map();
    const all = [...new Set([...ones, ...dcs])].sort((a, b) => a - b);
    const full = (1 << n) - 1;
    let cur = all.map(t => ({ v: t, m: full, terms: [t] }));
    const result = [];
    while (cur.length) {
      const used = new Set(), next = new Map();
      for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) {
        const a = cur[i], b = cur[j];
        if (a.m !== b.m) continue;
        const d = (a.v ^ b.v) & a.m;
        if (d && !(d & (d - 1))) {
          const m = a.m & ~d, v = a.v & m, key = m + ':' + v;
          if (!next.has(key)) next.set(key, { v, m, terms: [...new Set([...a.terms, ...b.terms])].sort((x, y) => x - y) });
          used.add(i); used.add(j);
        }
      }
      cur.forEach((c, i) => { if (!used.has(i)) result.push(c); });
      cur = [...next.values()];
    }
    void groups;
    // keep only primes that cover at least one real 1
    const set = new Set(ones);
    return result.filter(p => p.terms.some(t => set.has(t)));
  }

  // the fewest primes (then the fewest literals) that cover every 1
  function cover(n, ones, ps) {
    if (!ones.length) return [];
    const lits = p => n - popcount(p.m ^ ((1 << n) - 1)) - (n - popcount(p.m)) + popcount(p.m) - (n - n);   // = number of bits in the mask
    const cost = p => popcount(p.m);
    const chosen = [];
    let left = new Set(ones);
    // essential primes first
    for (const t of ones) {
      const c = ps.filter(p => p.terms.includes(t));
      if (c.length === 1 && !chosen.includes(c[0])) chosen.push(c[0]);
    }
    for (const p of chosen) for (const t of p.terms) left.delete(t);
    if (!left.size) return chosen;
    const rest = ps.filter(p => !chosen.includes(p) && p.terms.some(t => left.has(t)));
    // Petrick's method when small, greedy otherwise
    if (rest.length <= 20) {
      const need = [...left];
      let best = null;
      const total = rest.length;
      for (let k = 1; k <= total && !best; k++) {
        // all subsets of size k (in order), keep the cheapest that covers
        const idx = Array.from({ length: k }, (_, i) => i);
        while (true) {
          const pick = idx.map(i => rest[i]);
          if (need.every(t => pick.some(p => p.terms.includes(t)))) {
            const c = pick.reduce((s, p) => s + cost(p), 0);
            if (!best || c < best.c) best = { pick, c };
          }
          let i = k - 1;
          while (i >= 0 && idx[i] === total - k + i) i--;
          if (i < 0) break;
          idx[i]++;
          for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
        }
      }
      return chosen.concat(best ? best.pick : []);
    }
    while (left.size) {
      let bestP = null, bestN = -1;
      for (const p of rest) { const nn = p.terms.filter(t => left.has(t)).length; if (nn > bestN || (nn === bestN && cost(p) < cost(bestP))) { bestN = nn; bestP = p; } }
      chosen.push(bestP);
      for (const t of bestP.terms) left.delete(t);
    }
    void lits;
    return chosen;
  }
  function popcount(x) { let c = 0; while (x) { x &= x - 1; c++; } return c; }

  // implicant -> product term (SOP) or sum term (POS) using the variable names; bit (n-1-i) belongs to names[i]
  function productTerm(p, names, style) {
    const n = names.length, parts = [];
    for (let i = 0; i < n; i++) {
      const bit = 1 << (n - 1 - i);
      if (!(p.m & bit)) continue;
      const one = !!(p.v & bit);
      parts.push(style === 'math' ? names[i] + (one ? '' : "'") : (one ? '' : '~') + names[i]);
    }
    if (!parts.length) return style === 'math' ? '1' : "1'b1";
    return style === 'math' ? parts.join(names.some(x => x.length > 1) ? '·' : '') : parts.length > 1 ? parts.join(' & ') : parts[0];
  }
  function sumTerm(p, names, style) {
    // a prime of the zeros: the sum term is 0 exactly on it, so each literal is complemented
    const n = names.length, parts = [];
    for (let i = 0; i < n; i++) {
      const bit = 1 << (n - 1 - i);
      if (!(p.m & bit)) continue;
      const one = !!(p.v & bit);
      parts.push(style === 'math' ? names[i] + (one ? "'" : '') : (one ? '~' : '') + names[i]);
    }
    if (!parts.length) return style === 'math' ? '0' : "1'b0";
    return '(' + parts.join(style === 'math' ? ' + ' : ' | ') + ')';
  }

  // values: array of length 2^n with 0, 1 or 'x' (don't care); row r = inputs as a binary number, names[0] is the MSB
  function minimize(names, values) {
    const n = names.length;
    const ones = [], zeros = [], dcs = [];
    values.forEach((v, i) => { if (v === 1 || v === '1') ones.push(i); else if (v === 0 || v === '0') zeros.push(i); else dcs.push(i); });
    const sopP = cover(n, ones, primes(n, ones, dcs));
    const posP = cover(n, zeros, primes(n, zeros, dcs));
    const sop = !ones.length ? { math: '0', v: "1'b0" } : !zeros.length && !dcs.length ? { math: '1', v: "1'b1" } :
      { math: sopP.map(p => productTerm(p, names, 'math')).join(' + '), v: sopP.map(p => { const t = productTerm(p, names, 'v'); return sopP.length > 1 && t.includes('&') ? '(' + t + ')' : t; }).join(' | ') };
    const pos = !zeros.length ? { math: '1', v: "1'b1" } : !ones.length && !dcs.length ? { math: '0', v: "1'b0" } :
      { math: posP.map(p => sumTerm(p, names, 'math')).join(''), v: posP.map(p => sumTerm(p, names, 'v')).join(' & ') };
    return {
      ones, zeros, dcs, sop, pos, sopTerms: sopP, posTerms: posP,
      canonSop: ones.length ? 'Σm(' + ones.join(', ') + ')' + (dcs.length ? ' + d(' + dcs.join(', ') + ')' : '') : '0',
      canonPos: zeros.length ? 'ΠM(' + zeros.join(', ') + ')' + (dcs.length ? ' · D(' + dcs.join(', ') + ')' : '') : '1',
      literals: sopP.reduce((s, p) => s + popcount(p.m), 0)
    };
  }

  const ident = s => /^[A-Za-z_][A-Za-z0-9_$]*$/.test(s);
  // a whole table: inputs [names], outputs [{ name, values }]
  function toVerilog(moduleName, inputs, outputs, form = 'sop') {
    const res = outputs.map(o => ({ o, r: minimize(inputs, o.values) }));
    const lines = [];
    lines.push(`// ${moduleName}: generated from a truth table (${inputs.length} input${inputs.length > 1 ? 's' : ''}, ${outputs.length} output${outputs.length > 1 ? 's' : ''})`);
    for (const { o, r } of res) lines.push(`// ${o.name} = ${form === 'pos' ? r.pos.math : r.sop.math}   (${form === 'pos' ? r.canonPos : r.canonSop})`);
    lines.push(`module ${moduleName} (`);
    lines.push(...inputs.map(i => `    input  wire ${i},`), ...outputs.map((o, k) => `    output wire ${o.name}${k === outputs.length - 1 ? '' : ','}`));
    lines.push(');');
    for (const { o, r } of res) lines.push(`    assign ${o.name} = ${form === 'pos' ? r.pos.v : r.sop.v};`);
    lines.push('endmodule', '');
    return { code: lines.join('\n'), results: res };
  }
  // a testbench that applies every row, prints it, and counts rows that differ from the table
  function testbench(moduleName, inputs, outputs) {
    const n = inputs.length, rows = 1 << n;
    const L = [];
    L.push(`// Testbench for ${moduleName}: applies all ${rows} input combinations and checks each output against the table`);
    L.push('`timescale 1ns/1ps');
    L.push(`module ${moduleName}_tb;`);
    L.push(`    reg  [${n - 1}:0] in;`);
    L.push(`    wire ${outputs.map(o => o.name).join(', ')};`);
    L.push(`    integer i, errors = 0;`);
    L.push(`    ${moduleName} dut (${inputs.map((x, k) => `.${x}(in[${n - 1 - k}])`).concat(outputs.map(o => `.${o.name}(${o.name})`)).join(', ')});`);
    L.push(`    reg [${rows - 1}:0] expected [0:${outputs.length - 1}];`);
    L.push('    initial begin');
    outputs.forEach((o, k) => {
      // expected bits; don't-cares are not checked
      L.push(`        expected[${k}] = ${rows}'b${[...o.values].reverse().map(v => v === 1 || v === '1' ? '1' : v === 0 || v === '0' ? '0' : 'x').join('')};`);
    });
    L.push('        $dumpfile("wave.vcd");');
    L.push(`        $dumpvars(0, ${moduleName}_tb);`);
    L.push(`        $display("${inputs.join(' ')} | ${outputs.map(o => o.name).join(' ')}");`);
    L.push(`        for (i = 0; i < ${rows}; i = i + 1) begin`);
    L.push('            in = i;');
    L.push('            #10;');
    L.push(`            $display("${inputs.map(() => '%b').join(' ')} | ${outputs.map(() => '%b').join(' ')}", ${inputs.map((x, k) => `in[${n - 1 - k}]`).join(', ')}, ${outputs.map(o => o.name).join(', ')});`);
    outputs.forEach((o, k) => L.push(`            if (expected[${k}][i] !== 1'bx && ${o.name} !== expected[${k}][i]) begin errors = errors + 1; $display("  row %0d: ${o.name} should be %b", i, expected[${k}][i]); end`));
    L.push('        end');
    L.push('        if (errors == 0) $display("All rows match the truth table.");');
    L.push('        else $display("%0d row(s) do not match.", errors);');
    L.push('        $finish;');
    L.push('    end');
    L.push('endmodule', '');
    return L.join('\n');
  }

  // evaluate a Boolean expression for every row (to fill a table from a formula): A, B... ' ~ ! & | ^ + * ( ) 0 1
  function tableFromExpression(expr, names) {
    const n = names.length;
    const toks = [];
    const re = /\s*([A-Za-z_][A-Za-z0-9_]*|[01]|'|~|!|&|\||\^|\+|\*|\(|\)|·)/y;
    let i = 0, m;
    const s = expr.trim();
    while (i < s.length) {
      re.lastIndex = i; m = re.exec(s);
      if (!m) throw new Error('unexpected "' + s.slice(i, i + 5) + '"');
      // "AC" means A AND C when the inputs are single letters
      if (/^[A-Za-z_]/.test(m[1]) && !names.includes(m[1]) && [...m[1]].every(ch => names.includes(ch))) toks.push(...m[1]);
      else toks.push(m[1]);
      i = re.lastIndex; while (s[i] === ' ') i++;
    }
    let p = 0;
    const peek = () => toks[p], eat = t => { if (toks[p] !== t) throw new Error('expected ' + t); p++; };
    // or := xor ('|' | '+' xor)* ; xor := and ('^' and)* ; and := unary (('&'|'*'|'·'|implicit) unary)* ; unary := ('~'|'!') unary | atom "'"*
    function orE(row) { let v = xorE(row); while (peek() === '|' || peek() === '+') { p++; v = xorE(row) | v; } return v; }
    function xorE(row) { let v = andE(row); while (peek() === '^') { p++; v = andE(row) ^ v; } return v; }
    function andE(row) {
      let v = unary(row);
      while (peek() === '&' || peek() === '*' || peek() === '·' || (peek() && /^([A-Za-z_]|[01]|\(|~|!)/.test(peek()))) { if (['&', '*', '·'].includes(peek())) p++; v = unary(row) & v; }
      return v;
    }
    function unary(row) {
      let v;
      if (peek() === '~' || peek() === '!') { p++; v = 1 - unary(row); }
      else if (peek() === '(') { p++; v = orE(row); eat(')'); }
      else if (peek() === '0' || peek() === '1') { v = +toks[p++]; }
      else if (peek() && /^[A-Za-z_]/.test(peek())) {
        const k = names.indexOf(toks[p]);
        if (k < 0) throw new Error('unknown input "' + toks[p] + '"');
        p++; v = (row >> (n - 1 - k)) & 1;
      } else throw new Error('unexpected end');
      while (peek() === "'") { p++; v = 1 - v; }
      return v;
    }
    const out = [];
    for (let row = 0; row < (1 << n); row++) { p = 0; const v = orE(row); if (p !== toks.length) throw new Error('unexpected "' + toks[p] + '"'); out.push(v); }
    return out;
  }

  const api = { minimize, toVerilog, testbench, tableFromExpression, ident };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
