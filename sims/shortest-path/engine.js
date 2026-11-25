/* Shortest-path engine: parses a small weighted graph and records every step of
   single-source (BFS, Dijkstra, Bellman-Ford, DAG shortest paths) and all-pairs
   (Floyd-Warshall, Johnson) shortest-path algorithms.
   Works in the browser (window.SPEngine) and in Node (module.exports) so the traces can be tested. */
(function (root) {
  const MAX_STEPS = 1500, INF = Infinity;
  const NAME = /^[A-Za-z0-9]{1,4}$/;
  const ALGS = {
    bfs: { name: 'Breadth-first search (unweighted)', short: 'BFS', kind: 'ss' },
    dij: { name: 'Dijkstra’s algorithm', short: 'Dijkstra', kind: 'ss' },
    bf: { name: 'Bellman–Ford', short: 'Bellman–Ford', kind: 'ss' },
    dag: { name: 'DAG shortest paths', short: 'DAG', kind: 'ss' },
    fw: { name: 'Floyd–Warshall', short: 'Floyd–Warshall', kind: 'ap' },
    jo: { name: 'Johnson’s algorithm', short: 'Johnson', kind: 'ap' }
  };
  const fd = x => x === INF ? '∞' : x === -INF ? '−∞' : x < 0 ? '−' + (-x) : String(x);
  const plus = w => w < 0 ? `− ${-w}` : `+ ${w}`;
  const natural = (a, b) => {
    const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return a - b;
    if (na !== nb) return na ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  };

  // ---------- parsing ----------
  function parseGraph(text, directed) {
    const lines = text.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return { error: 'Type at least one edge, for example s t 10.' };
    const arcs = [], drawn = [], seen = new Set();
    const put = (u, v, w) => { const a = arcs.find(x => x.u === u && x.v === v); if (a) a.w = w; else arcs.push({ u, v, w }); };
    for (const ln of lines) {
      const t = ln.split(/\s+/);
      if (t.length < 2 || t.length > 3) return { error: `“${ln}” is not an edge. Write two vertex names and a weight, like s t 10.` };
      const [u, v] = t, w = t.length === 3 ? Number(t[2]) : 1;
      if (!NAME.test(u) || !NAME.test(v)) return { error: `In “${ln}”: vertex names are 1 to 4 letters or digits.` };
      if (u === v) return { error: `In “${ln}”: a self-loop is not allowed.` };
      if (!Number.isInteger(w) || w < -999 || w > 999) return { error: `In “${ln}”: the weight must be a whole number from −999 to 999.` };
      if (!directed && w < 0) return { error: `In “${ln}”: an undirected edge with negative weight is a negative cycle on its own (go there and back). Tick “Directed edges” to use negative weights.` };
      put(u, v, w); if (!directed) put(v, u, w);
      seen.add(u); seen.add(v);
      const d = drawn.find(e => (e.u === u && e.v === v) || (!directed && e.u === v && e.v === u));
      if (d) d.w = w; else drawn.push({ u, v, w });
    }
    const V = [...seen].sort(natural);
    if (V.length > 10) return { error: `That graph has ${V.length} vertices. Use at most 10 so the tables stay readable.` };
    if (arcs.length > 40) return { error: `That graph has ${arcs.length} directed edges. Use at most 40.` };
    const adj = {};
    V.forEach(x => adj[x] = []);
    arcs.forEach(a => adj[a.u].push(a));
    V.forEach(x => adj[x].sort((p, q) => natural(p.v, q.v)));
    return { V, arcs, adj, drawn, directed: !!directed, negative: arcs.some(a => a.w < 0) };
  }

  // ---------- plain reference algorithms ----------
  function bellmanFord(G, s, extraArcs) {
    const V = extraArcs ? G.V.concat([s]) : G.V, arcs = extraArcs ? extraArcs.concat(G.arcs) : G.arcs, d = {}, pi = {};
    V.forEach(v => { d[v] = INF; pi[v] = null; }); d[s] = 0;
    for (let i = 1; i < V.length; i++) {
      let ch = false;
      arcs.forEach(({ u, v, w }) => { if (d[u] !== INF && d[u] + w < d[v]) { d[v] = d[u] + w; pi[v] = u; ch = true; } });
      if (!ch) break;
    }
    const neg = arcs.some(({ u, v, w }) => d[u] !== INF && d[u] + w < d[v]);
    return { d, pi, neg };
  }
  function dijkstraPlain(G, s, wf) {
    const d = {}, pi = {}, S = new Set();
    G.V.forEach(v => { d[v] = INF; pi[v] = null; }); d[s] = 0;
    while (S.size < G.V.length) {
      let u = null;
      G.V.forEach(v => { if (!S.has(v) && (u === null || d[v] < d[u])) u = v; });
      S.add(u);
      if (d[u] === INF) continue;
      G.adj[u].forEach(a => { const w = wf(a); if (d[u] + w < d[a.v]) { d[a.v] = d[u] + w; pi[a.v] = u; } });
    }
    return { d, pi };
  }
  function topo(G) {   // DFS topological sort; returns {order, finish} or {cycle:[u,v]}
    const col = {}, order = [], fin = [];
    G.V.forEach(v => col[v] = 0);
    let back = null;
    const visit = u => {
      col[u] = 1;
      for (const { v } of G.adj[u]) {
        if (col[v] === 1 && !back) back = [u, v];
        if (col[v] === 0) visit(v);
      }
      col[u] = 2; fin.push(u); order.unshift(u);
    };
    G.V.forEach(v => { if (col[v] === 0) visit(v); });
    return back ? { cycle: back } : { order, fin };
  }
  function pathFromPi(pi, s, t) {
    if (t === s) return [s];
    const p = [t], seen = new Set([t]);
    let x = t;
    while (pi[x] != null) { x = pi[x]; if (seen.has(x)) return null; seen.add(x); p.unshift(x); if (x === s) return p; }
    return null;
  }
  function pathFromP(V, P, i, j) {   // P[i][j] = predecessor of j on a shortest i->j path (indices)
    if (i === j) return [V[i]];
    const p = [V[j]]; let x = j, guard = 0;
    while (x !== i) { x = P[i][x]; if (x == null || ++guard > V.length) return null; p.unshift(V[x]); }
    return p;
  }

  // ---------- recorder ----------
  const TOO_MANY = {};
  function recorder(G) {
    const R = { steps: [], d: {}, pi: {}, S: new Set(), Q: [], rows: [], relax: 0, upd: 0, cur: null, M: null, h: null, hat: null, cycle: null, src: null, topo: null };
    R.snap = o => {
      R.steps.push(Object.assign({
        line: [], msg: '', d: Object.assign({}, R.d), pi: Object.assign({}, R.pi), S: [...R.S], Q: R.Q.map(x => Object.assign({}, x)), cur: R.cur, edge: null,
        rows: R.rows.map(r => r.slice()), st: { relax: R.relax, upd: R.upd }, vars: {}, h: R.h ? Object.assign({}, R.h) : null, hat: R.hat, cycle: R.cycle ? R.cycle.slice() : null,
        src: R.src, topo: R.topo ? R.topo.slice() : null,
        M: R.M ? { D: R.M.D.map(r => r.slice()), P: R.M.P.map(r => r.slice()), k: R.M.k, i: R.M.i, chg: R.M.chg.slice(), done: R.M.done ? R.M.done.slice() : null } : null
      }, o));
      if (R.steps.length > MAX_STEPS) throw TOO_MANY;
    };
    R.init = s => { G.V.forEach(v => { R.d[v] = INF; R.pi[v] = null; }); R.d[s] = 0; R.src = s; };
    R.relaxE = (u, v, w) => {
      R.relax++;
      const du = R.d[u], old = R.d[v];
      if (du === INF) return { ok: false, inf: true, old };
      const nd = du + w;
      if (nd < old) { R.d[v] = nd; R.pi[v] = u; R.upd++; return { ok: true, old, nd, du }; }
      return { ok: false, old, nd, du };
    };
    return R;
  }
  const relaxMsg = (u, v, w, r) => r.inf
    ? `RELAX(${u}, ${v}): ${u}.d = ∞, so the edge cannot give a shorter path yet.`
    : r.ok ? `RELAX(${u}, ${v}): ${v}.d = ${fd(r.old)} &gt; ${u}.d + w(${u},${v}) = ${fd(r.du)} ${plus(w)} = ${fd(r.nd)}. <b>Improve:</b> ${v}.d ← ${fd(r.nd)}, ${v}.π ← ${u}.`
      : `RELAX(${u}, ${v}): ${v}.d = ${fd(r.old)} ≤ ${u}.d + w(${u},${v}) = ${fd(r.du)} ${plus(w)} = ${fd(r.nd)}. No change.`;

  // ---------- pseudocode ----------
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  function code(alg, o) {
    const C = [], P = t => C.push({ proc: t }), L = (key, text) => C.push({ key, text });
    const relax = () => {
      P('RELAX(u, v, w)');
      L('r1', `${kw('if')} v.d > u.d + w(u, v)`);
      L('r2', `    v.d = u.d + w(u, v);   v.π = u`);
    };
    const initSS = () => {
      P('INITIALIZE-SINGLE-SOURCE(G, s)');
      L('i1', `${kw('for each')} v ∈ G.V:  v.d = ∞;  v.π = NIL`);
      L('i2', `s.d = 0`);
    };
    if (alg === 'bfs') {
      P('BFS(G, s)   ▷ every edge counts as 1');
      L('q1', `${kw('for each')} u ∈ G.V:  u.d = ∞;  u.π = NIL`);
      L('q2', `s.d = 0;   Q = ∅;   ENQUEUE(Q, s)`);
      L('q3', `${kw('while')} Q ≠ ∅`);
      L('q4', `    u = DEQUEUE(Q)`);
      L('q5', `    ${kw('for each')} v ∈ G.Adj[u]`);
      L('q6', `        ${kw('if')} v.d == ∞   ${cm('▷ not discovered yet')}`);
      L('q7', `            v.d = u.d + 1;   v.π = u`);
      L('q8', `            ENQUEUE(Q, v)`);
    } else if (alg === 'dij') {
      P('DIJKSTRA(G, w, s)   ▷ needs w ≥ 0');
      L('k1', `INITIALIZE-SINGLE-SOURCE(G, s)`);
      L('k2', `S = ∅`);
      L('k3', `Q = G.V   ${cm('▷ min-priority queue on d')}`);
      L('k4', `${kw('while')} Q ≠ ∅`);
      L('k5', `    u = EXTRACT-MIN(Q)`);
      L('k6', `    S = S ∪ {u}`);
      L('k7', `    ${kw('for each')} v ∈ G.Adj[u]`);
      L('k8', `        RELAX(u, v, w)`);
      relax();
    } else if (alg === 'bf') {
      P('BELLMAN-FORD(G, w, s)');
      L('b1', `INITIALIZE-SINGLE-SOURCE(G, s)`);
      L('b2', `${kw('for')} i = 1 ${kw('to')} |G.V| − 1`);
      L('b3', `    ${kw('for each')} edge (u, v) ∈ G.E`);
      L('b4', `        RELAX(u, v, w)`);
      if (o.early) L('b4x', `    ${kw('if')} no d changed in this pass ${kw('then break')}`);
      L('b5', `${kw('for each')} edge (u, v) ∈ G.E`);
      L('b6', `    ${kw('if')} v.d > u.d + w(u, v)`);
      L('b7', `        ${kw('return')} FALSE   ${cm('▷ negative-weight cycle')}`);
      L('b8', `${kw('return')} TRUE`);
      relax();
    } else if (alg === 'dag') {
      P('DAG-SHORTEST-PATHS(G, w, s)');
      L('g1', `topologically sort the vertices of G`);
      L('g2', `INITIALIZE-SINGLE-SOURCE(G, s)`);
      L('g3', `${kw('for each')} u ${kw('in')} topological order`);
      L('g4', `    ${kw('for each')} v ∈ G.Adj[u]`);
      L('g5', `        RELAX(u, v, w)`);
      relax();
    } else if (alg === 'fw') {
      P('FLOYD-WARSHALL(W)   ▷ n × n weight matrix');
      L('w1', `n = W.rows;   D = W;   Π from the edges`);
      L('w2', `${kw('for')} k = 1 ${kw('to')} n   ${cm('▷ allow k as an intermediate')}`);
      L('w3', `    ${kw('for')} i = 1 ${kw('to')} n`);
      L('w4', `        ${kw('for')} j = 1 ${kw('to')} n`);
      L('w5', `            ${kw('if')} d[i][k] + d[k][j] < d[i][j]`);
      L('w6', `                d[i][j] = d[i][k] + d[k][j];   π[i][j] = π[k][j]`);
      L('w7', `${kw('if')} some d[i][i] < 0 ${kw('then')} negative cycle`);
      L('w8', `${kw('return')} D, Π`);
    } else if (alg === 'jo') {
      P('JOHNSON(G, w)');
      L('j1', `G′ = G plus a new vertex q with w(q, v) = 0 for all v`);
      L('j2', `${kw('if')} BELLMAN-FORD(G′, w, q) = FALSE ${kw('then')} negative cycle`);
      L('j3', `${kw('for each')} v ∈ G.V:  h(v) = δ(q, v)`);
      L('j4', `${kw('for each')} edge (u, v):  ŵ(u, v) = w(u, v) + h(u) − h(v)`);
      L('j5', `${kw('for each')} u ∈ G.V`);
      L('j6', `    DIJKSTRA(G, ŵ, u)   ${cm('▷ gives δ̂(u, v), all ŵ ≥ 0')}`);
      L('j7', `    ${kw('for each')} v ∈ G.V:  d[u][v] = δ̂(u, v) + h(v) − h(u)`);
      L('j8', `${kw('return')} D`);
    }
    return C;
  }
  function header(alg, G) {
    if (alg === 'bf') return ['Pass'].concat(G.V.map(v => `${v}.d`), ['Changes']);
    if (alg === 'dag') return ['u (topological order)'].concat(G.V.map(v => `${v}.d`));
    if (alg === 'dij') return ['Step', 'u = EXTRACT-MIN', 'S after', 'Q after (d)', 'Improved'];
    if (alg === 'bfs') return ['Step', 'Dequeued u', 'Queue after', 'Discovered (d)'];
    if (alg === 'fw') return ['k', 'Pairs improved', 'Updates (i→j: old → new)'];
    return ['Source u', 'δ̂(u, ·) with ŵ', 'd[u][·] = δ̂ + h(v) − h(u)'];
  }

  // ---------- algorithms ----------
  function runBFS(R, G, o) {
    const s = o.source;
    R.init(s); R.Q = [{ v: s, key: 0 }];
    R.snap({ line: ['q1', 'q2'], msg: `BFS ignores the weights and counts <b>edges</b>. Set every d to ∞, then s.d = 0 and put <b>${s}</b> in the queue.` });
    let k = 0;
    while (R.Q.length) {
      const u = R.Q.shift().v; R.cur = u; R.S.add(u); k++;
      R.snap({ line: ['q3', 'q4'], vars: { u, 'u.d': fd(R.d[u]) }, msg: `Dequeue <b>${u}</b> (d = ${R.d[u]}). Look at its neighbours.` });
      const found = [];
      for (const { v } of G.adj[u]) {
        R.relax++;
        if (R.d[v] === INF) {
          R.d[v] = R.d[u] + 1; R.pi[v] = u; R.upd++; R.Q.push({ v, key: R.d[v] }); found.push(`${v}(${R.d[v]})`);
          R.snap({ line: ['q5', 'q6', 'q7', 'q8'], edge: { u, v, ok: true }, vars: { u, v, 'v.d': R.d[v] }, msg: `${v}.d = ∞: <b>${v}</b> is discovered. ${v}.d = ${u}.d + 1 = ${R.d[v]}, ${v}.π = ${u}; enqueue ${v}.` });
        } else {
          R.snap({ line: ['q5', 'q6'], edge: { u, v, ok: false }, vars: { u, v, 'v.d': R.d[v] }, msg: `${v} was already discovered (d = ${R.d[v]}). Skip it.` });
        }
      }
      R.rows.push([k, u, R.Q.map(x => x.v).join(', ') || '—', found.join(', ') || '—']);
    }
    R.cur = null;
    R.snap({ line: ['q3'], msg: `The queue is empty. Every vertex reachable from ${s} has d = the <b>fewest edges</b> from ${s}.` });
    return { status: 'ok' };
  }

  function runDij(R, G, o) {
    const s = o.source;
    R.init(s);
    const syncQ = () => { R.Q = G.V.filter(v => !R.S.has(v)).map(v => ({ v, key: R.d[v] })).sort((a, b) => a.key - b.key || natural(a.v, b.v)); };
    syncQ();
    R.snap({ line: ['k1', 'k2', 'k3', 'i1', 'i2'], msg: `Set every d to ∞ and s.d = 0. S (finished vertices) is empty; the priority queue Q holds every vertex, keyed by d.` +
      (G.negative ? ` <b>Warning:</b> this graph has a negative edge; Dijkstra assumes w ≥ 0 and may give wrong answers.` : '') });
    let k = 0;
    while (R.Q.length) {
      const u = R.Q[0].v; R.S.add(u); R.cur = u; syncQ(); k++;
      R.snap({ line: ['k4', 'k5', 'k6'], vars: { u, 'u.d': fd(R.d[u]) }, msg: `EXTRACT-MIN gives <b>${u}</b> with d = ${fd(R.d[u])}, the smallest in Q. Add ${u} to S: its distance is now final${R.d[u] === INF ? ' (∞: it cannot be reached)' : ''}.` });
      const imp = [];
      for (const { v, w } of G.adj[u]) {
        const r = R.relaxE(u, v, w); syncQ();
        if (r.ok) imp.push(`${v}: ${fd(r.old)}→${fd(r.nd)}`);
        R.snap({ line: ['k7', 'k8', 'r1'].concat(r.ok ? ['r2'] : []), edge: { u, v, ok: r.ok }, vars: { u, v, 'u.d': fd(R.d[u]), 'v.d': fd(R.d[v]), 'w(u,v)': fd(w) },
          msg: relaxMsg(u, v, w, r) + (r.ok && R.S.has(v) ? ` (${v} is already in S: with a negative edge a “final” distance just changed, which is why Dijkstra needs w ≥ 0.)` : '') });
      }
      R.rows.push([k, `${u} (${fd(R.d[u])})`, [...R.S].join(', '), R.Q.map(x => `${x.v}:${fd(x.key)}`).join(' ') || '∅', imp.join(', ') || '—']);
    }
    R.cur = null;
    return { status: 'ok' };
  }

  function runBF(R, G, o) {
    const s = o.source, n = G.V.length;
    R.init(s);
    R.snap({ line: ['b1', 'i1', 'i2'], msg: `Set every d to ∞ and ${s}.d = 0. Then relax <b>every edge</b>, in the order they are listed, |V| − 1 = ${n - 1} times.` });
    let pass = 0;
    for (let i = 1; i <= n - 1; i++) {
      pass = i; let ch = 0;
      for (const { u, v, w } of G.arcs) {
        const r = R.relaxE(u, v, w); if (r.ok) ch++;
        R.cur = u;
        R.snap({ line: ['b2', 'b3', 'b4', 'r1'].concat(r.ok ? ['r2'] : []), edge: { u, v, ok: r.ok }, vars: { pass: i, u, v, 'u.d': fd(R.d[u]), 'v.d': fd(R.d[v]) }, msg: `Pass ${i}: ` + relaxMsg(u, v, w, r) });
      }
      R.rows.push([i].concat(G.V.map(v => fd(R.d[v])), [ch]));
      R.cur = null;
      if (!ch && o.early) {
        R.snap({ line: ['b4x'], vars: { pass: i }, msg: `Pass ${i} changed nothing, so no later pass can change anything either: stop early (${n - 1 - i} pass${n - 1 - i === 1 ? '' : 'es'} saved).` });
        break;
      }
      R.snap({ line: ['b2'], vars: { pass: i }, msg: `End of pass ${i}: ${ch} distance${ch === 1 ? '' : 's'} improved. After pass i, every shortest path that uses at most i edges is correct.` });
    }
    for (const { u, v, w } of G.arcs) {
      R.relax++;
      if (R.d[u] !== INF && R.d[u] + w < R.d[v]) {
        // find the cycle: relax once more and walk back n times along π
        const pi = Object.assign({}, R.pi); pi[v] = u;
        let x = v; for (let t = 0; t < n; t++) x = pi[x];
        const cyc = [x]; let y = pi[x]; while (y !== x) { cyc.unshift(y); y = pi[y]; } cyc.unshift(x);
        R.cycle = cyc;
        const wsum = cyc.slice(1).reduce((acc, z, idx) => acc + G.arcs.find(a => a.u === cyc[idx] && a.v === z).w, 0);
        R.snap({ line: ['b5', 'b6', 'b7'], edge: { u, v, ok: true }, msg: `Check: ${v}.d = ${fd(R.d[v])} &gt; ${u}.d + w = ${fd(R.d[u])} ${plus(w)} = ${fd(R.d[u] + w)}. An edge can still be relaxed after ${n - 1} passes, so there is a <b>negative-weight cycle</b>: ${cyc.join(' → ')} (total ${fd(wsum)}). Return FALSE: shortest paths are not defined.` });
        return { status: 'negcycle', cycle: cyc };
      }
    }
    R.snap({ line: ['b5', 'b6', 'b8'], msg: `Final check: no edge can be relaxed any more, so there is no negative cycle reachable from ${s}. Return TRUE: every d is a shortest-path distance.` });
    return { status: 'ok' };
  }

  function runDAG(R, G, o) {
    const s = o.source, t = topo(G);
    if (t.cycle) {
      R.init(s);
      R.snap({ line: ['g1'], msg: `Depth-first search finds the edge ${t.cycle[0]} → ${t.cycle[1]} back into a vertex that is still open: the graph has a <b>cycle</b>, so it is not a DAG and has no topological order. Use Bellman–Ford or Dijkstra instead.` });
      return { status: 'notdag' };
    }
    R.topo = t.order;
    R.snap({ line: ['g1'], msg: `Topological sort (depth-first search; list vertices in reverse order of finishing time): <b>${t.order.join(', ')}</b>. Every edge goes from left to right in this order.` });
    R.init(s);
    R.snap({ line: ['g2', 'i1', 'i2'], msg: `Set every d to ∞ and ${s}.d = 0. Now take the vertices in topological order and relax the edges leaving each one, once.` });
    for (const u of t.order) {
      R.cur = u; R.S.add(u);
      R.snap({ line: ['g3'], vars: { u, 'u.d': fd(R.d[u]) }, msg: `Next in topological order: <b>${u}</b> (d = ${fd(R.d[u])}). Every edge into ${u} has already been relaxed, so ${u}.d is final.` + (R.d[u] === INF ? ` It is not reachable from ${s}, so its edges cannot improve anything.` : '') });
      for (const { v, w } of G.adj[u]) {
        const r = R.relaxE(u, v, w);
        R.snap({ line: ['g4', 'g5', 'r1'].concat(r.ok ? ['r2'] : []), edge: { u, v, ok: r.ok }, vars: { u, v, 'u.d': fd(R.d[u]), 'v.d': fd(R.d[v]) }, msg: relaxMsg(u, v, w, r) });
      }
      R.rows.push([u].concat(G.V.map(v => fd(R.d[v]))));
    }
    R.cur = null;
    return { status: 'ok' };
  }

  function mkMatrix(G) {
    const n = G.V.length, ix = {}; G.V.forEach((v, i) => ix[v] = i);
    const D = [], P = [];
    for (let i = 0; i < n; i++) { D.push(Array(n).fill(INF)); P.push(Array(n).fill(null)); D[i][i] = 0; }
    G.arcs.forEach(({ u, v, w }) => { D[ix[u]][ix[v]] = w; P[ix[u]][ix[v]] = ix[u]; });
    return { D, P, k: null, i: null, chg: [] };
  }

  function runFW(R, G, o) {
    const V = G.V, n = V.length;
    R.M = mkMatrix(G);
    const { D, P } = R.M;
    R.snap({ line: ['w1'], msg: `Start with D = W: d[i][j] is the weight of edge i → j (∞ if there is none, 0 on the diagonal). π[i][j] = i when the edge exists. These are the shortest paths that use <b>no intermediate vertex</b>.` });
    for (let k = 0; k < n; k++) {
      const upd = [];
      for (let i = 0; i < n; i++) {
        R.M.k = k; R.M.i = i; R.M.chg = [];
        const notes = [];
        if (i === k || D[i][k] === INF) {
          R.relax += n;
          R.snap({ line: ['w2', 'w3'], vars: { k: V[k], i: V[i] }, msg: i === k ? `k = ${V[k]}, row i = ${V[i]}: a path from ${V[k]} through ${V[k]} cannot be shorter. Row unchanged.` : `k = ${V[k]}, row i = ${V[i]}: d[${V[i]}][${V[k]}] = ∞, there is no path from ${V[i]} to ${V[k]} yet, so going through ${V[k]} cannot help. Row unchanged.` });
          continue;
        }
        for (let j = 0; j < n; j++) {
          R.relax++;
          if (D[k][j] === INF) continue;
          const via = D[i][k] + D[k][j];
          if (via < D[i][j]) {
            notes.push(`d[${V[i]}][${V[j]}]: ${fd(D[i][j])} → ${fd(via)} = ${fd(D[i][k])} ${plus(D[k][j])}`);
            upd.push(`${V[i]}→${V[j]}: ${fd(D[i][j])} → ${fd(via)}`);
            D[i][j] = via; P[i][j] = P[k][j]; R.M.chg.push(i + ',' + j); R.upd++;
          }
        }
        R.snap({ line: ['w2', 'w3', 'w4', 'w5'].concat(notes.length ? ['w6'] : []), vars: { k: V[k], i: V[i] },
          msg: `k = ${V[k]}, row i = ${V[i]}: for every j, is going ${V[i]} → ${V[k]} → j shorter? ` + (notes.length ? `<b>Improved:</b> ${notes.join('; ')}.` : `No entry improves.`) });
      }
      R.rows.push([V[k], upd.length, upd.join(', ') || '—']);
      R.M.i = null; R.M.chg = [];
      R.snap({ line: ['w2'], vars: { k: V[k] }, msg: `Done with k = ${V[k]}: D now holds the shortest paths whose intermediate vertices are all in {${V.slice(0, k + 1).join(', ')}}. ${upd.length} entr${upd.length === 1 ? 'y' : 'ies'} improved.` });
    }
    R.M.k = null;
    const negI = V.findIndex((v, i) => D[i][i] < 0);
    if (negI >= 0) {
      R.cycle = pathFromP(V, P, negI, negI);
      R.snap({ line: ['w7'], msg: `d[${V[negI]}][${V[negI]}] = ${fd(D[negI][negI])} &lt; 0: a path from ${V[negI]} back to itself has negative weight. The graph has a <b>negative-weight cycle</b>, so these distances are not shortest paths.` });
      return { status: 'negcycle' };
    }
    R.snap({ line: ['w7', 'w8'], msg: `Every diagonal entry is 0, so there is no negative cycle. D holds all ${n * n} shortest-path distances; read a path from Π by following π[i][j] back to i.` });
    return { status: 'ok' };
  }

  function runJo(R, G, o) {
    const V = G.V, n = V.length, q = 'q';
    const qArcs = V.map(v => ({ u: q, v, w: 0 }));
    R.M = { D: V.map(() => Array(n).fill(null)), P: V.map(() => Array(n).fill(null)), k: null, i: null, chg: [], done: [] };
    R.snap({ line: ['j1'], msg: `Add a new vertex <b>q</b> with an edge of weight 0 to every vertex. Any shortest path from q is at most 0, and q adds no new cycles.` });
    const bf = bellmanFord(G, q, qArcs);
    R.relax += (n) * (G.arcs.length + n);
    if (bf.neg) {
      R.snap({ line: ['j2'], msg: `Bellman–Ford from q finds an edge that can still be relaxed after |V′| − 1 passes: the graph has a <b>negative-weight cycle</b>. Stop.` });
      return { status: 'negcycle' };
    }
    R.h = {}; V.forEach(v => R.h[v] = bf.d[v]);
    R.rows.push(['q (Bellman–Ford)', 'h = ' + V.map(v => `${v}:${fd(R.h[v])}`).join(' '), '']);
    R.snap({ line: ['j2', 'j3'], msg: `Bellman–Ford from q: no negative cycle. Set h(v) = δ(q, v): ${V.map(v => `h(${v}) = ${fd(R.h[v])}`).join(', ')}.` });
    R.hat = {};
    G.arcs.forEach(a => R.hat[a.u + '>' + a.v] = a.w + R.h[a.u] - R.h[a.v]);
    const ex = G.arcs.find(a => a.w < 0) || G.arcs[0];
    R.snap({ line: ['j4'], msg: `Reweight every edge: ŵ(u, v) = w(u, v) + h(u) − h(v). For example ŵ(${ex.u}, ${ex.v}) = ${fd(ex.w)} + ${fd(R.h[ex.u])} − ${fd(R.h[ex.v])} = ${fd(R.hat[ex.u + '>' + ex.v])}. Every ŵ ≥ 0 (triangle inequality), and every path from u to v changes by the same h(u) − h(v), so shortest paths stay shortest.` });
    const wf = a => R.hat[a.u + '>' + a.v];
    V.forEach((u, i) => {
      const r = dijkstraPlain(G, u, wf);
      R.relax += G.arcs.length;
      V.forEach((v, j) => {
        R.M.D[i][j] = r.d[v] === INF ? INF : r.d[v] + R.h[v] - R.h[u];
        R.M.P[i][j] = r.pi[v] == null ? null : V.indexOf(r.pi[v]);
      });
      R.M.done.push(i); R.M.i = i;
      R.d = {}; R.pi = {}; V.forEach(v => { R.d[v] = R.M.D[i][V.indexOf(v)]; R.pi[v] = r.pi[v]; }); R.src = u;
      R.rows.push([u, V.map(v => `${v}:${fd(r.d[v])}`).join(' '), V.map((v, j) => `${v}:${fd(R.M.D[i][j])}`).join(' ')]);
      R.snap({ line: ['j5', 'j6', 'j7'], vars: { u }, msg: `Dijkstra from <b>${u}</b> with ŵ gives δ̂(${u}, ·) = ${V.map(v => fd(r.d[v])).join(', ')}. Undo the reweighting: d[${u}][v] = δ̂(${u}, v) + h(v) − h(${u}). Row ${u} of D is now final; the highlighted edges are ${u}’s shortest-path tree.` });
    });
    R.M.i = null;
    R.snap({ line: ['j8'], msg: `All ${n} Dijkstra runs are done. D is the same matrix Floyd–Warshall computes, found in O(V E log V) time: faster on sparse graphs.` });
    return { status: 'ok' };
  }

  // ---------- run ----------
  function run(alg, G, o) {
    const R = recorder(G);
    let res, tooMany = false;
    try {
      res = ({ bfs: runBFS, dij: runDij, bf: runBF, dag: runDAG, fw: runFW, jo: runJo })[alg](R, G, o);
    } catch (e) { if (e !== TOO_MANY) throw e; tooMany = true; res = { status: 'too-many' }; }
    const truth = bellmanFord(G, o.source);
    let row = null;
    if (res.status === 'ok') {
      if (ALGS[alg].kind === 'ss') row = Object.assign({}, R.d);
      else { const i = G.V.indexOf(o.source); row = {}; G.V.forEach((v, j) => row[v] = R.M.D[i][j]); }
    }
    let msg = '';
    if (tooMany) msg = `Stopped after ${MAX_STEPS} steps to keep the simulation readable. Use a smaller graph.`;
    else if (res.status === 'negcycle') msg = R.steps[R.steps.length - 1].msg;
    else if (res.status === 'notdag') msg = R.steps[R.steps.length - 1].msg;
    else {
      const wrong = truth.neg ? null : G.V.filter(v => row[v] !== truth.d[v]);
      const dist = G.V.map(v => `${v} = ${fd(row[v])}`).join(', ');
      msg = `Distances from <b>${o.source}</b>: ${dist}. `;
      if (alg === 'bfs' && truth.neg) msg += `These count <b>edges</b>. Weighted distances are not defined here: a negative cycle is reachable from ${o.source}.`;
      else if (alg === 'bfs') msg += wrong && wrong.length ? `These count <b>edges</b>. With weights, the least-weight distances differ at ${wrong.join(', ')} (Bellman–Ford: ${wrong.map(v => `${v} = ${fd(truth.d[v])}`).join(', ')}).` : `Here they equal the weighted distances too.`;
      else if (truth.neg) msg += `But a negative cycle is reachable from ${o.source}, so these are not shortest paths.`;
      else if (wrong.length) msg += `<b>Wrong</b> at ${wrong.join(', ')}: the true distances are ${wrong.map(v => `${v} = ${fd(truth.d[v])}`).join(', ')}. A negative edge broke Dijkstra’s rule that a vertex is final once it is extracted.`;
      else msg += `All correct (checked against Bellman–Ford). ${R.relax} relaxation${R.relax === 1 ? '' : 's'}, ${R.upd} improvement${R.upd === 1 ? '' : 's'}. Pick a target to see its path.`;
    }
    R.cur = null; R.Q = [];
    R.snap({ line: [], msg, final: true });
    return { steps: R.steps, result: Object.assign({ relax: R.relax, upd: R.upd, row, tooMany }, res), truth, code: code(alg, o), header: header(alg, G) };
  }

  const API = { ALGS, INF, fd, plus, natural, parseGraph, run, bellmanFord, topo, pathFromPi, pathFromP, code, header };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SPEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
