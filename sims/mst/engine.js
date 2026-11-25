/* Minimum spanning tree engine: Kruskal (union-find), Prim (priority queue), Boruvka and reverse-delete.
   Records every step for the simulation. Works in the browser (window.MSTEngine) and in Node. */
(function (root) {
  const MAX_STEPS = 1200, INF = Infinity, NAME = /^[A-Za-z0-9]{1,4}$/;
  const ALGS = {
    kru: { name: 'Kruskal’s algorithm', short: 'Kruskal' },
    prim: { name: 'Prim’s algorithm', short: 'Prim' },
    bor: { name: 'Borůvka’s algorithm', short: 'Borůvka' },
    rev: { name: 'Reverse-delete', short: 'Reverse-delete' }
  };
  const natural = (a, b) => {
    const na = /^\d+$/.test(a), nb = /^\d+$/.test(b);
    if (na && nb) return a - b;
    if (na !== nb) return na ? -1 : 1;
    return a < b ? -1 : a > b ? 1 : 0;
  };
  const fw = x => x === INF ? '∞' : x < 0 ? '−' + (-x) : String(x);
  const en = e => `(${e.u}, ${e.v})`;

  function parseGraph(text) {
    const lines = text.split(/[\n;,]+/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return { error: 'Type at least one edge, for example a b 4.' };
    const E = [], seen = new Set();
    for (const ln of lines) {
      const t = ln.split(/\s+/);
      if (t.length < 2 || t.length > 3) return { error: `“${ln}” is not an edge. Write two vertex names and a weight, like a b 4.` };
      const [u, v] = t, w = t.length === 3 ? Number(t[2]) : 1;
      if (!NAME.test(u) || !NAME.test(v)) return { error: `In “${ln}”: vertex names are 1 to 4 letters or digits.` };
      if (u === v) return { error: `In “${ln}”: a self-loop can never be in a spanning tree; remove it.` };
      if (!Number.isInteger(w) || w < -999 || w > 999) return { error: `In “${ln}”: the weight must be a whole number from −999 to 999.` };
      const old = E.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
      if (old) old.w = w; else E.push({ u, v, w, id: E.length });
      seen.add(u); seen.add(v);
    }
    const V = [...seen].sort(natural);
    if (V.length > 12) return { error: `That graph has ${V.length} vertices. Use at most 12.` };
    if (E.length > 30) return { error: `That graph has ${E.length} edges. Use at most 30.` };
    E.forEach((e, i) => e.id = i);
    const adj = {}; V.forEach(x => adj[x] = []);
    E.forEach(e => { adj[e.u].push({ v: e.v, e }); adj[e.v].push({ v: e.u, e }); });
    V.forEach(x => adj[x].sort((p, q) => natural(p.v, q.v)));
    return { V, E, adj };
  }
  // total order used everywhere for ties: weight, then edge name
  const cmpE = (a, b) => a.w - b.w || natural(a.u < a.v ? a.u : a.v, b.u < b.v ? b.u : b.v) || natural(a.u < a.v ? a.v : a.u, b.u < b.v ? b.v : b.u);

  function components(V, edges) {
    const p = {}; V.forEach(v => p[v] = v);
    const f = x => p[x] === x ? x : (p[x] = f(p[x]));
    edges.forEach(e => { const a = f(e.u), b = f(e.v); if (a !== b) p[a] = b; });
    const g = {}; V.forEach(v => (g[f(v)] = g[f(v)] || []).push(v));
    return Object.values(g);
  }
  function connected(V, edges, u, v) {
    const adj = {}; V.forEach(x => adj[x] = []);
    edges.forEach(e => { adj[e.u].push(e.v); adj[e.v].push(e.u); });
    const seen = new Set([u]), q = [u];
    while (q.length) { const x = q.shift(); if (x === v) return true; adj[x].forEach(y => { if (!seen.has(y)) { seen.add(y); q.push(y); } }); }
    return false;
  }

  const TOO = {};
  function recorder(G) {
    const R = { steps: [], st: {}, comp: null, rows: [], exam: 0, tree: [], key: null, pi: null, inT: null, Q: null, dsu: null, cand: [] };
    G.E.forEach(e => R.st[e.id] = '');
    R.snap = o => {
      R.steps.push(Object.assign({
        line: [], msg: '', st: Object.assign({}, R.st), comp: R.comp ? R.comp.map(c => c.slice()) : components(G.V, R.tree),
        rows: R.rows.map(r => r.slice()), exam: R.exam, weight: R.tree.reduce((a, e) => a + e.w, 0), nT: R.tree.length, vars: {}, hot: null,
        key: R.key ? Object.assign({}, R.key) : null, pi: R.pi ? Object.assign({}, R.pi) : null, inT: R.inT ? [...R.inT] : null, Q: R.Q ? R.Q.slice() : null,
        dsu: R.dsu ? { p: Object.assign({}, R.dsu.p), r: Object.assign({}, R.dsu.r) } : null, cand: R.cand.slice(), cur: null
      }, o));
      if (R.steps.length > MAX_STEPS) throw TOO;
    };
    return R;
  }

  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  function code(alg) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (alg === 'kru') {
      P('MST-KRUSKAL(G, w)');
      L('k1', `A = ∅`);
      L('k2', `${kw('for each')} v ∈ G.V:  MAKE-SET(v)`);
      L('k3', `sort G.E into non-decreasing order by weight w`);
      L('k4', `${kw('for each')} edge (u, v) ${kw('in')} that order`);
      L('k5', `    ${kw('if')} FIND-SET(u) ≠ FIND-SET(v)   ${cm('▷ no cycle')}`);
      L('k6', `        A = A ∪ {(u, v)}`);
      L('k7', `        UNION(u, v)`);
      L('k8', `${kw('return')} A`);
      P('Union-find (union by rank, path compression)');
      L('u1', `FIND-SET(x): ${kw('if')} x ≠ x.p: x.p = FIND-SET(x.p);  ${kw('return')} x.p`);
      L('u2', `UNION(x, y): link the root of lower rank under the other`);
    } else if (alg === 'prim') {
      P('MST-PRIM(G, w, r)');
      L('p1', `${kw('for each')} u ∈ G.V:  u.key = ∞;  u.π = NIL`);
      L('p2', `r.key = 0`);
      L('p3', `Q = G.V   ${cm('▷ min-priority queue on key')}`);
      L('p4', `${kw('while')} Q ≠ ∅`);
      L('p5', `    u = EXTRACT-MIN(Q)   ${cm('▷ add (u.π, u) to the tree')}`);
      L('p6', `    ${kw('for each')} v ∈ G.Adj[u]`);
      L('p7', `        ${kw('if')} v ∈ Q ${kw('and')} w(u, v) < v.key`);
      L('p8', `            v.π = u;   v.key = w(u, v)   ${cm('▷ DECREASE-KEY')}`);
    } else if (alg === 'bor') {
      P('BORŮVKA(G, w)');
      L('b1', `A = ∅;   every vertex is its own component`);
      L('b2', `${kw('while')} there is more than one component (and an edge joins two)`);
      L('b3', `    ${kw('for each')} component C`);
      L('b4', `        find the cheapest edge with exactly one end in C`);
      L('b5', `    add all these cheapest edges to A   ${cm('▷ duplicates once')}`);
      L('b6', `    merge the components they join`);
      L('b7', `${kw('return')} A`);
    } else {
      P('REVERSE-DELETE(G, w)');
      L('r1', `T = G.E`);
      L('r2', `sort the edges into non-increasing order by weight`);
      L('r3', `${kw('for each')} edge e = (u, v) ${kw('in')} that order`);
      L('r4', `    ${kw('if')} T − {e} still connects u and v   ${cm('▷ e lies on a cycle')}`);
      L('r5', `        T = T − {e}   ${cm('▷ the heaviest edge of a cycle')}`);
      L('r6', `${kw('return')} T`);
    }
    return C;
  }
  function header(alg) {
    if (alg === 'kru') return ['#', 'Edge (weight)', 'FIND-SET(u)', 'FIND-SET(v)', 'Decision', 'Tree weight'];
    if (alg === 'prim') return ['Step', 'u = EXTRACT-MIN', 'Edge added', 'Keys lowered', 'Tree weight'];
    if (alg === 'bor') return ['Round', 'Cheapest edge of each component', 'Edges added', 'Components after'];
    return ['#', 'Edge (weight)', 'Still connected without it?', 'Decision', 'Edges left'];
  }

  function kru(R, G) {
    const p = {}, r = {}; G.V.forEach(v => { p[v] = v; r[v] = 0; }); R.dsu = { p, r };
    const find = x => { if (p[x] !== x) p[x] = find(p[x]); return p[x]; };
    R.snap({ line: ['k1', 'k2'], msg: `Start with an empty forest: every vertex is a tree of its own (MAKE-SET). Kruskal grows a <b>forest</b> and joins trees with the lightest safe edge.` });
    const S = G.E.slice().sort(cmpE);
    R.order = S.map(e => e.id);
    R.snap({ line: ['k3'], msg: `Sort the ${S.length} edges by weight: ${S.map(e => `${en(e)} ${fw(e.w)}`).join(', ')}.` });
    let k = 0;
    for (const e of S) {
      k++; R.exam++;
      const ru = find(e.u), rv = find(e.v);
      if (ru !== rv) {
        R.st[e.id] = 'tree'; R.tree.push(e);
        if (r[ru] < r[rv]) p[ru] = rv; else if (r[ru] > r[rv]) p[rv] = ru; else { p[rv] = ru; r[ru]++; }
        R.rows.push([k, `${en(e)} ${fw(e.w)}`, ru, rv, 'accept', R.tree.reduce((a, x) => a + x.w, 0)]);
        R.snap({ line: ['k4', 'k5', 'k6', 'k7', 'u1', 'u2'], hot: e.id, vars: { edge: en(e), 'w': fw(e.w), 'FIND(u)': ru, 'FIND(v)': rv },
          msg: `Edge ${en(e)} with weight ${fw(e.w)}: ${e.u} is in the tree with root ${ru}, ${e.v} in the tree with root ${rv}. Different trees, so the edge joins them without a cycle: <b>accept</b> it and UNION the two sets.` + (R.tree.length === G.V.length - 1 ? ` That is |V| − 1 = ${G.V.length - 1} edges: the tree is complete.` : '') });
        if (R.tree.length === G.V.length - 1) {
          G.E.forEach(x => { if (!R.st[x.id]) R.st[x.id] = 'skip'; });
          if (k < S.length) R.snap({ line: ['k8'], msg: `The tree already has |V| − 1 edges, so the remaining ${S.length - k} edge${S.length - k === 1 ? '' : 's'} would all make cycles. A real implementation can stop here.` });
          break;
        }
      } else {
        R.st[e.id] = 'rej';
        R.rows.push([k, `${en(e)} ${fw(e.w)}`, ru, rv, 'reject: cycle', R.tree.reduce((a, x) => a + x.w, 0)]);
        R.snap({ line: ['k4', 'k5', 'u1'], hot: e.id, vars: { edge: en(e), 'w': fw(e.w), 'FIND(u)': ru, 'FIND(v)': rv },
          msg: `Edge ${en(e)} with weight ${fw(e.w)}: FIND-SET(${e.u}) = FIND-SET(${e.v}) = ${ru}. Both ends are already in the same tree, so this edge would close a <b>cycle</b>: reject it.` });
      }
    }
  }

  function prim(R, G, o) {
    const r = o.root, key = {}, pi = {}, inT = new Set();
    G.V.forEach(v => { key[v] = INF; pi[v] = null; }); key[r] = 0;
    R.key = key; R.pi = pi; R.inT = inT;
    const syncQ = () => { R.Q = G.V.filter(v => !inT.has(v)).sort((a, b) => key[a] - key[b] || natural(a, b)); };
    const edgeOf = (a, b) => G.E.find(x => (x.u === a && x.v === b) || (x.u === b && x.v === a));
    const markCand = () => {   // light edge candidates: (v.pi, v) for every v outside the tree
      G.E.forEach(x => { if (R.st[x.id] === 'cand') R.st[x.id] = ''; });
      G.V.forEach(v => { if (!inT.has(v) && pi[v] != null) R.st[edgeOf(pi[v], v).id] = 'cand'; });
    };
    syncQ();
    R.snap({ line: ['p1', 'p2', 'p3'], msg: `Prim grows <b>one tree</b> from the root ${r}. v.key is the weight of the lightest edge joining v to the tree so far (∞ if none). Start with ${r}.key = 0.` });
    let k = 0;
    while (R.Q.length) {
      const u = R.Q[0];
      if (key[u] === INF) {
        R.snap({ line: ['p4', 'p5'], msg: `The smallest key left is ∞: ${R.Q.join(', ')} cannot be reached from ${r}. The graph is <b>not connected</b>, so there is no spanning tree; Prim has built the MST of ${r}’s component.` });
        break;
      }
      inT.add(u); k++; syncQ();
      let added = '—';
      if (pi[u] != null) { const e = edgeOf(u, pi[u]); R.st[e.id] = 'tree'; R.tree.push(e); added = `${en(e)} ${fw(e.w)}`; }
      R.exam++;
      R.snap({ line: ['p4', 'p5'], cur: u, hot: pi[u] != null ? R.tree[R.tree.length - 1].id : null, vars: { u, 'u.key': fw(key[u]), 'u.π': pi[u] || 'NIL' },
        msg: pi[u] == null ? `EXTRACT-MIN gives the root <b>${u}</b>. It starts the tree.` : `EXTRACT-MIN gives <b>${u}</b> with key ${fw(key[u])}: the lightest edge leaving the tree is (${pi[u]}, ${u}). Add it.` });
      const low = [];
      for (const { v, e } of G.adj[u]) {
        if (inT.has(v)) continue;
        R.exam++;
        if (e.w < key[v]) {
          const old = key[v]; key[v] = e.w; pi[v] = u; syncQ(); low.push(`${v}: ${fw(old)}→${fw(e.w)}`);
          markCand();
          R.snap({ line: ['p6', 'p7', 'p8'], cur: u, hot: e.id, vars: { u, v, 'w(u,v)': fw(e.w), 'v.key': fw(key[v]) }, msg: `${v} is not in the tree and w(${u}, ${v}) = ${fw(e.w)} &lt; ${v}.key = ${fw(old)}: lower ${v}.key to ${fw(e.w)} and set ${v}.π = ${u}.` });
        } else {
          R.snap({ line: ['p6', 'p7'], cur: u, hot: e.id, vars: { u, v, 'w(u,v)': fw(e.w), 'v.key': fw(key[v]) }, msg: `w(${u}, ${v}) = ${fw(e.w)} ≥ ${v}.key = ${fw(key[v])}: ${v} already has a lighter connection to the tree (via ${pi[v]}). No change.` });
        }
      }
      R.rows.push([k, `${u} (${fw(key[u])})`, added, low.join(', ') || '—', R.tree.reduce((a, x) => a + x.w, 0)]);
    }
    G.E.forEach(x => { if (R.st[x.id] === 'cand' || !R.st[x.id]) R.st[x.id] = 'skip'; });
    R.Q = [];
  }

  function bor(R, G) {
    R.snap({ line: ['b1'], msg: `Every vertex starts as its own component. In each round, <b>every</b> component picks the cheapest edge leaving it, and all of them are added at once. The number of components at least halves per round.` });
    let round = 0;
    for (;;) {
      const comps = components(G.V, R.tree);
      if (comps.length === 1) break;
      round++;
      const cid = {}; comps.forEach((c, i) => c.forEach(v => cid[v] = i));
      const best = comps.map(() => null);
      for (const e of G.E) {
        R.exam++;
        const a = cid[e.u], b = cid[e.v];
        if (a === b) continue;
        if (!best[a] || cmpE(e, best[a]) < 0) best[a] = e;
        if (!best[b] || cmpE(e, best[b]) < 0) best[b] = e;
      }
      if (best.every(x => !x)) {
        R.snap({ line: ['b2'], msg: `No edge joins two different components: the graph is <b>not connected</b>. The result is a minimum spanning <b>forest</b>.` });
        break;
      }
      R.cand = [];
      comps.forEach((c, i) => {
        if (!best[i]) return;
        const e = best[i];
        if (R.st[e.id] !== 'tree') R.st[e.id] = 'cand';
        R.cand.push(e.id);
        R.snap({ line: ['b3', 'b4'], hot: e.id, vars: { round, component: `{${c.join(', ')}}` }, msg: `Round ${round}: the cheapest edge leaving component {${c.join(', ')}} is ${en(e)} with weight ${fw(e.w)}.` });
      });
      const add = [...new Set(best.filter(Boolean))];
      add.forEach(e => { R.st[e.id] = 'tree'; R.tree.push(e); });
      R.cand = [];
      const after = components(G.V, R.tree);
      R.rows.push([round, comps.map((c, i) => best[i] ? `{${c.join(',')}}→${en(best[i])}` : '').filter(Boolean).join('  '), add.map(e => `${en(e)} ${fw(e.w)}`).join(', '), after.length]);
      R.snap({ line: ['b5', 'b6'], vars: { round }, msg: `Add the ${add.length} chosen edge${add.length === 1 ? '' : 's'} (${add.map(en).join(', ')})${add.length < comps.length ? ` — some were chosen by both of their components, so they are added once` : ''}. ${comps.length} components merge into ${after.length}.` });
    }
    G.E.forEach(x => { if (!R.st[x.id]) R.st[x.id] = 'skip'; });
  }

  function rev(R, G) {
    let T = G.E.slice();
    const S = G.E.slice().sort((a, b) => -cmpE(a, b));
    R.order = S.map(e => e.id);
    G.E.forEach(e => R.st[e.id] = 'tree'); R.tree = T.slice();
    R.snap({ line: ['r1', 'r2'], msg: `Start with <b>every</b> edge and delete edges, heaviest first, as long as the graph stays connected. Order: ${S.map(e => `${en(e)} ${fw(e.w)}`).join(', ')}.` });
    let k = 0;
    for (const e of S) {
      k++; R.exam++;
      const rest = T.filter(x => x !== e), still = connected(G.V, rest, e.u, e.v);
      if (still) {
        T = rest; R.st[e.id] = 'rej'; R.tree = T.slice();
        R.rows.push([k, `${en(e)} ${fw(e.w)}`, 'yes', 'delete', T.length]);
        R.snap({ line: ['r3', 'r4', 'r5'], hot: e.id, vars: { edge: en(e), w: fw(e.w) }, msg: `Edge ${en(e)} with weight ${fw(e.w)}: ${e.u} and ${e.v} are still connected without it, so it lies on a cycle and is the heaviest edge left on that cycle. <b>Delete</b> it.` });
      } else {
        R.rows.push([k, `${en(e)} ${fw(e.w)}`, 'no', 'keep (bridge)', T.length]);
        R.snap({ line: ['r3', 'r4'], hot: e.id, vars: { edge: en(e), w: fw(e.w) }, msg: `Edge ${en(e)} with weight ${fw(e.w)}: without it, ${e.u} and ${e.v} would be disconnected. It is a <b>bridge</b> of what is left, so <b>keep</b> it.` });
      }
    }
  }

  function run(alg, G, o) {
    const R = recorder(G);
    let tooMany = false;
    try { ({ kru, prim, bor, rev })[alg](R, G, o); } catch (e) { if (e !== TOO) throw e; tooMany = true; }
    const comps = components(G.V, G.E), wt = R.tree.reduce((a, e) => a + e.w, 0);
    let msg;
    if (tooMany) msg = 'Stopped: too many steps. Use a smaller graph.';
    else if (comps.length > 1) msg = `The graph has ${comps.length} connected components, so it has no spanning tree. ${ALGS[alg].short} produced a minimum spanning ${alg === 'prim' ? 'tree of the root’s component' : 'forest'}: ${R.tree.length} edges, total weight <b>${wt}</b>.`;
    else msg = `Minimum spanning tree: ${R.tree.length} edges (|V| − 1 = ${G.V.length - 1}), total weight <b>${wt}</b>. Edges: ${R.tree.slice().sort(cmpE).map(e => `${en(e)} ${fw(e.w)}`).join(', ')}.`;
    R.snap({ line: [], msg, final: true });
    return { steps: R.steps, result: { weight: wt, edges: R.tree.slice(), exam: R.exam, tooMany, comps: comps.length }, code: code(alg), header: header(alg), order: R.order || null };
  }
  // is the MST unique? (an MST is unique iff no non-tree edge has the same weight as the heaviest tree edge on the cycle it closes)
  function unique(G, tree) {
    const T = new Set(tree.map(e => e.id));
    for (const e of G.E) {
      if (T.has(e.id)) continue;
      // path in tree from e.u to e.v; max weight on it
      const adj = {}; G.V.forEach(v => adj[v] = []);
      tree.forEach(t => { adj[t.u].push([t.v, t.w]); adj[t.v].push([t.u, t.w]); });
      const best = { [e.u]: -INF }, q = [e.u];
      while (q.length) { const x = q.shift(); adj[x].forEach(([y, w]) => { if (!(y in best)) { best[y] = Math.max(best[x], w); q.push(y); } }); }
      if (e.v in best && best[e.v] === e.w) return false;
    }
    return true;
  }

  const API = { ALGS, parseGraph, run, components, unique, cmpE, natural, fw, code, header };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.MSTEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
