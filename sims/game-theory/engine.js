/* Game-theory engine: minimax and alpha–beta pruning on game trees; saddle points (pure strategies) and the
   2 × n graphical method (mixed strategies) for zero-sum matrix games; iterated elimination of strictly dominated
   strategies and pure Nash equilibria (best responses) for bimatrix games; Nim with the nim-sum.
   Rows/columns/heaps are shown 1-based. Works in the browser (window.GTEngine) and in Node. */
(function (root) {
  const MODES = {
    minimax: { name: 'Minimax on a game tree', short: 'Minimax', group: 'tree' },
    alphabeta: { name: 'Alpha–beta pruning', short: 'Alpha–beta', group: 'tree' },
    saddle: { name: 'Saddle point: maximin and minimax', short: 'Saddle point', group: 'zero' },
    graph: { name: 'Mixed strategies: 2 × n graphical method', short: 'Mixed (2 × n)', group: 'zero' },
    dominance: { name: 'Iterated elimination of dominated strategies', short: 'Dominance', group: 'bi' },
    nash: { name: 'Pure Nash equilibria by best responses', short: 'Nash equilibria', group: 'bi' },
    nim: { name: 'Nim and the nim-sum', short: 'Nim', group: 'comb' }
  };
  const INF = Infinity;
  const f = x => x === INF ? '+∞' : x === -INF ? '−∞' : x == null ? '·' : typeof x === 'number' ? (x < 0 ? '−' + fr(-x) : fr(x)) : String(x);
  function fr(x) { if (Number.isInteger(x)) return String(x); for (let d = 2; d <= 60; d++) { const n = Math.round(x * d); if (Math.abs(n / d - x) < 1e-9) return `${n}/${d}`; } return x.toFixed(3); }
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;

  function recorder() {
    const R = { steps: [], rows: [], ops: 0 };
    R.snap = o => R.steps.push(Object.assign({ line: [], msg: '', vars: {} }, o, { rows: R.rows.map(r => r.slice()), ops: R.ops }));
    return R;
  }

  function code(mode) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (mode === 'minimax') {
      P('MINIMAX(node)   ▷ MAX moves at even depth, MIN at odd depth');
      L('a', `${kw('if')} node is a leaf:  ${kw('return')} its utility`);
      L('b', `${kw('if')} MAX to move:  ${kw('return')} max over children of MINIMAX(child)`);
      L('c', `${kw('else')}:  ${kw('return')} min over children of MINIMAX(child)`);
    } else if (mode === 'alphabeta') {
      P('ALPHA-BETA(node, α, β)   ▷ call with α = −∞, β = +∞');
      L('a', `${kw('if')} node is a leaf:  ${kw('return')} its utility`);
      L('b', `${kw('if')} MAX:  v = −∞;  ${kw('for each')} child:  v = max(v, ALPHA-BETA(child, α, β));  α = max(α, v)`);
      L('c', `${kw('if')} MIN:  v = +∞;  ${kw('for each')} child:  v = min(v, ALPHA-BETA(child, α, β));  β = min(β, v)`);
      L('d', `    ${kw('if')} α ≥ β:  ${kw('break')}   ${cm('▷ prune the remaining children')}`);
      L('e', `${kw('return')} v`);
    } else if (mode === 'saddle') {
      P('SADDLE-POINT(A)   ▷ row player maximises, column player minimises');
      L('a', `${kw('for each')} row i:   rowMin[i] = min_j A[i][j]`);
      L('b', `maximin = max_i rowMin[i]   ${cm('▷ lower value: row player can guarantee this')}`);
      L('c', `${kw('for each')} column j:   colMax[j] = max_i A[i][j]`);
      L('d', `minimax = min_j colMax[j]   ${cm('▷ upper value')}`);
      L('e', `${kw('if')} maximin == minimax:  saddle point, value = maximin  ${kw('else')} use mixed strategies`);
    } else if (mode === 'graph') {
      P('GRAPHICAL-METHOD(A is 2 × n)   ▷ row player plays row 1 with probability p');
      L('a', `check for a saddle point first`);
      L('b', `${kw('for each')} column j:  E_j(p) = p·A[1][j] + (1 − p)·A[2][j]   ${cm('▷ a straight line')}`);
      L('c', `lower envelope L(p) = min_j E_j(p)   ${cm('▷ what the row player is sure to get')}`);
      L('d', `p* = the p that maximises L(p);  value v = L(p*)`);
      L('e', `solve the 2 × 2 game of the two lines through the peak for the column player`);
    } else if (mode === 'dominance') {
      P('ITERATED-ELIMINATION(bimatrix)   ▷ payoffs (row player, column player)');
      L('a', `${kw('repeat')}`);
      L('b', `    ${kw('if')} row r' gives player 1 strictly more than row r in every remaining column:  delete row r`);
      L('c', `    ${kw('if')} column c' gives player 2 strictly more than column c in every remaining row:  delete column c`);
      L('d', `${kw('until')} nothing is deleted`);
    } else if (mode === 'nash') {
      P('PURE-NASH(bimatrix)');
      L('a', `${kw('for each')} column j:  mark the row(s) with the largest payoff for player 1   ${cm('▷ best responses')}`);
      L('b', `${kw('for each')} row i:  mark the column(s) with the largest payoff for player 2`);
      L('c', `a cell marked twice is a Nash equilibrium   ${cm('▷ nobody gains by deviating alone')}`);
    } else if (mode === 'nim') {
      P('NIM   ▷ take any number of objects from one heap; whoever takes the last object wins');
      L('a', `s = h₁ ⊕ h₂ ⊕ … ⊕ h_k   ${cm('▷ nim-sum (bitwise XOR)')}`);
      L('b', `${kw('if')} s == 0:  the player to move loses against perfect play  (take 1 from some heap)`);
      L('c', `${kw('else')}: find heap i with h_i ⊕ s < h_i;  reduce it to h_i ⊕ s   ${cm('▷ makes s = 0')}`);
      L('d', `repeat until all heaps are empty`);
    }
    return C;
  }
  function header(mode) {
    return ({
      minimax: ['Node', 'Player', 'Children values', 'Value'], alphabeta: ['Node', 'Player', 'Event', 'α', 'β', 'v'],
      saddle: ['Strategy', 'Values', 'min / max'], graph: ['Candidate p', 'Lines meeting', 'L(p)', 'Best so far'],
      dominance: ['Round', 'Player', 'Deleted', 'Dominated by', 'Comparison'], nash: ['Player', 'Opponent plays', 'Best response', 'Payoff'],
      nim: ['Move', 'Heaps before', 'Nim-sum', 'Mover', 'Move', 'Heaps after']
    })[mode];
  }

  /* ---------- trees ---------- */
  function build(tree) {
    const nodes = [];
    (function add(t, parent, depth) {
      const id = nodes.length, nd = { id, parent, depth, max: depth % 2 === 0, kids: [], leaf: !Array.isArray(t), u: Array.isArray(t) ? null : t };
      nodes.push(nd); if (parent >= 0) nodes[parent].kids.push(id);
      if (Array.isArray(t)) t.forEach(c => add(c, id, depth + 1));
    })(tree, -1, 0);
    let L = 0; nodes.forEach(n => { if (n.leaf) n.name = `leaf ${++L}`; });
    const lab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; let k = 0; nodes.forEach(n => { if (!n.leaf) n.name = lab[k++ % 26]; });
    return nodes;
  }
  const tsnap = (nodes, st) => nodes.map(n => ({ id: n.id, parent: n.parent, depth: n.depth, max: n.max, leaf: n.leaf, u: n.u, name: n.name, v: st.v[n.id], a: st.a[n.id], b: st.b[n.id], s: st.s[n.id] }));
  function minimax(R, { tree }) {
    const N = build(tree), st = { v: {}, a: {}, b: {}, s: {} }; let leaves = 0;
    R.snap({ msg: `MAX (▲) moves at the root and the players alternate; MIN (▼) picks the smallest value. Values are backed up from the leaves.`, tree: tsnap(N, st), cur: -1 });
    function mm(id) {
      const n = N[id];
      if (n.leaf) { leaves++; R.ops++; st.v[id] = n.u; st.s[id] = 'done'; R.snap({ line: ['a'], tree: tsnap(N, st), cur: id, msg: `${n.name}: utility ${f(n.u)}.`, vars: { node: n.name, value: f(n.u) } }); return n.u; }
      st.s[id] = 'act'; R.snap({ line: [n.max ? 'b' : 'c'], tree: tsnap(N, st), cur: id, msg: `Node ${n.name} (${n.max ? 'MAX' : 'MIN'}): evaluate its ${n.kids.length} children from left to right.`, vars: { node: n.name } });
      const vals = [];
      for (const c of n.kids) {
        vals.push(mm(c)); const best = n.max ? Math.max(...vals) : Math.min(...vals); st.v[id] = best;
        R.snap({ line: [n.max ? 'b' : 'c'], tree: tsnap(N, st), cur: id, msg: `Back at ${n.name}: children so far ${vals.map(f).join(', ')}; ${n.max ? 'max' : 'min'} = <b>${f(best)}</b>.`, vars: { node: n.name, value: f(best) } });
      }
      st.s[id] = 'done'; R.rows.push([n.name, n.max ? 'MAX' : 'MIN', vals.map(f).join(', '), f(st.v[id])]);
      return st.v[id];
    }
    const v = mm(0);
    let best = N[0].kids.find(c => st.v[c] === v); st.s[best] = 'best';
    R.result = { value: v, leaves, total: N.filter(n => n.leaf).length, move: N[best] ? N[best].name : '' };
    R.final = { tree: tsnap(N, st), cur: -1 };
  }
  function alphabeta(R, { tree }) {
    const N = build(tree), st = { v: {}, a: {}, b: {}, s: {} }; let leaves = 0, pruned = 0;
    R.snap({ msg: `α = best value MAX can already guarantee on the path; β = best value MIN can guarantee. When α ≥ β the rest of a node's children cannot change the result and are pruned.`, tree: tsnap(N, st), cur: -1, vars: { 'α': '−∞', 'β': '+∞' } });
    const prune = id => { st.s[id] = 'pruned'; if (N[id].leaf) pruned++; N[id].kids.forEach(prune); };
    function ab(id, a, b) {
      const n = N[id]; st.a[id] = a; st.b[id] = b;
      if (n.leaf) { leaves++; R.ops++; st.v[id] = n.u; st.s[id] = 'done'; R.rows.push([n.name, 'leaf', 'evaluate', f(a), f(b), f(n.u)]); R.snap({ line: ['a'], tree: tsnap(N, st), cur: id, msg: `${n.name}: utility ${f(n.u)}.`, vars: { node: n.name, 'α': f(a), 'β': f(b) } }); return n.u; }
      st.s[id] = 'act'; let v = n.max ? -INF : INF; st.v[id] = null;
      R.snap({ line: [n.max ? 'b' : 'c'], tree: tsnap(N, st), cur: id, msg: `Enter ${n.name} (${n.max ? 'MAX' : 'MIN'}) with α = ${f(a)}, β = ${f(b)}.`, vars: { node: n.name, 'α': f(a), 'β': f(b) } });
      for (let k = 0; k < n.kids.length; k++) {
        const c = n.kids[k], cv = ab(c, a, b);
        if (n.max) { v = Math.max(v, cv); a = Math.max(a, v); } else { v = Math.min(v, cv); b = Math.min(b, v); }
        st.v[id] = v; st.a[id] = a; st.b[id] = b;
        R.rows.push([n.name, n.max ? 'MAX' : 'MIN', `child ${N[c].name} = ${f(cv)}`, f(a), f(b), f(v)]);
        R.snap({ line: [n.max ? 'b' : 'c'], tree: tsnap(N, st), cur: id, msg: `${n.name}: child ${N[c].name} returned ${f(cv)}. v = ${f(v)}; now α = ${f(a)}, β = ${f(b)}.`, vars: { node: n.name, 'α': f(a), 'β': f(b), v: f(v) } });
        if (a >= b && k < n.kids.length - 1) {
          const rest = n.kids.slice(k + 1); rest.forEach(prune);
          R.rows.push([n.name, n.max ? 'MAX' : 'MIN', `prune ${rest.map(r => N[r].name).join(', ')}`, f(a), f(b), f(v)]);
          R.snap({ line: ['d'], tree: tsnap(N, st), cur: id, msg: `α = ${f(a)} ≥ β = ${f(b)}: ${n.max ? `MIN above will never let play reach ${n.name}, since it already has an option worth ${f(b)}` : `MAX above already has an option worth ${f(a)}, so it will never choose ${n.name}`}. Prune ${rest.map(r => N[r].name).join(', ')}.`, vars: { node: n.name, 'α': f(a), 'β': f(b) } });
          break;
        }
      }
      st.s[id] = 'done';
      R.snap({ line: ['e'], tree: tsnap(N, st), cur: id, msg: `${n.name} returns <b>${f(v)}</b>.`, vars: { node: n.name, v: f(v) } });
      return v;
    }
    const v = ab(0, -INF, INF);
    const best = N[0].kids.find(c => st.v[c] === v && st.s[c] !== 'pruned'); if (best != null) st.s[best] = 'best';
    R.result = { value: v, leaves, pruned, total: N.filter(n => n.leaf).length, move: best != null ? N[best].name : '' };
    R.final = { tree: tsnap(N, st), cur: -1 };
  }

  /* ---------- zero-sum matrix games ---------- */
  const mstate = (A, cls, extra) => Object.assign({ v: A.map(r => r.slice()), cls: Object.assign({}, cls) }, extra || {});
  function saddle(R, { A }) {
    const m = A.length, n = A[0].length, rmin = [], cmax = [];
    R.snap({ msg: `A[i][j] is what the column player pays the row player. Row player (maximiser) chooses a row; column player (minimiser) chooses a column.`, matrix: mstate(A, {}, { rowX: [], colX: [] }) });
    for (let i = 0; i < m; i++) { rmin[i] = Math.min(...A[i]); R.ops += n; const j = A[i].indexOf(rmin[i]), cls = {}; A[i].forEach((_, k) => cls[`${i},${k}`] = 'src'); cls[`${i},${j}`] = 'new'; R.rows.push([`row ${i + 1}`, A[i].map(f).join(', '), `min ${f(rmin[i])}`]); R.snap({ line: ['a'], msg: `Row ${i + 1}: the worst the row player can get is ${f(rmin[i])}.`, matrix: mstate(A, cls, { rowX: rmin.slice(), colX: [] }), vars: { i: i + 1, 'rowMin': f(rmin[i]) } }); }
    const lo = Math.max(...rmin), bi = rmin.indexOf(lo);
    R.snap({ line: ['b'], msg: `Maximin = max of the row minima = <b>${f(lo)}</b> (row ${bi + 1}). Playing row ${bi + 1}, the row player gets at least ${f(lo)} whatever the opponent does.`, matrix: mstate(A, {}, { rowX: rmin.slice(), colX: [], rowHi: bi }), vars: { maximin: f(lo) } });
    for (let j = 0; j < n; j++) { const col = A.map(r => r[j]); cmax[j] = Math.max(...col); R.ops += m; const i = col.indexOf(cmax[j]), cls = {}; col.forEach((_, k) => cls[`${k},${j}`] = 'src'); cls[`${i},${j}`] = 'new'; R.rows.push([`column ${j + 1}`, col.map(f).join(', '), `max ${f(cmax[j])}`]); R.snap({ line: ['c'], msg: `Column ${j + 1}: the most the column player can lose is ${f(cmax[j])}.`, matrix: mstate(A, cls, { rowX: rmin.slice(), colX: cmax.slice(), rowHi: bi }), vars: { j: j + 1, colMax: f(cmax[j]), maximin: f(lo) } }); }
    const hi = Math.min(...cmax), bj = cmax.indexOf(hi);
    R.snap({ line: ['d'], msg: `Minimax = min of the column maxima = <b>${f(hi)}</b> (column ${bj + 1}).`, matrix: mstate(A, {}, { rowX: rmin.slice(), colX: cmax.slice(), rowHi: bi, colHi: bj }), vars: { maximin: f(lo), minimax: f(hi) } });
    const sp = lo === hi;
    R.snap({ line: ['e'], msg: sp ? `Maximin = minimax = ${f(lo)}: saddle point at (row ${bi + 1}, column ${bj + 1}). Both players use pure strategies and the value of the game is <b>${f(lo)}</b>.` : `Maximin ${f(lo)} < minimax ${f(hi)}: no saddle point. The value lies between ${f(lo)} and ${f(hi)} and needs mixed strategies.`, matrix: mstate(A, sp ? { [`${bi},${bj}`]: 'path' } : {}, { rowX: rmin.slice(), colX: cmax.slice(), rowHi: bi, colHi: bj }), vars: { maximin: f(lo), minimax: f(hi) } });
    R.result = { lo, hi, saddle: sp, at: [bi, bj] };
  }
  function graph(R, { A }) {
    const n = A[0].length, lines = A[0].map((a, j) => ({ j, a, b: A[1][j] })); // E_j(p) = b + (a − b) p
    const E = (l, p) => l.b + (l.a - l.b) * p, Lp = p => Math.min(...lines.map(l => E(l, p)));
    const rmin = A.map(r => Math.min(...r)), cmax = A[0].map((_, j) => Math.max(A[0][j], A[1][j]));
    const lo = Math.max(...rmin), hi = Math.min(...cmax);
    R.snap({ line: ['a'], msg: `Row minima ${rmin.map(f).join(', ')} → maximin ${f(lo)}; column maxima ${cmax.map(f).join(', ')} → minimax ${f(hi)}. ${lo === hi ? 'There is a saddle point, but the graph still shows it.' : 'No saddle point, so the players should mix.'}`, matrix: mstate(A, {}), chart: { lines, show: [], p: null } });
    for (let k = 0; k < n; k++) R.snap({ line: ['b'], msg: `Column ${k + 1}: if the opponent plays it, the row player expects E${k + 1}(p) = ${f(lines[k].a)}·p + ${f(lines[k].b)}·(1 − p).`, matrix: mstate(A, { [`0,${k}`]: 'src', [`1,${k}`]: 'src' }), chart: { lines, show: lines.slice(0, k + 1).map(l => l.j), p: null } });
    R.snap({ line: ['c'], msg: `The opponent will pick the column that is worst for the row player, so the row player is guaranteed the lower envelope L(p) (thick line).`, matrix: mstate(A, {}), chart: { lines, show: lines.map(l => l.j), env: true, p: null } });
    const cands = [0, 1];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const d = (lines[i].a - lines[i].b) - (lines[j].a - lines[j].b); if (d !== 0) { const p = (lines[j].b - lines[i].b) / d; if (p > 0 && p < 1) cands.push(p); } }
    const uniq = cands.sort((x, y) => x - y).filter((p, k, a) => k === 0 || p - a[k - 1] > 1e-9);
    let bp = 0, bv = -INF;
    for (const p of uniq) {
      const v = Lp(p); R.ops++; const meet = lines.filter(l => Math.abs(E(l, p) - v) < 1e-7).map(l => l.j + 1);
      if (v > bv + 1e-9) { bv = v; bp = p; }
      R.rows.push([f(p), meet.join(', '), f(v), `p = ${f(bp)}, L = ${f(bv)}`]);
      R.snap({ line: ['d'], msg: `At p = ${f(p)} the envelope is L = ${f(v)} (lines ${meet.join(', ')} are lowest). Best so far: p = ${f(bp)}, L = ${f(bv)}.`, matrix: mstate(A, {}), chart: { lines, show: lines.map(l => l.j), env: true, p, best: bp }, vars: { p: f(p), 'L(p)': f(v) } });
    }
    // column player's mix from two lines through the peak with opposite slopes
    const at = lines.filter(l => Math.abs(E(l, bp) - bv) < 1e-7);
    let q = null, cols = null;
    const up = at.filter(l => l.a - l.b > 0), dn = at.filter(l => l.a - l.b < 0);
    if (up.length && dn.length) {
      const u = up[0], d = dn[0]; // q·u + (1−q)·d has slope 0
      const su = u.a - u.b, sd = d.a - d.b; const qq = -sd / (su - sd); q = { [u.j]: qq, [d.j]: 1 - qq }; cols = [u.j, d.j];
    } else if (at.length) { q = { [at[0].j]: 1 }; cols = [at[0].j]; }
    const cls = {}; (cols || []).forEach(j => { cls[`0,${j}`] = 'path'; cls[`1,${j}`] = 'path'; });
    R.snap({ line: ['e'], msg: `Optimal: row player plays row 1 with p* = <b>${f(bp)}</b> and row 2 with ${f(1 - bp)}; value v = <b>${f(bv)}</b>. ${cols && cols.length === 2 ? `The column player mixes columns ${cols[0] + 1} and ${cols[1] + 1} with probabilities ${f(q[cols[0]])} and ${f(q[cols[1]])} (the other columns get 0).` : cols ? `The column player plays column ${cols[0] + 1}.` : ''}`, matrix: mstate(A, cls), chart: { lines, show: lines.map(l => l.j), env: true, p: bp, best: bp, final: true }, vars: { 'p*': f(bp), v: f(bv) } });
    R.result = { p: bp, value: bv, q, cols };
  }

  /* ---------- bimatrix ---------- */
  function dominance(R, { B, rn, cn }) {
    let rows = B.map((_, i) => i), cols = B[0].map((_, j) => j), round = 0;
    const bstate = (cls, o) => Object.assign({ B, rows: rows.slice(), cols: cols.slice(), rn, cn, cls: Object.assign({}, cls) }, o || {});
    R.snap({ line: [], msg: `Each cell holds (payoff to the row player, payoff to the column player). A strategy is strictly dominated if another one is better against <i>every</i> remaining strategy of the opponent; a rational player never uses it.`, bi: bstate({}) });
    let changed = true;
    while (changed) {
      changed = false; round++;
      R.snap({ line: ['a'], msg: `Round ${round}: look for a dominated row (player 1), then a dominated column (player 2).`, bi: bstate({}) });
      outer: for (const r of rows) for (const r2 of rows) {
        if (r === r2) continue; R.ops++;
        if (cols.every(c => B[r2][c][0] > B[r][c][0])) {
          const cls = {}; cols.forEach(c => { cls[`${r},${c}`] = 'gone'; cls[`${r2},${c}`] = 'win'; });
          R.rows.push([round, 'row player', rn[r], rn[r2], cols.map(c => `${f(B[r2][c][0])} > ${f(B[r][c][0])}`).join(', ')]);
          R.snap({ line: ['b'], msg: `For player 1, ${rn[r2]} beats ${rn[r]} in every remaining column (${cols.map(c => `${f(B[r2][c][0])} > ${f(B[r][c][0])}`).join(', ')}). Delete ${rn[r]}.`, bi: bstate(cls) });
          rows = rows.filter(x => x !== r); changed = true; break outer;
        }
      }
      outer2: for (const c of cols) for (const c2 of cols) {
        if (c === c2) continue; R.ops++;
        if (rows.every(r => B[r][c2][1] > B[r][c][1])) {
          const cls = {}; rows.forEach(r => { cls[`${r},${c}`] = 'gone'; cls[`${r},${c2}`] = 'win'; });
          R.rows.push([round, 'column player', cn[c], cn[c2], rows.map(r => `${f(B[r][c2][1])} > ${f(B[r][c][1])}`).join(', ')]);
          R.snap({ line: ['c'], msg: `For player 2, ${cn[c2]} beats ${cn[c]} in every remaining row (${rows.map(r => `${f(B[r][c2][1])} > ${f(B[r][c][1])}`).join(', ')}). Delete ${cn[c]}.`, bi: bstate(cls) });
          cols = cols.filter(x => x !== c); changed = true; break outer2;
        }
      }
    }
    const solved = rows.length === 1 && cols.length === 1;
    R.snap({ line: ['d'], msg: solved ? `Only (${rn[rows[0]]}, ${cn[cols[0]]}) survives, with payoffs (${B[rows[0]][cols[0]].map(f).join(', ')}). The game is <b>dominance solvable</b>; this outcome is its unique Nash equilibrium.` : `Nothing more can be deleted. ${rows.length} × ${cols.length} strategies remain; look for Nash equilibria among them.`, bi: bstate(solved ? { [`${rows[0]},${cols[0]}`]: 'path' } : {}) });
    R.result = { rows, cols, solved };
  }
  function nash(R, { B, rn, cn }) {
    const m = B.length, n = B[0].length, br1 = new Set(), br2 = new Set();
    const bstate = cls => ({ B, rows: B.map((_, i) => i), cols: B[0].map((_, j) => j), rn, cn, cls: Object.assign({}, cls), br1: new Set(br1), br2: new Set(br2) });
    R.snap({ msg: `A Nash equilibrium is a pair of strategies where each is a best response to the other. Mark player 1's best responses (first payoff) and player 2's (second payoff).`, bi: bstate({}) });
    for (let j = 0; j < n; j++) {
      const best = Math.max(...B.map(r => r[j][0])); R.ops += m; const cls = {};
      B.forEach((r, i) => { cls[`${i},${j}`] = 'src'; if (r[j][0] === best) br1.add(`${i},${j}`); });
      const who = B.map((r, i) => r[j][0] === best ? rn[i] : null).filter(Boolean);
      R.rows.push(['row player', cn[j], who.join(', '), f(best)]);
      R.snap({ line: ['a'], msg: `If player 2 plays ${cn[j]}, player 1's payoffs are ${B.map(r => f(r[j][0])).join(', ')}; the best is ${f(best)} with ${who.join(' or ')}.`, bi: bstate(cls) });
    }
    for (let i = 0; i < m; i++) {
      const best = Math.max(...B[i].map(c => c[1])); R.ops += n; const cls = {};
      B[i].forEach((c, j) => { cls[`${i},${j}`] = 'src'; if (c[1] === best) br2.add(`${i},${j}`); });
      const who = B[i].map((c, j) => c[1] === best ? cn[j] : null).filter(Boolean);
      R.rows.push(['column player', rn[i], who.join(', '), f(best)]);
      R.snap({ line: ['b'], msg: `If player 1 plays ${rn[i]}, player 2's payoffs are ${B[i].map(c => f(c[1])).join(', ')}; the best is ${f(best)} with ${who.join(' or ')}.`, bi: bstate(cls) });
    }
    const eq = [...br1].filter(k => br2.has(k)), cls = {}; eq.forEach(k => cls[k] = 'path');
    R.snap({ line: ['c'], msg: eq.length ? `Cells marked by both players: ${eq.map(k => { const [i, j] = k.split(',').map(Number); return `(${rn[i]}, ${cn[j]}) with payoffs (${B[i][j].map(f).join(', ')})`; }).join('; ')}. ${eq.length === 1 ? 'This is the pure Nash equilibrium.' : `There are ${eq.length} pure Nash equilibria.`}` : `No cell is marked twice: there is no pure-strategy Nash equilibrium. (By Nash's theorem a mixed equilibrium always exists.)`, bi: bstate(cls) });
    R.result = { eq };
  }

  /* ---------- Nim ---------- */
  function nim(R, { H }) {
    const h = H.slice(); let mover = 1, move = 0; const xr = a => a.reduce((x, y) => x ^ y, 0);
    const bits = Math.max(1, ...H.map(x => x.toString(2).length));
    const bin = (a, s) => ({ heaps: a.slice(), s, bits });
    let s = xr(h);
    R.snap({ line: ['a'], msg: `Heaps ${h.join(', ')}. The nim-sum is the XOR of the heap sizes, column by column in binary without carries: s = ${h.join(' ⊕ ')} = <b>${s}</b>. ${s ? 'Non-zero: player 1, who moves first, can force a win.' : 'Zero: player 1 loses if player 2 plays perfectly.'}`, heaps: h.slice(), bin: bin(h, s), vars: { 'nim-sum': s, mover: 'player 1' } });
    while (h.some(x => x > 0) && move < 60) {
      move++; s = xr(h); const before = h.join(' '); let i, to;
      if (s) { i = h.findIndex(x => (x ^ s) < x); to = h[i] ^ s; R.ops++; R.snap({ line: ['c'], msg: `Player ${mover}: s = ${s} ≠ 0. Heap ${i + 1} (${h[i]}) has ${h[i]} ⊕ ${s} = ${to} < ${h[i]}, so reduce it to ${to} (take ${h[i] - to}). Afterwards the nim-sum is 0.`, heaps: h.slice(), pick: i, take: h[i] - to, bin: bin(h, s), vars: { 'nim-sum': s, mover: `player ${mover}` } }); }
      else { i = h.indexOf(Math.max(...h)); to = h[i] - 1; R.snap({ line: ['b'], msg: `Player ${mover}: s = 0, so every move gives the opponent a non-zero nim-sum. Take 1 from the largest heap and hope for a mistake.`, heaps: h.slice(), pick: i, take: 1, bin: bin(h, s), vars: { 'nim-sum': 0, mover: `player ${mover}` } }); }
      const took = h[i] - to; h[i] = to; const s2 = xr(h);
      R.rows.push([move, before, s, `player ${mover}`, `take ${took} from heap ${i + 1}`, h.join(' ')]);
      R.snap({ line: ['d'], msg: h.every(x => x === 0) ? `Player ${mover} takes the last object and <b>wins</b>.` : `Heaps are now ${h.join(', ')}; nim-sum ${s2}. Player ${3 - mover} to move.`, heaps: h.slice(), bin: bin(h, s2), vars: { 'nim-sum': s2, mover: `player ${3 - mover}` } });
      if (h.every(x => x === 0)) break;
      mover = 3 - mover;
    }
    R.result = { winner: mover, s0: xr(H), moves: move };
  }

  function run(mode, input) {
    const R = recorder();
    ({ minimax, alphabeta, saddle, graph, dominance, nash, nim })[mode](R, input);
    const r = R.result; let msg;
    if (mode === 'minimax') msg = `Minimax value <b>${f(r.value)}</b>: MAX should move to ${r.move}. All ${r.total} leaves were evaluated; time O(b<sup>d</sup>) for branching factor b and depth d.`;
    else if (mode === 'alphabeta') msg = `Same value <b>${f(r.value)}</b> as minimax (move to ${r.move}), but only ${r.leaves} of ${r.total} leaves were evaluated (${r.pruned} pruned). With the best move ordering, alpha–beta looks at about O(b<sup>d/2</sup>) nodes.`;
    else if (mode === 'saddle') msg = r.saddle ? `Saddle point at (row ${r.at[0] + 1}, column ${r.at[1] + 1}); value <b>${f(r.lo)}</b>.` : `No saddle point: ${f(r.lo)} ≤ v ≤ ${f(r.hi)}. Use mixed strategies (try the 2 × n graphical method).`;
    else if (mode === 'graph') msg = `Row player: (${f(r.p)}, ${f(1 - r.p)}). Value of the game <b>${f(r.value)}</b>.${r.cols && r.cols.length === 2 ? ` Column player: column ${r.cols[0] + 1} with ${f(r.q[r.cols[0]])}, column ${r.cols[1] + 1} with ${f(r.q[r.cols[1]])}.` : ''}`;
    else if (mode === 'dominance') msg = r.solved ? `Iterated elimination leaves a single outcome: (${input.rn[r.rows[0]]}, ${input.cn[r.cols[0]]}).` : `${r.rows.length} rows and ${r.cols.length} columns survive elimination.`;
    else if (mode === 'nash') msg = r.eq.length ? `${r.eq.length} pure Nash equilibri${r.eq.length === 1 ? 'um' : 'a'}: ${r.eq.map(k => { const [i, j] = k.split(',').map(Number); return `(${input.rn[i]}, ${input.cn[j]})`; }).join(', ')}.` : `No pure Nash equilibrium; a mixed one exists.`;
    else msg = `Start nim-sum ${r.s0}: ${r.s0 ? 'the first player wins' : 'the second player wins'} with perfect play. Player ${r.winner} took the last object after ${r.moves} moves.`;
    const last = R.steps[R.steps.length - 1];
    R.steps.push(Object.assign({}, last, R.final || {}, { line: [], msg, final: true, pick: null }));
    return { steps: R.steps, result: r, code: code(mode), header: header(mode) };
  }

  const API = { MODES, run, code, header, f };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GTEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
