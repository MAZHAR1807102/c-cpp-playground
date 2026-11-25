/* Search engine for the search simulation: parses a small weighted graph and records every step of
   blind search (BFS, DFS, UCS, DLS, IDS, bidirectional) and heuristic search (greedy, A*, hill climbing).
   Works in the browser (window.SearchEngine) and in Node (module.exports) so the traces can be tested. */
(function (root) {
  const MAX_STEPS = 900;
  const NAME = /^[A-Za-z][A-Za-z0-9]{0,3}$/;

  const ALGS = {
    bfs: { name: 'Breadth-first search', short: 'BFS', kind: 'blind' },
    dfs: { name: 'Depth-first search', short: 'DFS', kind: 'blind' },
    ucs: { name: 'Uniform-cost search', short: 'UCS', kind: 'blind' },
    dls: { name: 'Depth-limited search', short: 'DLS', kind: 'blind' },
    ids: { name: 'Iterative deepening search', short: 'IDS', kind: 'blind' },
    bid: { name: 'Bidirectional search', short: 'Bidirectional', kind: 'blind' },
    gbf: { name: 'Greedy best-first search', short: 'Greedy', kind: 'heur' },
    ast: { name: 'A* search', short: 'A*', kind: 'heur' },
    hc: { name: 'Hill climbing', short: 'Hill climbing', kind: 'heur' }
  };

  // ---------- parsing ----------
  function parseGraph(edgeText, hText, directed) {
    const lines = edgeText.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return { error: 'Type at least one edge, for example S A 1.' };
    const nodes = [], adj = {}, radj = {}, edges = [];
    const addNode = n => { if (!adj[n]) { adj[n] = []; radj[n] = []; nodes.push(n); } };
    for (const ln of lines) {
      const t = ln.split(/\s+/);
      if (t.length < 2 || t.length > 3) return { error: `“${ln}” is not an edge. Write two node names and a cost, like S A 1.` };
      const [a, b] = t, c = t.length === 3 ? Number(t[2]) : 1;
      if (!NAME.test(a) || !NAME.test(b)) return { error: `In “${ln}”: node names are 1 to 4 letters or digits, starting with a letter.` };
      if (a === b) return { error: `In “${ln}”: an edge from a node to itself is not allowed.` };
      if (!(c > 0 && c <= 9999)) return { error: `In “${ln}”: the cost must be a number above 0 (at most 9999).` };
      addNode(a); addNode(b);
      const put = (L, u, v) => { const e = L[u].find(x => x.v === v); if (e) e.c = c; else L[u].push({ v, c }); };
      put(adj, a, b); put(radj, b, a);
      if (!directed) { put(adj, b, a); put(radj, a, b); }
      const old = edges.find(e => (e.a === a && e.b === b) || (!directed && e.a === b && e.b === a));
      if (old) old.c = c; else edges.push({ a, b, c });
    }
    if (nodes.length > 16) return { error: `That graph has ${nodes.length} nodes. Use at most 16 so the steps stay easy to follow.` };
    if (edges.length > 30) return { error: `That graph has ${edges.length} edges. Use at most 30.` };
    const byName = (x, y) => x.v < y.v ? -1 : x.v > y.v ? 1 : 0;
    nodes.forEach(n => { adj[n].sort(byName); radj[n].sort(byName); });
    const h = {}, hMissing = [];
    const toks = (hText || '').split(/[\s,;]+/).filter(Boolean);
    for (const tk of toks) {
      const m = tk.match(/^([A-Za-z][A-Za-z0-9]{0,3})[=:](-?\d+(?:\.\d+)?)$/);
      if (!m) return { error: `“${tk}” is not a heuristic value. Write NAME=value, like A=6.` };
      if (!adj[m[1]]) return { error: `h is given for ${m[1]}, but no edge uses ${m[1]}.` };
      if (Number(m[2]) < 0) return { error: `h(${m[1]}) is negative. Heuristic values must be 0 or more.` };
      h[m[1]] = Number(m[2]);
    }
    nodes.forEach(n => { if (!(n in h)) hMissing.push(n); });
    return { nodes, adj, radj, edges, h, hMissing, directed: !!directed };
  }

  // ---------- reference answers ----------
  function dijkstra(G, src, rev) {
    const L = rev ? G.radj : G.adj, dist = {}, par = {}, done = new Set();
    G.nodes.forEach(n => dist[n] = Infinity); dist[src] = 0;
    for (;;) {
      let u = null;
      G.nodes.forEach(n => { if (!done.has(n) && dist[n] < Infinity && (u === null || dist[n] < dist[u])) u = n; });
      if (u === null) break;
      done.add(u);
      L[u].forEach(({ v, c }) => { if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; par[v] = u; } });
    }
    return { dist, par };
  }
  function optimal(G, s, t) {
    const { dist, par } = dijkstra(G, s, false);
    if (dist[t] === Infinity) return null;
    const p = [t]; while (p[0] !== s) p.unshift(par[p[0]]);
    return { cost: dist[t], path: p };
  }
  function checkH(G, goal) {
    const hs = dijkstra(G, goal, true).dist, over = [], incons = [];
    G.nodes.forEach(n => { const hv = G.h[n] || 0; if (hs[n] < Infinity && hv > hs[n] + 1e-9) over.push({ n, h: hv, hs: hs[n] }); });
    G.nodes.forEach(u => G.adj[u].forEach(({ v, c }) => { const hu = G.h[u] || 0, hv = G.h[v] || 0; if (hu > c + hv + 1e-9) incons.push({ u, v, c, hu, hv }); }));
    return { hStar: hs, admissible: !over.length, over, consistent: !incons.length, incons, goalZero: !(G.h[goal] > 0) };
  }

  // ---------- recorder ----------
  const TOO_MANY = {};
  const num = x => Math.round(x * 100) / 100;
  function recorder(G, alg) {
    const R = {
      steps: [], tree: [], front: [], closed: new Set(), closedB: new Set(), rows: [],
      exp: 0, gen: 0, maxF: 0, cur: null, path: null, result: null, view: 'queue', key: null, frontName: 'Frontier'
    };
    R.add = (s, par, g, side) => {
      const nd = { id: R.tree.length, s, p: par ? par.id : null, g: num(g), d: par ? par.d + 1 : 0, h: G.h[s] || 0, st: 'front', side: side || 'f' };
      nd.f = num(nd.g + nd.h);
      R.tree.push(nd); R.gen++; return nd;
    };
    R.select = n => { R.tree.forEach(x => { if (x.st === 'cur') x.st = 'closed'; }); n.st = 'cur'; R.cur = n.s; };
    R.close = (n, side) => { (side === 'b' ? R.closedB : R.closed).add(n.s); R.exp++; };
    R.popMin = () => {
      let bi = 0;
      R.front.forEach((x, i) => { const a = R.key(x), b = R.key(R.front[bi]); if (a < b || (a === b && x.id < R.front[bi].id)) bi = i; });
      return R.front.splice(bi, 1)[0];
    };
    R.chain = n => { const p = []; for (let x = n; x; x = x.p === null ? null : R.tree[x.p]) p.unshift(x); return p; };
    R.view_ = () => {
      const f = R.front.map(x => Object.assign({}, x));
      if (R.view === 'stack') f.reverse();
      if (R.view === 'pq') f.sort((a, b) => R.key(a) - R.key(b) || a.id - b.id);
      return f;
    };
    R.snap = o => {
      R.maxF = Math.max(R.maxF, R.front.length);
      R.steps.push(Object.assign({
        line: [], msg: '', cur: R.cur, front: R.view_(), frontName: R.frontName, closed: [...R.closed], closedB: [...R.closedB],
        tree: R.tree.map(x => Object.assign({}, x)), path: R.path ? R.path.slice() : null, rows: R.rows.map(r => r.slice()),
        st: { exp: R.exp, gen: R.gen, maxF: R.maxF }, vars: {}, hot: null
      }, o));
      if (R.steps.length > MAX_STEPS) throw TOO_MANY;
    };
    R.done = (n, line, msg, extraChain) => {
      const ch = R.chain(n);
      ch.forEach(x => x.st = 'path');
      let path = ch.map(x => x.s), cost = n.g;
      if (extraChain) { extraChain.forEach(x => x.st = 'path'); path = path.concat(extraChain.map(x => x.s).reverse().slice(1)); cost = num(n.g + extraChain[extraChain.length - 1].g); }
      R.path = path; R.cur = null;
      R.result = { status: 'found', path, cost };
      R.snap({ line, msg });
    };
    R.fail = (line, msg, status) => { R.result = { status: status || 'fail' }; R.cur = null; R.snap({ line, msg }); };
    return R;
  }
  const names = L => L.length ? L.join(', ') : '—';
  const pathStr = p => p.join('–');

  // ---------- pseudocode ----------
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  function code(alg, o) {
    const C = [], P = t => C.push({ proc: t }), L = (key, text) => C.push({ key, text });
    if (alg === 'bfs') {
      P('BFS(start, goal)   ▷ graph search, FIFO queue');
      L('b1', `frontier ← queue(start);  explored ← ∅`);
      L('b2', `${kw('loop')}`);
      L('b3', `  ${kw('if')} frontier is empty ${kw('then return')} failure`);
      L('b4', `  node ← POP-FRONT(frontier)   ${cm('▷ shallowest')}`);
      L('b5', o.early ? `  ${cm('▷ goal test is done on generation')}` : `  ${kw('if')} node = goal ${kw('then return')} path(node)`);
      L('b6', `  add node to explored`);
      L('b7', `  ${kw('for each')} child ${kw('of')} node   ${cm('▷ alphabetical')}`);
      L('b8', `    ${kw('if')} child ∉ explored ${kw('and')} child ∉ frontier`);
      if (o.early) L('b8g', `      ${kw('if')} child = goal ${kw('then return')} path(child)`);
      L('b9', `      add child to the BACK of frontier`);
    } else if (alg === 'dfs') {
      P('DFS(start, goal)   ▷ LIFO stack, visited set');
      L('d1', `stack ← [start];  visited ← ∅`);
      L('d2', `${kw('while')} stack is not empty`);
      L('d3', `  node ← POP(stack)   ${cm('▷ deepest: last pushed')}`);
      L('d4', `  ${kw('if')} node ∈ visited ${kw('then continue')}`);
      L('d5', `  add node to visited`);
      L('d6', `  ${kw('if')} node = goal ${kw('then return')} path(node)`);
      L('d7', `  ${kw('for each')} child ${kw('in')} REVERSE(children(node))`);
      L('d8', `    ${kw('if')} child ∉ visited ${kw('then')} PUSH(stack, child)`);
      L('d9', `${kw('return')} failure`);
    } else if (alg === 'ucs') {
      P('UCS(start, goal)   ▷ priority queue on g(n)');
      L('u1', `frontier ← {start} with g = 0;  explored ← ∅`);
      L('u2', `${kw('loop')}`);
      L('u3', `  ${kw('if')} frontier is empty ${kw('then return')} failure`);
      L('u4', `  node ← POP-LOWEST-g(frontier)`);
      L('u5', `  ${kw('if')} node = goal ${kw('then return')} path(node)  ${cm('▷ on selection')}`);
      L('u6', `  add node to explored`);
      L('u7', `  ${kw('for each')} child, step cost c:  g′ ← g(node) + c`);
      L('u8', `    ${kw('if')} child ∉ explored ∪ frontier ${kw('then')} add it with g′`);
      L('u9', `    ${kw('else if')} child ∈ frontier ${kw('and')} g′ < g(child)`);
      L('u10', `      replace it: g(child) ← g′, parent ← node`);
    } else if (alg === 'dls' || alg === 'ids') {
      if (alg === 'ids') {
        P('IDS(start, goal)');
        L('i1', `${kw('for')} ℓ ← 0, 1, 2, …`);
        L('i2', `  result ← DLS(start, ℓ)`);
        L('i3', `  ${kw('if')} result ≠ cutoff ${kw('then return')} result`);
      }
      P(`DLS(node, ℓ)   ▷ recursive depth-first${alg === 'dls' ? `, ℓ = ${o.limit}` : ''}`);
      L('l1', `${kw('if')} node = goal ${kw('then return')} node`);
      L('l2', `${kw('if')} ℓ = 0 ${kw('then return')} cutoff`);
      L('l3', `cutoff_occurred ← false`);
      L('l4', `${kw('for each')} child ${kw('of')} node ${kw('not on')} the current path`);
      L('l5', `  result ← DLS(child, ℓ − 1)`);
      L('l6', `  ${kw('if')} result = cutoff ${kw('then')} cutoff_occurred ← true`);
      L('l7', `  ${kw('else if')} result ≠ failure ${kw('then return')} result`);
      L('l8', `${kw('return')} cutoff ${kw('if')} cutoff_occurred ${kw('else')} failure`);
    } else if (alg === 'bid') {
      P('BIDIRECTIONAL(start, goal)   ▷ two BFS');
      L('x1', `Ff ← queue(start);  Fb ← queue(goal)`);
      L('x2', `reachedF ← {start};  reachedB ← {goal}`);
      L('x3', `${kw('while')} Ff ${kw('and')} Fb are not empty`);
      L('x4', `  expand the front node of Ff   ${cm('▷ successors')}`);
      L('x5', `  ${kw('if')} a new node ∈ reachedB ${kw('then return')} join`);
      L('x6', `  expand the front node of Fb   ${cm('▷ predecessors')}`);
      L('x7', `  ${kw('if')} a new node ∈ reachedF ${kw('then return')} join`);
      L('x8', `${kw('return')} failure`);
    } else if (alg === 'gbf' || alg === 'ast') {
      const A = alg === 'ast';
      P(`BEST-FIRST(start, goal)   ▷ f(n) = ${A ? 'g(n) + h(n)' : 'h(n)'}`);
      L('f1', `OPEN ← {start};  CLOSED ← ∅`);
      L('f2', `${kw('loop')}`);
      L('f3', `  ${kw('if')} OPEN is empty ${kw('then return')} failure`);
      L('f4', `  n ← node in OPEN with lowest f;  move n to CLOSED`);
      L('f5', `  ${kw('if')} n = goal ${kw('then return')} path(n)`);
      L('f6', `  ${kw('for each')} successor m ${kw('of')} n`);
      L('f7', A ? `    g(m) ← g(n) + c(n, m);  f(m) ← g(m) + h(m)` : `    f(m) ← h(m)   ${cm('▷ g is ignored')}`);
      L('f8', `    ${kw('if')} m ∉ OPEN ∪ CLOSED ${kw('then')} parent(m) ← n; add m to OPEN`);
      L('f9', `    ${kw('else if')} new f(m) is lower ${kw('then')} update f, parent`);
      L('f10', `      ${cm('(if m was in CLOSED, move it back to OPEN)')}`);
    } else if (alg === 'hc') {
      P('HILL-CLIMBING(start, goal)   ▷ steepest descent on h');
      L('h1', `current ← start`);
      L('h2', `${kw('loop')}`);
      L('h3', `  ${kw('if')} current = goal ${kw('then return')} success`);
      L('h4', `  next ← neighbour of current with the lowest h`);
      L('h5', `  ${kw('if')} h(next) ≥ h(current) ${kw('then return')} failure  ${cm('▷ stuck')}`);
      L('h6', `  current ← next`);
    }
    return C;
  }

  // trace table columns per algorithm
  function header(alg) {
    if (alg === 'dls' || alg === 'ids') return ['Limit ℓ', 'Nodes visited (in order)', 'Result'];
    if (alg === 'hc') return ['Step', 'Current (h)', 'Neighbours (h)', 'Move'];
    if (alg === 'bid') return ['Step', 'Side', 'Expanded', 'Forward frontier', 'Backward frontier', 'Note'];
    if (alg === 'dfs') return ['Step', 'Popped', 'Stack after (top first)', 'Visited', 'Note'];
    if (alg === 'gbf' || alg === 'ast') return ['Step', 'Expand', 'OPEN after (lowest f first)', 'CLOSED', 'Note'];
    return ['Step', 'Expanded', 'Frontier after', 'Explored', 'Note'];
  }

  // ---------- algorithms ----------
  function bfs(R, G, o) {
    const { start, goal, early } = o;
    R.view = 'queue'; R.frontName = 'Frontier (FIFO queue, front first)';
    const root = R.add(start, null, 0); R.front.push(root);
    R.snap({ line: ['b1'], msg: `Put the start <b>${start}</b> in the FIFO queue; the explored set is empty. ${early ? 'The goal test is done when a node is <b>generated</b> (saves one level of work).' : 'The goal test is done when a node is <b>taken out</b> of the queue, as in the lecture table.'}` });
    if (early && start === goal) return R.done(root, ['b1'], `The start is the goal.`);
    let k = 0;
    for (;;) {
      if (!R.front.length) return R.fail(['b3'], `The queue is empty: no path from ${start} to ${goal}.`);
      const n = R.front.shift(); R.select(n); k++;
      if (!early && n.s === goal) {
        R.exp++;
        R.rows.push([k, n.s, names(R.front.map(x => x.s)), names([...R.closed]), 'goal: stop']);
        return R.done(n, ['b4', 'b5'], `Take <b>${goal}</b> from the front of the queue. It is the goal: stop and follow the parent links back to ${start}.`);
      }
      R.snap({ line: ['b2', 'b3', 'b4', 'b5'], vars: { node: n.s, depth: n.d }, msg: `Take <b>${n.s}</b> from the front of the queue: the shallowest node waiting (depth ${n.d}). It is not the goal.` });
      R.close(n);
      const add = [], skip = [];
      for (const { v, c } of G.adj[n.s]) {
        if (R.closed.has(v)) { skip.push(`${v} explored`); continue; }
        if (R.front.some(x => x.s === v)) { skip.push(`${v} already in the queue`); continue; }
        const ch = R.add(v, n, n.g + c);
        if (early && v === goal) {
          R.rows.push([k, n.s, names(R.front.map(x => x.s)), names([...R.closed]), `generated ${v}: goal`]);
          return R.done(ch, ['b7', 'b8', 'b8g'], `Generate <b>${v}</b> as a child of ${n.s}: it is the goal, so stop now without waiting for it to reach the front of the queue.`);
        }
        R.front.push(ch); add.push(v);
      }
      const note = (add.length ? '' : 'no new children') + (skip.length ? (add.length ? '' : '; ') + skip.join('; ') : '');
      R.rows.push([k, n.s, names(R.front.map(x => x.s)), names([...R.closed]), note]);
      R.snap({ line: ['b6', 'b7', 'b8', 'b9'], vars: { node: n.s, depth: n.d }, msg: `Expand <b>${n.s}</b>: ` + (add.length ? `add ${add.join(', ')} to the <b>back</b> of the queue.` : `no new children.`) + (skip.length ? ` Skip ${skip.join(', ')}.` : '') });
    }
  }

  function dfs(R, G, o) {
    const { start, goal } = o;
    R.view = 'stack'; R.frontName = 'Frontier (LIFO stack, top first)';
    const root = R.add(start, null, 0); R.front.push(root);
    R.snap({ line: ['d1'], msg: `Push the start <b>${start}</b> on the stack. Nothing is visited yet.` });
    let k = 0;
    while (R.front.length) {
      const n = R.front.pop(); k++;
      if (R.closed.has(n.s)) {
        n.st = 'gone';
        R.rows.push([k, n.s, names(R.view_().map(x => x.s)), names([...R.closed]), 'already visited: skip']);
        R.snap({ line: ['d2', 'd3', 'd4'], msg: `Pop <b>${n.s}</b>: it was already visited by another path, so skip it.` });
        continue;
      }
      R.select(n); R.close(n);
      if (n.s === goal) {
        R.rows.push([k, n.s, names(R.view_().map(x => x.s)), names([...R.closed]), 'goal: stop']);
        return R.done(n, ['d3', 'd4', 'd5', 'd6'], `Pop <b>${goal}</b> from the top of the stack. It is the goal: stop.`);
      }
      const kids = G.adj[n.s].filter(x => !R.closed.has(x.v));
      kids.slice().reverse().forEach(({ v, c }) => R.front.push(R.add(v, n, n.g + c)));
      const note = kids.length ? '' : (R.front.length ? 'dead end: backtrack' : 'dead end');
      R.rows.push([k, n.s, names(R.view_().map(x => x.s)), names([...R.closed]), note]);
      R.snap({ line: ['d3', 'd4', 'd5', 'd6', 'd7', 'd8'], vars: { node: n.s, depth: n.d },
        msg: `Pop <b>${n.s}</b> (depth ${n.d}) and mark it visited. ` + (kids.length
          ? `Push its unvisited children in reverse order (${kids.map(x => x.v).reverse().join(', ')}), so <b>${kids[0].v}</b> ends on top and is explored next.`
          : `It has no unvisited children: a <b>dead end</b>. DFS backtracks to the next node on the stack.`) });
    }
    return R.fail(['d9'], `The stack is empty: no path from ${start} to ${goal}.`);
  }

  function bestFirst(R, G, o, mode) {   // mode: 'ucs' | 'gbf' | 'ast'
    const { start, goal } = o, U = mode === 'ucs', A = mode === 'ast';
    R.view = 'pq'; R.key = U ? (x => x.g) : A ? (x => x.f) : (x => x.h);
    R.frontName = U ? 'Frontier (priority queue on g)' : `OPEN (priority queue on ${A ? 'f = g + h' : 'h'})`;
    const lab = x => U ? `${x.s}(${x.g})` : A ? `${x.s}(${x.g}+${x.h}=${x.f})` : `${x.s}(${x.h})`;
    const lab2 = x => U ? `${x.s}(${x.g})` : A ? `${x.s}(${x.f})` : `${x.s}(${x.h})`;
    const fName = U ? 'g' : A ? 'f' : 'h';
    const L = U ? { init: ['u1'], sel: ['u2', 'u3', 'u4', 'u5'], goal: ['u4', 'u5'], exp: ['u6', 'u7', 'u8', 'u9', 'u10'], empty: ['u3'] }
      : { init: ['f1'], sel: ['f2', 'f3', 'f4', 'f5'], goal: ['f4', 'f5'], exp: ['f6', 'f7', 'f8', 'f9', 'f10'], empty: ['f3'] };
    const closedNode = {};
    const root = R.add(start, null, 0); R.front.push(root);
    R.snap({ line: L.init, msg: `Put <b>${start}</b> on the ${U ? 'frontier with g = 0' : `OPEN list with f = ${R.key(root)}`}. ` +
      (U ? 'UCS always expands the node with the lowest path cost g(n) so far.' : A ? 'A* expands the node with the lowest f(n) = g(n) + h(n): cost so far plus estimated cost to go.' : 'Greedy best-first expands the node that looks closest to the goal: the lowest h(n). It ignores the cost so far.') });
    let k = 0;
    for (;;) {
      if (!R.front.length) return R.fail(L.empty, `${U ? 'The frontier' : 'OPEN'} is empty: no path from ${start} to ${goal}.`);
      const n = R.popMin(); R.select(n); k++;
      const vars = U ? { node: n.s, g: n.g } : A ? { node: n.s, g: n.g, h: n.h, f: n.f } : { node: n.s, h: n.h };
      if (n.s === goal) {
        R.exp++;
        R.rows.push([k, U ? `${n.s} (${n.g})` : A ? `${n.s} (g ${n.g}, f ${n.f})` : `${n.s} (${n.h})`, 'goal', names([...R.closed]), 'goal selected: stop']);
        return R.done(n, L.goal, `<b>${goal}</b> has the lowest ${fName} (${R.key(n)}), so it is selected. It is the goal: stop. ` +
          (U || A ? `Testing the goal on <i>selection</i>, not when it was generated, is what makes the answer cheapest.` : ''));
      }
      R.snap({ line: L.sel, vars, msg: `Take <b>${n.s}</b>: it has the lowest ${fName} on ${U ? 'the frontier' : 'OPEN'} (${U || !A ? R.key(n) : `${n.g} + ${n.h} = ${n.f}`}). Not the goal, so move it to ${U ? 'explored' : 'CLOSED'}.` });
      R.close(n); closedNode[n.s] = n;
      const notes = [], add = [];
      for (const { v, c } of G.adj[n.s]) {
        const g2 = num(n.g + c), h2 = G.h[v] || 0, f2 = U ? g2 : A ? num(g2 + h2) : h2;
        const onOpen = R.front.find(x => x.s === v), onClosed = closedNode[v];
        if (!onOpen && !onClosed) { R.front.push(R.add(v, n, g2)); add.push(v); continue; }
        const old = onOpen || onClosed, oldf = R.key(old);
        if (U && onClosed) { notes.push(`${v} explored`); continue; }
        if (f2 < oldf) {
          old.st = 'gone';
          if (onOpen) R.front.splice(R.front.indexOf(onOpen), 1); else { R.closed.delete(v); delete closedNode[v]; }
          R.front.push(R.add(v, n, g2));
          notes.push(`${v}: better path via ${n.s} (${fName} ${f2} < ${oldf})${onClosed ? ', reopened' : ', replaced'}`);
        } else if (onOpen) notes.push(`${v} via ${n.s}: ${fName} ${f2} ≥ ${oldf}, no change`);
        else notes.push(`${v} ${U ? 'explored' : 'on CLOSED'}`);
      }
      R.rows.push([k, U ? `${n.s} (${n.g})` : A ? `${n.s} (g ${n.g}, f ${n.f})` : `${n.s} (${n.h})`, names(R.view_().map(lab2)), names([...R.closed]), notes.join('; ')]);
      R.snap({ line: L.exp, vars, msg: `Expand <b>${n.s}</b>. ` + (add.length ? `New: ${R.view_().filter(x => add.includes(x.s)).map(lab).join(', ')}. ` : 'No new successors. ') +
        (notes.length ? `${notes.join('; ')}.` : '') });
    }
  }

  function dlsCore(R, G, o, lim, order) {
    const { goal } = o, stack = [];
    const syncFront = () => { R.front = stack.slice(); };
    function rec(node, l) {
      stack.push(node); syncFront(); R.select(node); order.push(node.s); R.closed.add(node.s);
      const vars = { node: node.s, depth: node.d, 'ℓ left': l };
      if (node.s === goal) return node;
      if (l === 0) {
        node.st = 'cut';
        R.snap({ line: ['l1', 'l2'], vars, msg: `Visit <b>${node.s}</b> at depth ${node.d}: not the goal, and the limit is used up (ℓ = 0). Do not expand it: return <b>cutoff</b>.` });
        stack.pop(); syncFront(); return 'cutoff';
      }
      const kids = G.adj[node.s].filter(x => !stack.some(y => y.s === x.v));
      R.exp++;
      R.snap({ line: ['l1', 'l2', 'l3', 'l4'], vars, msg: `Visit <b>${node.s}</b> at depth ${node.d} with ℓ = ${l} levels left. Not the goal. ` +
        (kids.length ? `Try its children in order: ${kids.map(x => x.v).join(', ')}.` : `It has no children off the current path.`) });
      let cut = false;
      for (const { v, c } of kids) {
        const ch = R.add(v, node, node.g + c);
        const res = rec(ch, l - 1);
        if (res === 'cutoff') cut = true;
        else if (res !== 'failure') { stack.pop(); return res; }
        R.select(node); syncFront();
      }
      const res = cut ? 'cutoff' : 'failure';
      node.st = cut ? 'cut' : 'fail';
      R.snap({ line: ['l6', 'l7', 'l8'], vars, msg: `All children of <b>${node.s}</b> are done. ` + (cut ? `At least one was cut off, so return <b>cutoff</b>: a deeper limit might still find the goal.` : `None was cut off and none found the goal, so return <b>failure</b>.`) });
      stack.pop(); syncFront(); return res;
    }
    const root = R.add(o.start, null, 0);
    return rec(root, lim);
  }

  function dlsRun(R, G, o, ids) {
    R.view = 'queue'; R.frontName = 'Recursion stack (current path, root first)';
    for (let lim = ids ? 0 : o.limit; ; lim++) {
      R.tree = []; R.closed = new Set(); R.front = []; R.cur = null;
      const order = [];
      R.snap({ line: ids ? ['i1', 'i2'] : ['l1'], vars: { 'ℓ': lim }, msg: ids ? `Iteration with depth limit <b>ℓ = ${lim}</b>: start a fresh depth-limited search from ${o.start}. Nothing is kept from earlier iterations.`
        : `Depth-limited search with <b>ℓ = ${lim}</b>: depth-first, but nodes at depth ${lim} are treated as having no children.` });
      const res = dlsCore(R, G, o, lim, order);
      const txt = typeof res === 'object' ? `found: ${pathStr(R.chain(res).map(x => x.s))}` : res;
      R.rows.push([lim, order.join(', '), txt]);
      if (typeof res === 'object') return R.done(res, ['l1'].concat(ids ? ['i3'] : []), `Visit <b>${o.goal}</b> at depth ${res.d}: it is the goal. Return it up the recursion${ids ? `; IDS stops with limit ${lim}` : ''}.`);
      if (res === 'failure') return R.fail(ids ? ['i3', 'l8'] : ['l8'], `DLS returned <b>failure</b>: no node was cut off, so every path from ${o.start} was searched and ${o.goal} cannot be reached.`);
      if (!ids) return R.fail(['l8'], `DLS returned <b>cutoff</b>: the goal is not within depth ${lim}. It may be deeper: raise ℓ (or use iterative deepening). This is why DLS is <b>incomplete</b> when ℓ < d.`, 'cutoff');
      R.cur = null;
      R.snap({ line: ['i3'], vars: { 'ℓ': lim }, msg: `Limit ${lim} returned <b>cutoff</b>: some paths were stopped at depth ${lim}. Increase the limit to ${lim + 1} and search again from the start.` });
    }
  }

  function bid(R, G, o) {
    const { start, goal } = o;
    R.view = 'queue'; R.frontName = 'Frontiers (→ forward, ← backward)';
    const F = [], B = [], reF = {}, reB = {};
    const sync = () => { R.front = F.concat(B); };
    const rf = R.add(start, null, 0, 'f'); F.push(rf); reF[start] = rf;
    if (start === goal) { sync(); return R.done(rf, ['x1'], 'The start is the goal.'); }
    const rb = R.add(goal, null, 0, 'b'); B.push(rb); reB[goal] = rb; sync();
    R.snap({ line: ['x1', 'x2'], msg: `Run two breadth-first searches at once: forward from <b>${start}</b> and backward from <b>${goal}</b>. They alternate, one node each, and stop when they meet.` });
    let k = 0;
    while (F.length && B.length) {
      for (const side of ['f', 'b']) {
        const q = side === 'f' ? F : B, mine = side === 'f' ? reF : reB, other = side === 'f' ? reB : reF;
        if (!q.length) break;
        const n = q.shift(); R.select(n); R.close(n, side); k++;
        const add = [];
        for (const { v, c } of (side === 'f' ? G.adj : G.radj)[n.s]) {
          if (mine[v]) continue;
          const ch = R.add(v, n, n.g + c, side); mine[v] = ch; q.push(ch); add.push(v); sync();
          if (other[v]) {
            const fwd = side === 'f' ? ch : other[v], bwd = side === 'f' ? other[v] : ch;
            R.rows.push([k, side === 'f' ? '→' : '←', n.s, names(F.map(x => x.s)), names(B.map(x => x.s)), `meet at ${v}`]);
            const line = side === 'f' ? ['x4', 'x5'] : ['x6', 'x7'];
            return R.done(fwd, line, `${side === 'f' ? 'Forward' : 'Backward'} search expands <b>${n.s}</b> and reaches <b>${v}</b>, which the ${side === 'f' ? 'backward' : 'forward'} search has already reached. The searches <b>meet</b>: join ${start}…${v} and ${v}…${goal}.`, R.chain(bwd));
          }
        }
        sync();
        R.rows.push([k, side === 'f' ? '→' : '←', n.s, names(F.map(x => x.s)), names(B.map(x => x.s)), add.length ? '' : 'no new nodes']);
        R.snap({ line: side === 'f' ? ['x3', 'x4', 'x5'] : ['x6', 'x7'], vars: { side: side === 'f' ? 'forward' : 'backward', node: n.s },
          msg: `${side === 'f' ? 'Forward' : 'Backward'} search expands <b>${n.s}</b> (${side === 'f' ? 'successors' : 'predecessors'}): ` + (add.length ? `new ${add.join(', ')}.` : 'nothing new.') + ' The two searches have not met yet.' });
      }
    }
    return R.fail(['x8'], `One frontier is empty and the searches never met: no path from ${start} to ${goal}.`);
  }

  function hc(R, G, o) {
    const { start, goal } = o;
    R.view = 'queue'; R.frontName = 'Neighbours of current (h)';
    let cur = R.add(start, null, 0); R.select(cur);
    R.snap({ line: ['h1'], vars: { current: start, h: cur.h }, msg: `Start at <b>${start}</b> (h = ${cur.h}). Hill climbing keeps only the current node: no frontier, no explored list, no backtracking.` });
    let k = 0;
    for (;;) {
      if (cur.s === goal) return R.done(cur, ['h3'], `<b>${goal}</b> is the goal: success.`);
      k++;
      const nb = G.adj[cur.s].map(({ v, c }) => { const x = R.add(v, cur, cur.g + c); x.st = 'eval'; return x; });
      R.front = nb; R.exp++;
      if (!nb.length) {
        R.rows.push([k, `${cur.s} (${cur.h})`, '—', 'stuck: no neighbours']);
        return R.fail(['h4', 'h5'], `<b>${cur.s}</b> has no neighbours: stuck.`, 'stuck');
      }
      let best = nb[0]; nb.forEach(x => { if (x.h < best.h) best = x; });
      const list = nb.map(x => `${x.s}(${x.h})`).join(', ');
      R.snap({ line: ['h2', 'h3', 'h4'], vars: { current: cur.s, h: cur.h, next: best.s, 'h(next)': best.h }, msg: `Look at every neighbour of <b>${cur.s}</b>: ${list}. The lowest is <b>${best.s}</b> with h = ${best.h}.` });
      if (best.h >= cur.h) {
        R.rows.push([k, `${cur.s} (${cur.h})`, list, `stuck: ${best.h === cur.h ? 'plateau' : 'local minimum'}`]);
        R.front = [];
        return R.fail(['h5'], `h(${best.s}) = ${best.h} is not lower than h(${cur.s}) = ${cur.h}, so no neighbour improves. Hill climbing is <b>stuck</b> at ${cur.s}: a ${best.h === cur.h ? '<b>plateau</b> (equal values)' : '<b>local minimum</b>'}, not the goal. It does not backtrack, so it fails.`, 'stuck');
      }
      R.rows.push([k, `${cur.s} (${cur.h})`, list, `→ ${best.s}`]);
      nb.forEach(x => { if (x !== best) x.st = 'gone'; });
      cur.st = 'closed'; cur = best; R.select(cur); R.front = [];
      R.snap({ line: ['h5', 'h6'], vars: { current: cur.s, h: cur.h }, msg: `h(${cur.s}) = ${cur.h} is lower, so move to <b>${cur.s}</b>. The other neighbours are forgotten.` });
    }
  }

  function run(alg, G, o) {
    const R = recorder(G, alg);
    let tooMany = false;
    try {
      if (alg === 'bfs') bfs(R, G, o);
      else if (alg === 'dfs') dfs(R, G, o);
      else if (alg === 'ucs') bestFirst(R, G, o, 'ucs');
      else if (alg === 'gbf') bestFirst(R, G, o, 'gbf');
      else if (alg === 'ast') bestFirst(R, G, o, 'ast');
      else if (alg === 'dls') dlsRun(R, G, o, false);
      else if (alg === 'ids') dlsRun(R, G, o, true);
      else if (alg === 'bid') bid(R, G, o);
      else if (alg === 'hc') hc(R, G, o);
    } catch (e) { if (e !== TOO_MANY) throw e; tooMany = true; }
    const opt = optimal(G, o.start, o.goal), res = R.result || { status: 'too-many' };
    let msg;
    if (tooMany) msg = `Stopped after ${MAX_STEPS} steps to keep the simulation readable. Use a smaller graph${alg === 'dls' ? ' or a lower limit' : ''}.`;
    else if (res.status === 'found') {
      msg = `Solution: <b>${pathStr(res.path)}</b>, ${res.path.length - 1} step${res.path.length === 2 ? '' : 's'}, cost <b>${res.cost}</b>. ${R.exp} node${R.exp === 1 ? '' : 's'} expanded, ${R.gen} generated. `;
      msg += opt && Math.abs(opt.cost - res.cost) < 1e-9 ? `The cheapest possible cost is ${opt.cost}, so this path is <b>optimal</b>.`
        : `The cheapest path is ${pathStr(opt.path)} with cost ${opt.cost}, so this answer is <b>not optimal</b>.`;
      if (opt && Math.abs(opt.cost - res.cost) < 1e-9 && ['bfs', 'dfs', 'ids', 'dls', 'bid', 'gbf', 'hc'].includes(alg)) msg += ` (Here that is luck: ${ALGS[alg].short} does not guarantee the cheapest path when step costs differ.)`;
    } else if (res.status === 'stuck') msg = `Hill climbing failed: it stopped at a node that is not the goal${opt ? `, although the path ${pathStr(opt.path)} (cost ${opt.cost}) exists` : ''}. Random restarts or simulated annealing would help.`;
    else if (res.status === 'cutoff') msg = `No solution within depth ${o.limit}.${opt ? ` A path exists (${pathStr(opt.path)}, ${opt.path.length - 1} steps), so the limit is too small.` : ''}`;
    else msg = opt ? `No solution found.` : `No solution: ${o.goal} cannot be reached from ${o.start}.`;
    R.cur = null;
    R.snap({ line: [], msg, final: true });
    return { steps: R.steps, result: Object.assign({ exp: R.exp, gen: R.gen, maxF: R.maxF, tooMany }, res), optimal: opt, code: code(alg, o), header: header(alg) };
  }

  const API = { ALGS, parseGraph, run, optimal, checkH, code, header, MAX_STEPS };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SearchEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
