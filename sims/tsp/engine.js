/* Travelling-salesman engine: brute force, nearest neighbour, Held–Karp dynamic programming, least-cost branch and bound
   with reduced cost matrices, the MST-based 2-approximation and 2-opt improvement. Cities are 0-based inside and shown
   1-based. D is the n × n cost matrix (it may be asymmetric except for MST and 2-opt). Every tour starts and ends at city 1.
   Works in the browser (window.TSPEngine) and in Node. */
(function (root) {
  const MODES = {
    brute: { name: 'Brute force (try every tour)', short: 'Brute force', group: 'exact' },
    hk: { name: 'Held–Karp dynamic programming', short: 'Dynamic programming', group: 'exact' },
    bnb: { name: 'Branch and bound (reduced cost matrix)', short: 'Branch and bound', group: 'exact' },
    nn: { name: 'Nearest-neighbour heuristic', short: 'Nearest neighbour', group: 'approx' },
    mst: { name: 'MST-based 2-approximation', short: 'MST 2-approx', group: 'approx' },
    twoopt: { name: '2-opt local improvement', short: '2-opt', group: 'approx' }
  };
  const INF = Infinity;
  const f = x => x === INF ? '∞' : x == null ? '·' : x < 0 ? '−' + (-x) : String(x);
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  const T = t => t.map(c => c + 1).join('→');
  const cost = (D, t) => { let s = 0; for (let i = 0; i + 1 < t.length; i++) s += D[t[i]][t[i + 1]]; return s; };
  const setName = (S, n) => { const a = []; for (let k = 0; k < n; k++) if (S & (1 << k)) a.push(k + 1); return '{' + a.join(',') + '}'; };

  function recorder() {
    const R = { steps: [], rows: [], ops: 0 };
    R.snap = o => R.steps.push(Object.assign({ line: [], msg: '', vars: {}, tour: null, best: null, cand: [], mst: null, matrix: null, list: null, tree: null, cur: -1 }, o, { rows: R.rows.map(r => r.slice()), ops: R.ops }));
    return R;
  }
  const mat = (title, v, cls) => ({ title, v: v.map(r => r.slice()), cls: Object.assign({}, cls || {}) });

  function code(mode) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (mode === 'brute') {
      P('BRUTE-FORCE-TSP(D)   ▷ (n − 1)! tours starting at city 1');
      L('a', `best = ∞`);
      L('b', `${kw('for each')} permutation π of cities 2 … n:`);
      L('c', `    c = D[1][π1] + D[π1][π2] + … + D[πn−1][1]`);
      L('d', `    ${kw('if')} c < best:   best = c;   bestTour = (1, π, 1)`);
    } else if (mode === 'nn') {
      P('NEAREST-NEIGHBOUR(D)   ▷ greedy, O(n²)');
      L('a', `tour = (1);   cur = 1`);
      L('b', `${kw('while')} some city is unvisited:`);
      L('c', `    next = the unvisited city v with the smallest D[cur][v]`);
      L('d', `    append next;   cur = next`);
      L('e', `return to city 1`);
    } else if (mode === 'hk') {
      P('HELD-KARP(D)   ▷ g(i, S) = cheapest path from i through all of S, ending at 1');
      L('a', `${kw('for')} i = 2 ${kw('to')} n:   g(i, ∅) = D[i][1]`);
      L('b', `${kw('for')} s = 1 ${kw('to')} n − 2,  ${kw('for each')} S ⊆ {2..n} with |S| = s,  i ∉ S:`);
      L('c', `    g(i, S) = min over j ∈ S of  D[i][j] + g(j, S − {j})`);
      L('d', `OPT = g(1, {2..n}) = min over j of D[1][j] + g(j, {2..n} − {j})`);
      L('e', `follow the stored choices j from g(1, {2..n})`);
    } else if (mode === 'bnb') {
      P('LC-BRANCH-AND-BOUND(D)   ▷ bound = cost of the reduced matrix');
      L('a', `root: reduce every row, then every column, by its minimum;  ĉ(root) = total reduction`);
      L('b', `${kw('loop')}: E = the live node with the smallest ĉ`);
      L('c', `    ${kw('if')} E is a complete tour:  ${kw('return')} it   ${cm('▷ no live node can be cheaper')}`);
      L('d', `    ${kw('for each')} unvisited city j:   child E → j:`);
      L('e', `        copy E's matrix;  row i and column j = ∞;  M[j][1] = ∞`);
      L('f', `        ĉ(child) = ĉ(E) + M_E[i][j] + reduction of the copy`);
    } else if (mode === 'mst') {
      P('APPROX-TSP-TOUR(G)   ▷ CLRS 35.2, metric costs');
      L('a', `T = a minimum spanning tree of G, built by Prim from city 1`);
      L('b', `H = the cities in preorder (DFS) of T`);
      L('c', `${kw('return')} H then back to 1   ${cm('▷ cost ≤ 2 · OPT by the triangle inequality')}`);
    } else if (mode === 'twoopt') {
      P('2-OPT(tour)   ▷ start from the nearest-neighbour tour');
      L('a', `${kw('repeat')}`);
      L('b', `    ${kw('for each')} pair of tour edges (a, b) and (c, d):`);
      L('c', `        Δ = D[a][c] + D[b][d] − D[a][b] − D[c][d]`);
      L('d', `        ${kw('if')} Δ < 0:   reverse the path b … c   ${cm('▷ replaces ab, cd by ac, bd')}`);
      L('e', `${kw('until')} no improving pair exists   ${cm('▷ a 2-opt local optimum')}`);
    }
    return C;
  }
  function header(mode) {
    return ({
      brute: ['#', 'Tour', 'Cost', 'Best so far'], nn: ['Current', 'Candidates', 'Next', 'Running cost'],
      hk: ['Subproblem', 'Candidates D[i][j] + g(j, S − {j})', 'Value', 'Choice j'], bnb: ['Node', 'Path', 'M[i][j] + reduction', 'ĉ', 'Status'],
      mst: ['Phase', 'Detail', 'Cost'], twoopt: ['Pass', 'Remove', 'Add', 'Δ', 'Tour cost']
    })[mode];
  }

  /* ---------- exact ---------- */
  function brute(R, D) {
    const n = D.length, rest = []; for (let i = 1; i < n; i++) rest.push(i);
    let best = INF, bestT = null, k = 0;
    R.snap({ line: ['a'], msg: `${n} cities: there are (n − 1)! = ${fact(n - 1)} tours that start and end at city 1. Try them all.`, vars: { n, tours: fact(n - 1) }, matrix: mat('Cost matrix D', D) });
    (function perm(arr, l) {
      if (l === arr.length) {
        const t = [0, ...arr, 0], c = cost(D, t); k++; R.ops += n;
        const better = c < best; if (better) { best = c; bestT = t.slice(); }
        R.rows.push([k, T(t), c, best]);
        R.snap({ line: ['b', 'c', 'd'], tour: t, best: bestT, msg: `Tour ${k}: ${T(t)} costs ${t.slice(0, -1).map((a, i) => D[a][t[i + 1]]).join(' + ')} = <b>${c}</b>. ${better ? 'New best.' : `Best stays ${best}.`}`, vars: { tour: k, cost: c, best } });
        return;
      }
      for (let i = l; i < arr.length; i++) { [arr[l], arr[i]] = [arr[i], arr[l]]; perm(arr, l + 1); [arr[l], arr[i]] = [arr[i], arr[l]]; }
    })(rest, 0);
    R.result = { cost: best, tour: bestT };
  }
  function fact(n) { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; }

  function hk(R, D) {
    const n = D.length, g = {}, ch = {}, list = [];
    const key = (i, S) => i + ':' + S;
    const nm = (i, S) => `g(${i + 1}, ${S ? setName(S, n) : '∅'})`;
    R.snap({ msg: `Held–Karp. g(i, S) is the cheapest way to start at city i, visit every city in S once, and finish at city 1. There are about n·2ⁿ such subproblems.`, vars: { n }, matrix: mat('Cost matrix D', D), list: [] });
    for (let i = 1; i < n; i++) {
      g[key(i, 0)] = D[i][0]; R.ops++; list.push({ name: nm(i, 0), val: D[i][0], how: `D[${i + 1}][1]`, s: 0 });
      R.rows.push([nm(i, 0), `D[${i + 1}][1]`, D[i][0], '—']);
      R.snap({ line: ['a'], msg: `${nm(i, 0)} = D[${i + 1}][1] = <b>${D[i][0]}</b>: from city ${i + 1} go straight back to 1.`, vars: { i: i + 1, '|S|': 0 }, matrix: mat('Cost matrix D', D, { [`${i},0`]: 'new' }), list: list.slice(), tour: [i, 0] });
    }
    const full = ((1 << n) - 1) & ~1;
    const subsets = []; for (let S = 2; S <= full; S += 2) subsets.push(S);
    const pc = S => { let c = 0; while (S) { c += S & 1; S >>= 1; } return c; };
    for (let s = 1; s <= n - 2; s++) for (const S of subsets.filter(x => pc(x) === s)) for (let i = 1; i < n; i++) {
      if (S & (1 << i)) continue;
      let best = INF, bj = -1; const cands = [], cls = {};
      for (let j = 1; j < n; j++) if (S & (1 << j)) { const v = D[i][j] + g[key(j, S & ~(1 << j))]; R.ops++; cands.push(`${D[i][j]} + ${g[key(j, S & ~(1 << j))]} = ${v}`); cls[`${i},${j}`] = 'src'; if (v < best) { best = v; bj = j; } }
      cls[`${i},${bj}`] = 'new';
      g[key(i, S)] = best; ch[key(i, S)] = bj; list.push({ name: nm(i, S), val: best, how: `via ${bj + 1}`, s });
      R.rows.push([nm(i, S), cands.join(';  '), best, bj + 1]);
      R.snap({ line: ['b', 'c'], msg: `${nm(i, S)}: try each j in ${setName(S, n)} first. ${cands.map((c, k) => c).join(', ')}. Minimum <b>${best}</b> via city ${bj + 1}.`, vars: { i: i + 1, S: setName(S, n), '|S|': s, value: best }, matrix: mat('Cost matrix D', D, cls), list: list.slice(), tour: [i, bj] });
    }
    let best = INF, bj = -1; const cands = [], cls = {};
    for (let j = 1; j < n; j++) { const v = D[0][j] + g[key(j, full & ~(1 << j))]; R.ops++; cands.push(`${D[0][j]} + ${g[key(j, full & ~(1 << j))]} = ${v}`); cls[`0,${j}`] = 'src'; if (v < best) { best = v; bj = j; } }
    cls[`0,${bj}`] = 'new'; ch[key(0, full)] = bj; list.push({ name: nm(0, full), val: best, how: `via ${bj + 1}`, s: n - 1, top: true });
    R.rows.push([nm(0, full), cands.join(';  '), best, bj + 1]);
    R.snap({ line: ['d'], msg: `${nm(0, full)} = min(${cands.join(', ')}) = <b>${best}</b>, first move to city ${bj + 1}.`, vars: { OPT: best }, matrix: mat('Cost matrix D', D, cls), list: list.slice() });
    const tour = [0]; let i = 0, S = full;
    while (S) { const j = ch[key(i, S)]; tour.push(j); S &= ~(1 << j); i = j; R.snap({ line: ['e'], msg: `From ${nm(tour[tour.length - 2], S | (1 << j))} the stored choice is city ${j + 1}.`, vars: { tour: T(tour) }, matrix: mat('Cost matrix D', D), list: list.slice(), tour: tour.slice() }); }
    tour.push(0);
    R.result = { cost: best, tour, entries: list.length };
  }

  function reduce(M) {
    const n = M.length; let red = 0; const rmin = [], cmin = [];
    for (let i = 0; i < n; i++) { const m = Math.min(...M[i]); rmin.push(m === INF ? 0 : m); if (m !== INF && m > 0) { red += m; for (let j = 0; j < n; j++) if (M[i][j] !== INF) M[i][j] -= m; } }
    for (let j = 0; j < n; j++) { let m = INF; for (let i = 0; i < n; i++) m = Math.min(m, M[i][j]); cmin.push(m === INF ? 0 : m); if (m !== INF && m > 0) { red += m; for (let i = 0; i < n; i++) if (M[i][j] !== INF) M[i][j] -= m; } }
    return { red, rmin, cmin };
  }
  function bnb(R, D) {
    const n = D.length, nodes = [];
    const M0 = D.map((r, i) => r.map((v, j) => i === j ? INF : v));
    R.snap({ line: [], msg: `Least-cost branch and bound. Each node of the state-space tree holds a reduced cost matrix; its bound ĉ is a lower bound on every tour below it. Diagonal entries are ∞.`, vars: { n }, matrix: mat('Cost matrix (diagonal = ∞)', M0) });
    const M = M0.map(r => r.slice()), rr = reduce(M);
    nodes.push({ id: 0, parent: -1, city: 0, path: [0], M, c: rr.red, st: 'live', label: '1' });
    R.rows.push([1, '1', `row ${rr.rmin.map(f).join('+')}, col ${rr.cmin.map(f).join('+')}`, rr.red, 'live']);
    R.snap({ line: ['a'], msg: `Root: subtract each row's minimum (${rr.rmin.map(f).join(' + ')}) and then each column's minimum (${rr.cmin.map(f).join(' + ')}). Every tour costs at least ĉ = <b>${rr.red}</b>.`, vars: { 'ĉ(root)': rr.red }, matrix: mat('Reduced matrix of node 1', M), tree: snapTree(nodes), cur: 0 });
    let guard = 0;
    while (guard++ < 400) {
      const live = nodes.filter(x => x.st === 'live'); if (!live.length) break;
      const E = live.reduce((a, b) => b.c < a.c ? b : a);
      if (E.path.length === n) {
        E.st = 'sol'; const tour = [...E.path, 0];
        R.rows.push([E.id + 1, T(E.path), '—', E.c, 'answer']);
        R.snap({ line: ['b', 'c'], msg: `Node ${E.id + 1} has the smallest bound (${E.c}) and is a complete tour ${T(tour)}. Every other live node has ĉ ≥ ${E.c}, so this tour is optimal.`, vars: { 'E': E.id + 1, cost: E.c }, matrix: mat(`Reduced matrix of node ${E.id + 1}`, E.M), tree: snapTree(nodes), cur: E.id, tour, best: tour });
        R.result = { cost: E.c, tour, nodes: nodes.length };
        return;
      }
      E.st = 'done';
      R.snap({ line: ['b'], msg: `Expand the live node with the least bound: node ${E.id + 1} (path ${T(E.path)}, ĉ = ${E.c}).`, vars: { E: E.id + 1, 'ĉ(E)': E.c }, matrix: mat(`Reduced matrix of node ${E.id + 1}`, E.M), tree: snapTree(nodes), cur: E.id, tour: E.path.slice() });
      const i = E.city;
      for (let j = 0; j < n; j++) {
        if (E.path.includes(j)) continue;
        const C = E.M.map(r => r.slice()), edge = E.M[i][j], cls = {};
        for (let k = 0; k < n; k++) { C[i][k] = INF; C[k][j] = INF; cls[`${i},${k}`] = 'gone'; cls[`${k},${j}`] = 'gone'; }
        C[j][0] = INF; cls[`${j},0`] = 'gone';
        const r = reduce(C); R.ops++;
        const c = E.c + edge + r.red, id = nodes.length;
        nodes.push({ id, parent: E.id, city: j, path: [...E.path, j], M: C, c, st: 'live', label: `${j + 1}` });
        R.rows.push([id + 1, T([...E.path, j]), `${f(edge)} + ${r.red}`, c, 'live']);
        R.snap({ line: ['d', 'e', 'f'], msg: `Child node ${id + 1}: edge ${i + 1}→${j + 1}. Set row ${i + 1}, column ${j + 1} and M[${j + 1}][1] to ∞, then reduce (reduction ${r.red}). ĉ = ${E.c} + M[${i + 1}][${j + 1}] (${f(edge)}) + ${r.red} = <b>${c}</b>.`, vars: { E: E.id + 1, j: j + 1, 'ĉ(child)': c }, matrix: mat(`Matrix of node ${id + 1} after reduction`, C, Object.fromEntries(Object.keys(cls).filter(k => C[+k.split(',')[0]][+k.split(',')[1]] === INF).map(k => [k, 'gone']))), tree: snapTree(nodes), cur: id, tour: [...E.path, j] });
      }
    }
  }
  const snapTree = nodes => nodes.map(x => ({ id: x.id, parent: x.parent, label: x.label, c: x.c, st: x.st }));

  /* ---------- approximate ---------- */
  function nn(R, D) {
    const n = D.length, seen = Array(n).fill(false), tour = [0]; seen[0] = true; let cur = 0, total = 0;
    R.snap({ line: ['a'], msg: `Start at city 1 and always travel to the nearest city not visited yet.`, vars: { cur: 1 }, matrix: mat('Cost matrix D', D), tour: [0] });
    for (let step = 1; step < n; step++) {
      let best = INF, nx = -1; const cls = {}, cands = [];
      for (let v = 0; v < n; v++) if (!seen[v]) { R.ops++; cls[`${cur},${v}`] = 'src'; cands.push(`${v + 1}:${D[cur][v]}`); if (D[cur][v] < best) { best = D[cur][v]; nx = v; } }
      cls[`${cur},${nx}`] = 'new';
      R.snap({ line: ['b', 'c'], msg: `From city ${cur + 1}, the unvisited cities cost ${cands.join(', ')}. The nearest is city ${nx + 1} (${best}).`, vars: { cur: cur + 1, next: nx + 1, cost: total }, matrix: mat('Cost matrix D', D, cls), tour: tour.slice(), cand: [[cur, nx]] });
      seen[nx] = true; tour.push(nx); total += best;
      R.rows.push([cur + 1, cands.join(', '), nx + 1, total]);
      R.snap({ line: ['d'], msg: `Go to city ${nx + 1}. Running cost ${total}.`, vars: { cur: nx + 1, cost: total }, matrix: mat('Cost matrix D', D, { [`${cur},${nx}`]: 'new' }), tour: tour.slice() });
      cur = nx;
    }
    total += D[cur][0]; tour.push(0); R.rows.push([cur + 1, `1:${D[cur][0]}`, 1, total]);
    R.snap({ line: ['e'], msg: `Every city is visited; return to city 1 (${D[cur][0]}). Tour cost <b>${total}</b>.`, vars: { cost: total }, matrix: mat('Cost matrix D', D, { [`${cur},0`]: 'new' }), tour: tour.slice(), best: tour.slice() });
    R.result = { cost: total, tour };
  }
  function mst(R, D) {
    const n = D.length, inT = Array(n).fill(false), key = Array(n).fill(INF), par = Array(n).fill(-1), edges = [];
    key[0] = 0; let w = 0;
    R.snap({ line: ['a'], msg: `Build a minimum spanning tree with Prim's algorithm from city 1. Its weight is a lower bound on the optimal tour (delete one edge of a tour and you get a spanning tree).`, vars: {}, matrix: mat('Cost matrix D', D), mst: [] });
    for (let it = 0; it < n; it++) {
      let u = -1; for (let v = 0; v < n; v++) if (!inT[v] && (u < 0 || key[v] < key[u])) u = v;
      inT[u] = true; if (par[u] >= 0) { edges.push([par[u], u]); w += D[par[u]][u]; R.rows.push(['MST', `add edge ${par[u] + 1}–${u + 1} (${D[par[u]][u]})`, w]); R.snap({ line: ['a'], msg: `Add the cheapest edge leaving the tree: ${par[u] + 1}–${u + 1} with cost ${D[par[u]][u]}. Tree weight ${w}.`, vars: { 'MST weight': w }, matrix: mat('Cost matrix D', D, { [`${par[u]},${u}`]: 'new' }), mst: edges.map(e => e.slice()), cand: [[par[u], u]] }); }
      for (let v = 0; v < n; v++) if (!inT[v] && D[u][v] < key[v]) { key[v] = D[u][v]; par[v] = u; R.ops++; }
    }
    const kids = Array.from({ length: n }, () => []); edges.forEach(([a, b]) => kids[a].push(b)); kids.forEach(k => k.sort((a, b) => a - b));
    const order = []; (function dfs(u) { order.push(u); kids[u].forEach(dfs); })(0);
    for (let k = 1; k <= n; k++) R.snap({ line: ['b'], msg: `Preorder walk of the tree: visit ${order.slice(0, k).map(c => c + 1).join(', ')}${k < n ? ' …' : ''}. Cities already seen are skipped (shortcuts).`, vars: { 'MST weight': w }, matrix: mat('Cost matrix D', D), mst: edges.map(e => e.slice()), tour: order.slice(0, k) });
    const tour = [...order, 0], c = cost(D, tour);
    R.rows.push(['Tour', `preorder ${T(tour)}`, c]);
    R.snap({ line: ['c'], msg: `Tour ${T(tour)} costs <b>${c}</b> ≤ 2 × MST weight = ${2 * w}. With metric costs the optimum is at least ${w}, so this tour is at most twice optimal.`, vars: { 'MST weight': w, tour: c }, matrix: mat('Cost matrix D', D), mst: edges.map(e => e.slice()), tour, best: tour });
    R.result = { cost: c, tour, mstW: w };
  }
  function twoopt(R, D) {
    const n = D.length; // start from nearest neighbour
    const seen = Array(n).fill(false), t = [0]; seen[0] = true;
    for (let s = 1; s < n; s++) { const cur = t[t.length - 1]; let nx = -1; for (let v = 0; v < n; v++) if (!seen[v] && (nx < 0 || D[cur][v] < D[cur][nx])) nx = v; seen[nx] = true; t.push(nx); }
    t.push(0); let c = cost(D, t), pass = 0;
    R.snap({ line: ['a'], msg: `Start from the nearest-neighbour tour ${T(t)} with cost ${c}. 2-opt removes two edges and reconnects the tour the other way whenever that is cheaper.`, vars: { cost: c }, matrix: mat('Cost matrix D', D), tour: t.slice(), best: t.slice() });
    let improved = true;
    while (improved && pass < 50) {
      improved = false; pass++;
      for (let i = 0; i < n - 1 && !improved; i++) for (let k = i + 2; k < n && !improved; k++) {
        if (i === 0 && k === n - 1) continue;
        const a = t[i], b = t[i + 1], cc = t[k], d = t[k + 1]; R.ops++;
        const delta = D[a][cc] + D[b][d] - D[a][b] - D[cc][d];
        if (delta < 0) {
          R.snap({ line: ['b', 'c'], msg: `Edges ${a + 1}–${b + 1} and ${cc + 1}–${d + 1} cost ${D[a][b] + D[cc][d]}; ${a + 1}–${cc + 1} and ${b + 1}–${d + 1} cost ${D[a][cc] + D[b][d]}. Δ = <b>${delta}</b> < 0: improve.`, vars: { pass, 'Δ': delta, cost: c }, matrix: mat('Cost matrix D', D, { [`${a},${b}`]: 'gone', [`${cc},${d}`]: 'gone', [`${a},${cc}`]: 'new', [`${b},${d}`]: 'new' }), tour: t.slice(), cand: [[a, cc], [b, d]], drop: [[a, b], [cc, d]] });
          const seg = t.slice(i + 1, k + 1).reverse(); t.splice(i + 1, seg.length, ...seg); c += delta; improved = true;
          R.rows.push([pass, `${a + 1}–${b + 1}, ${cc + 1}–${d + 1}`, `${a + 1}–${cc + 1}, ${b + 1}–${d + 1}`, delta, c]);
          R.snap({ line: ['d'], msg: `Reverse the path between them. New tour ${T(t)}, cost <b>${c}</b>.`, vars: { pass, cost: c }, matrix: mat('Cost matrix D', D), tour: t.slice(), best: t.slice() });
        }
      }
    }
    R.snap({ line: ['e'], msg: `No pair of edges can be exchanged profitably: the tour is 2-opt optimal (a local optimum, not necessarily the global one).`, vars: { cost: c }, matrix: mat('Cost matrix D', D), tour: t.slice(), best: t.slice() });
    R.result = { cost: c, tour: t.slice() };
  }

  function run(mode, input) {
    const D = input.D, R = recorder();
    ({ brute, hk, bnb, nn, mst, twoopt })[mode](R, D);
    const r = R.result, n = D.length; let msg;
    if (mode === 'brute') msg = `Optimal tour <b>${T(r.tour)}</b>, cost <b>${r.cost}</b>, after checking all ${fact(n - 1)} tours: Θ(n!) time.`;
    else if (mode === 'hk') msg = `Optimal tour <b>${T(r.tour)}</b>, cost <b>${r.cost}</b>, from ${r.entries} table entries. Θ(n²·2ⁿ) time and Θ(n·2ⁿ) space: exponential, but far better than n!.`;
    else if (mode === 'bnb') msg = `Optimal tour <b>${T(r.tour)}</b>, cost <b>${r.cost}</b>. Only ${r.nodes} nodes were generated; the bound pruned the rest of the (n − 1)! = ${fact(n - 1)} leaves.`;
    else if (mode === 'nn') msg = `Nearest-neighbour tour <b>${T(r.tour)}</b>, cost <b>${r.cost}</b>. Fast (O(n²)) but with no constant-factor guarantee.`;
    else if (mode === 'mst') msg = `Tour <b>${T(r.tour)}</b>, cost <b>${r.cost}</b> ≤ 2 × ${r.mstW}. O(n²) with Prim on a complete graph.`;
    else msg = `2-opt tour <b>${T(r.tour)}</b>, cost <b>${r.cost}</b>.`;
    const last = R.steps[R.steps.length - 1];
    R.steps.push(Object.assign({}, last, { line: [], msg, final: true, cand: [], drop: null, tour: r.tour, best: r.tour }));
    return { steps: R.steps, result: r, code: code(mode), header: header(mode) };
  }

  const API = { MODES, run, code, header, f, cost };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.TSPEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
