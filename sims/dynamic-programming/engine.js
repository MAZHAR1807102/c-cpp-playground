/* Dynamic-programming engine: Fibonacci (plain recursion, memoization, tabulation), rod cutting, coin change,
   longest increasing subsequence, 0/1 knapsack, LCS, edit distance and matrix-chain multiplication.
   Every run returns a list of steps; each step holds deep copies of the DP tables (with per-cell highlight classes),
   an optional recursion tree and call stack, the trace rows so far and the pseudocode line(s) to highlight.
   Works in the browser (window.DPEngine) and in Node. */
(function (root) {
  const MODES = {
    fibrec: { name: 'Fibonacci by plain recursion', short: 'Plain recursion', group: 'fib' },
    fibmemo: { name: 'Fibonacci with memoization (top-down)', short: 'Memoization', group: 'fib' },
    fibtab: { name: 'Fibonacci by tabulation (bottom-up)', short: 'Tabulation', group: 'fib' },
    rod: { name: 'Rod cutting', short: 'Rod cutting', group: 'one' },
    coin: { name: 'Coin change (fewest coins)', short: 'Coin change', group: 'one' },
    lis: { name: 'Longest increasing subsequence', short: 'LIS', group: 'one' },
    knap: { name: '0/1 knapsack', short: '0/1 knapsack', group: 'two' },
    lcs: { name: 'Longest common subsequence', short: 'LCS', group: 'two' },
    edit: { name: 'Edit (Levenshtein) distance', short: 'Edit distance', group: 'two' },
    mcm: { name: 'Matrix-chain multiplication', short: 'Matrix chain', group: 'two' }
  };
  const INF = Infinity;
  const f = x => x === INF ? '∞' : x === -INF ? '−∞' : x == null ? '·' : typeof x === 'number' && x < 0 ? '−' + (-x) : String(x);
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  const range = (a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; };

  function recorder() {
    const R = { steps: [], rows: [], ops: 0, tables: [], tree: null, stack: null };
    R.table = (title, rh, ch) => { const t = { title, rh, ch, v: rh.map(() => ch.map(() => null)), arrow: null, keep: {}, cls: {} }; R.tables.push(t); return t; };
    R.snap = o => {
      R.steps.push(Object.assign({ line: [], msg: '', vars: {} }, o, {
        tables: R.tables.map(t => ({ title: t.title, rh: t.rh.slice(), ch: t.ch.slice(), v: t.v.map(r => r.slice()), arrow: t.arrow ? t.arrow.map(r => r.slice()) : null, cls: Object.assign({}, t.keep, t.cls) })),
        tree: R.tree ? R.tree.map(n => Object.assign({}, n)) : null,
        stack: R.stack ? R.stack.slice() : null,
        rows: R.rows.map(r => r.slice()), ops: R.ops
      }));
      R.tables.forEach(t => { t.cls = {}; });
    };
    return R;
  }
  const at = (i, j) => `${i},${j}`;

  /* ---------------- pseudocode ---------------- */
  function code(mode) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (mode === 'fibrec') {
      P('FIB(n)   ▷ exponential: the same subproblems are solved again and again');
      L('a', `${kw('if')} n ≤ 1:  ${kw('return')} n`);
      L('b', `${kw('return')} FIB(n − 1) + FIB(n − 2)`);
    } else if (mode === 'fibmemo') {
      P('MEMO-FIB(n)   ▷ memo[·] starts empty');
      L('a', `${kw('if')} memo[n] is set:  ${kw('return')} memo[n]   ${cm('▷ memo hit')}`);
      L('b', `${kw('if')} n ≤ 1:  memo[n] = n`);
      L('c', `${kw('else')} memo[n] = MEMO-FIB(n − 1) + MEMO-FIB(n − 2)`);
      L('d', `${kw('return')} memo[n]`);
    } else if (mode === 'fibtab') {
      P('BOTTOM-UP-FIB(n)');
      L('a', `F[0] = 0;   F[1] = 1`);
      L('b', `${kw('for')} i = 2 ${kw('to')} n:   F[i] = F[i − 1] + F[i − 2]`);
      L('c', `${kw('return')} F[n]`);
    } else if (mode === 'rod') {
      P('BOTTOM-UP-CUT-ROD(p, n)   ▷ CLRS 15.1');
      L('a', `r[0] = 0`);
      L('b', `${kw('for')} j = 1 ${kw('to')} n:   q = −∞`);
      L('c', `    ${kw('for')} i = 1 ${kw('to')} j:   ${cm('▷ first piece has length i')}`);
      L('d', `        ${kw('if')} q < p[i] + r[j − i]:   q = p[i] + r[j − i];   s[j] = i`);
      L('e', `    r[j] = q`);
      P('PRINT-CUT-ROD-SOLUTION');
      L('f', `${kw('while')} n > 0:   print s[n];   n = n − s[n]`);
    } else if (mode === 'coin') {
      P('MIN-COINS(coins, A)');
      L('a', `dp[0] = 0;   dp[a] = ∞ for a = 1 … A`);
      L('b', `${kw('for')} a = 1 ${kw('to')} A:`);
      L('c', `    ${kw('for each')} coin c ≤ a:`);
      L('d', `        ${kw('if')} dp[a − c] + 1 < dp[a]:   dp[a] = dp[a − c] + 1;   use[a] = c`);
      P('RECONSTRUCT');
      L('e', `${kw('while')} a > 0:   print use[a];   a = a − use[a]`);
    } else if (mode === 'lis') {
      P('LIS(A)   ▷ L[i] = longest increasing subsequence ending at i');
      L('a', `${kw('for')} i = 0 ${kw('to')} n − 1:   L[i] = 1;   prev[i] = −`);
      L('b', `    ${kw('for')} j = 0 ${kw('to')} i − 1:`);
      L('c', `        ${kw('if')} A[j] < A[i] ${kw('and')} L[j] + 1 > L[i]:   L[i] = L[j] + 1;   prev[i] = j`);
      L('d', `${kw('return')} max L[i];  follow prev[·] back from that i`);
    } else if (mode === 'knap') {
      P('KNAPSACK-01(w, v, W)   ▷ K[i][c] = best value, items 1..i, capacity c');
      L('a', `K[0][c] = 0 for every c`);
      L('b', `${kw('for')} i = 1 ${kw('to')} n,  ${kw('for')} c = 0 ${kw('to')} W:`);
      L('c', `    ${kw('if')} w[i] > c:   K[i][c] = K[i − 1][c]   ${cm('▷ item i does not fit')}`);
      L('d', `    ${kw('else')} K[i][c] = max(K[i − 1][c],  v[i] + K[i − 1][c − w[i]])`);
      P('RECONSTRUCT');
      L('e', `${kw('for')} i = n ${kw('downto')} 1:   ${kw('if')} K[i][c] ≠ K[i − 1][c]:  take i;  c = c − w[i]`);
    } else if (mode === 'lcs') {
      P('LCS-LENGTH(X, Y)   ▷ CLRS 15.4');
      L('a', `c[i][0] = 0;   c[0][j] = 0`);
      L('b', `${kw('for')} i = 1 ${kw('to')} m,  ${kw('for')} j = 1 ${kw('to')} n:`);
      L('c', `    ${kw('if')} x[i] == y[j]:   c[i][j] = c[i − 1][j − 1] + 1;   b = “↖”`);
      L('d', `    ${kw('elif')} c[i − 1][j] ≥ c[i][j − 1]:   c[i][j] = c[i − 1][j];   b = “↑”`);
      L('e', `    ${kw('else')}   c[i][j] = c[i][j − 1];   b = “←”`);
      P('PRINT-LCS   ▷ follow the arrows from c[m][n]');
      L('f', `↖: output x[i], go to (i − 1, j − 1);   ↑: i = i − 1;   ←: j = j − 1`);
    } else if (mode === 'edit') {
      P('EDIT-DISTANCE(X, Y)');
      L('a', `D[i][0] = i;   D[0][j] = j`);
      L('b', `${kw('for')} i = 1 ${kw('to')} m,  ${kw('for')} j = 1 ${kw('to')} n:`);
      L('c', `    D[i][j] = min( D[i − 1][j] + 1  ${cm('delete')},  D[i][j − 1] + 1  ${cm('insert')},`);
      L('d', `                   D[i − 1][j − 1] + [x[i] ≠ y[j]]  ${cm('match / substitute')} )`);
      P('RECONSTRUCT');
      L('e', `follow the chosen moves back from D[m][n]`);
    } else if (mode === 'mcm') {
      P('MATRIX-CHAIN-ORDER(p)   ▷ CLRS 15.2;  A_i is p[i−1] × p[i]');
      L('a', `m[i][i] = 0 for i = 1 … n`);
      L('b', `${kw('for')} l = 2 ${kw('to')} n,  ${kw('for')} i = 1 ${kw('to')} n − l + 1:   j = i + l − 1;   m[i][j] = ∞`);
      L('c', `    ${kw('for')} k = i ${kw('to')} j − 1:   q = m[i][k] + m[k + 1][j] + p[i−1]·p[k]·p[j]`);
      L('d', `        ${kw('if')} q < m[i][j]:   m[i][j] = q;   s[i][j] = k`);
      P('PRINT-OPTIMAL-PARENS(s, 1, n)');
      L('e', `split at s[i][j];  print “(” left part, right part “)”`);
    }
    return C;
  }
  function header(mode) {
    return ({
      fibrec: ['Call', 'Returns', 'Calls so far'], fibmemo: ['Call', 'Event', 'Returns'], fibtab: ['i', 'F[i − 1] + F[i − 2]', 'F[i]'],
      rod: ['j', 'i', 'p[i] + r[j − i]', 'q (best so far)', 's[j]'], coin: ['a', 'coin c', 'dp[a − c] + 1', 'dp[a]', 'use[a]'],
      lis: ['i', 'j', 'A[j] < A[i]?', 'L[j] + 1', 'L[i]', 'prev[i]'], knap: ['i (w, v)', 'c', 'skip K[i−1][c]', 'take v + K[i−1][c−w]', 'K[i][c]'],
      lcs: ['i, j', 'x[i] vs y[j]', 'Rule', 'c[i][j]'], edit: ['i, j', 'x[i] vs y[j]', 'del, ins, diag', 'D[i][j]', 'Move'],
      mcm: ['(i, j)', 'k', 'm[i][k] + m[k+1][j] + p·p·p', 'q', 'm[i][j]', 's[i][j]']
    })[mode];
  }

  /* ---------------- Fibonacci ---------------- */
  function fibrec(R, { n }) {
    R.tree = []; R.stack = []; let calls = 0;
    R.snap({ line: [], msg: `Compute F(${n}) straight from the definition F(n) = F(n − 1) + F(n − 2). Watch how often the same call appears in the tree.`, vars: { n } });
    function F(k, parent, depth) {
      const id = R.tree.length; calls++;
      R.tree.push({ id, parent, label: `F(${k})`, val: null, st: 'act' }); R.stack.push(`F(${k})`);
      if (k <= 1) {
        R.tree[id].val = k; R.tree[id].st = 'base'; R.rows.push([`F(${k})`, k, calls]);
        R.snap({ line: ['a'], cur: id, msg: `<code>F(${k})</code> is a base case: return ${k}.`, vars: { k, calls, depth } });
        R.stack.pop(); return k;
      }
      R.snap({ line: ['b'], cur: id, msg: `<code>F(${k})</code> calls <code>F(${k - 1})</code> and then <code>F(${k - 2})</code>.`, vars: { k, calls, depth } });
      const a = F(k - 1, id, depth + 1), b = F(k - 2, id, depth + 1); R.ops++;
      R.tree[id].val = a + b; R.tree[id].st = 'done'; R.rows.push([`F(${k})`, `${a} + ${b} = ${a + b}`, calls]);
      R.snap({ line: ['b'], cur: id, msg: `<code>F(${k})</code> = ${a} + ${b} = <b>${a + b}</b>.`, vars: { k, calls, depth } });
      R.stack.pop(); return a + b;
    }
    const v = F(n, -1, 0);
    const dup = {}; R.tree.forEach(t => dup[t.label] = (dup[t.label] || 0) + 1);
    R.result = { value: v, calls, dup };
  }
  function fibmemo(R, { n }) {
    R.tree = []; R.stack = []; let calls = 0, hits = 0;
    const t = R.table('memo', ['memo[k]'], range(0, n));
    R.snap({ line: [], msg: `Same recursion, but every answer is stored in <code>memo</code> the first time it is computed and looked up after that.`, vars: { n } });
    function F(k, parent, depth) {
      const id = R.tree.length; calls++;
      R.tree.push({ id, parent, label: `F(${k})`, val: null, st: 'act' }); R.stack.push(`F(${k})`);
      if (t.v[0][k] != null) {
        hits++; R.tree[id].val = t.v[0][k]; R.tree[id].st = 'memo'; t.cls[at(0, k)] = 'src';
        R.rows.push([`F(${k})`, 'memo hit', t.v[0][k]]);
        R.snap({ line: ['a'], cur: id, msg: `<code>F(${k})</code> is already in the memo: return ${t.v[0][k]} at once, with no further calls.`, vars: { k, calls, hits, depth } });
        R.stack.pop(); return t.v[0][k];
      }
      if (k <= 1) {
        t.v[0][k] = k; t.cls[at(0, k)] = 'new'; R.tree[id].val = k; R.tree[id].st = 'base';
        R.rows.push([`F(${k})`, 'base case, stored', k]);
        R.snap({ line: ['b', 'd'], cur: id, msg: `<code>F(${k})</code> is a base case: store memo[${k}] = ${k}.`, vars: { k, calls, hits, depth } });
        R.stack.pop(); return k;
      }
      R.snap({ line: ['c'], cur: id, msg: `memo[${k}] is empty, so <code>F(${k})</code> recurses on ${k - 1} and ${k - 2}.`, vars: { k, calls, hits, depth } });
      const a = F(k - 1, id, depth + 1), b = F(k - 2, id, depth + 1); R.ops++;
      t.v[0][k] = a + b; t.cls[at(0, k)] = 'new'; t.cls[at(0, k - 1)] = 'src'; t.cls[at(0, k - 2)] = 'src';
      R.tree[id].val = a + b; R.tree[id].st = 'done'; R.rows.push([`F(${k})`, `computed ${a} + ${b}, stored`, a + b]);
      R.snap({ line: ['c', 'd'], cur: id, msg: `memo[${k}] = ${a} + ${b} = <b>${a + b}</b>.`, vars: { k, calls, hits, depth } });
      R.stack.pop(); return a + b;
    }
    const v = F(n, -1, 0);
    R.result = { value: v, calls, hits };
  }
  function fibtab(R, { n }) {
    const t = R.table('F', ['F[i]'], range(0, n));
    R.snap({ line: [], msg: `Fill F[0..${n}] from left to right. Each entry needs only the two entries before it, which are already known.`, vars: { n } });
    t.v[0][0] = 0; t.cls[at(0, 0)] = 'new'; if (n >= 1) { t.v[0][1] = 1; t.cls[at(0, 1)] = 'new'; }
    R.snap({ line: ['a'], msg: `Base cases: F[0] = 0 and F[1] = 1.`, vars: { n } });
    for (let i = 2; i <= n; i++) {
      const a = t.v[0][i - 1], b = t.v[0][i - 2]; t.v[0][i] = a + b; R.ops++;
      t.cls[at(0, i - 1)] = 'src'; t.cls[at(0, i - 2)] = 'src'; t.cls[at(0, i)] = 'new';
      R.rows.push([i, `${a} + ${b}`, a + b]);
      R.snap({ line: ['b'], msg: `F[${i}] = F[${i - 1}] + F[${i - 2}] = ${a} + ${b} = <b>${a + b}</b>.`, vars: { i, 'F[i]': a + b } });
    }
    t.keep[at(0, n)] = 'path';
    R.snap({ line: ['c'], msg: `F(${n}) = <b>${t.v[0][n]}</b>.`, vars: { n } });
    R.result = { value: t.v[0][n] };
  }

  /* ---------------- 1-D tables ---------------- */
  function rod(R, { p }) {
    const n = p.length, P = [null, ...p];
    const t = R.table('Prices p, revenues r and first cut s', ['p[i]', 'r[j]', 's[j]'], range(0, n));
    for (let i = 1; i <= n; i++) t.v[0][i] = P[i];
    R.snap({ line: [], msg: `A rod of length ${n}; a piece of length i sells for p[i]. r[j] = best revenue for a rod of length j.`, vars: { n } });
    t.v[1][0] = 0; t.cls[at(1, 0)] = 'new';
    R.snap({ line: ['a'], msg: `r[0] = 0: an empty rod earns nothing.`, vars: { n } });
    for (let j = 1; j <= n; j++) {
      let q = -INF, s = 0;
      for (let i = 1; i <= j; i++) {
        const cand = P[i] + t.v[1][j - i]; R.ops++;
        t.cls[at(0, i)] = 'src'; t.cls[at(1, j - i)] = 'src'; t.cls[at(1, j)] = 'cur';
        const better = cand > q; if (better) { q = cand; s = i; }
        R.rows.push([j, i, `${P[i]} + ${t.v[1][j - i]} = ${cand}`, q, s]);
        R.snap({ line: ['c', 'd'], msg: `Length ${j}, first piece ${i}: p[${i}] + r[${j - i}] = ${P[i]} + ${t.v[1][j - i]} = ${cand}. ${better ? `New best q = <b>${q}</b>.` : `Not better than q = ${q}.`}`, vars: { j, i, q, 's[j]': s } });
      }
      t.v[1][j] = q; t.v[2][j] = s; t.cls[at(1, j)] = 'new'; t.cls[at(2, j)] = 'new';
      R.snap({ line: ['e'], msg: `r[${j}] = <b>${q}</b>, first piece s[${j}] = ${s}.`, vars: { j, q, 's[j]': s } });
    }
    const cuts = []; let m = n;
    while (m > 0) {
      cuts.push(t.v[2][m]); t.keep[at(2, m)] = 'path'; t.keep[at(0, t.v[2][m])] = 'path';
      R.snap({ line: ['f'], msg: `s[${m}] = ${t.v[2][m]}: cut a piece of length ${t.v[2][m]}, leaving ${m - t.v[2][m]}.`, vars: { n: m, cuts: cuts.join(' + ') } });
      m -= t.v[2][m];
    }
    R.result = { value: t.v[1][n], cuts, r: t.v[1].slice() };
  }
  function coin(R, { coins, A }) {
    const cs = coins.slice().sort((a, b) => a - b);
    const t = R.table('dp[a] = fewest coins that make a', ['dp[a]', 'use[a]'], range(0, A));
    t.v[0] = range(0, A).map(a => a === 0 ? 0 : INF);
    t.cls[at(0, 0)] = 'new';
    R.snap({ line: ['a'], msg: `Coins {${cs.join(', ')}}, target ${A}. dp[0] = 0; every other amount starts at ∞ (not reachable yet).`, vars: { A } });
    for (let a = 1; a <= A; a++) {
      for (const c of cs) {
        if (c > a) break;
        const prev = t.v[0][a - c], cand = prev + 1; R.ops++;
        t.cls[at(0, a - c)] = 'src'; t.cls[at(0, a)] = 'cur';
        const better = cand < t.v[0][a]; if (better) { t.v[0][a] = cand; t.v[1][a] = c; }
        R.rows.push([a, c, f(cand), f(t.v[0][a]), f(t.v[1][a])]);
        R.snap({ line: ['c', 'd'], msg: `Amount ${a}, last coin ${c}: dp[${a - c}] + 1 = ${f(cand)}. ${better ? `Better: dp[${a}] = <b>${cand}</b>.` : `Keep dp[${a}] = ${f(t.v[0][a])}.`}`, vars: { a, c, 'dp[a]': f(t.v[0][a]) } });
      }
      t.cls[at(0, a)] = 'new'; t.cls[at(1, a)] = 'new';
      R.snap({ line: ['b'], msg: t.v[0][a] === INF ? `Amount ${a} cannot be made: dp[${a}] = ∞.` : `dp[${a}] = <b>${t.v[0][a]}</b> (last coin ${t.v[1][a]}).`, vars: { a, 'dp[a]': f(t.v[0][a]) } });
    }
    const used = [];
    if (t.v[0][A] !== INF) {
      let a = A;
      while (a > 0) { used.push(t.v[1][a]); t.keep[at(0, a)] = 'path'; t.keep[at(1, a)] = 'path'; R.snap({ line: ['e'], msg: `use[${a}] = ${t.v[1][a]}: take a ${t.v[1][a]}, leaving ${a - t.v[1][a]}.`, vars: { a, coins: used.join(' + ') } }); a -= t.v[1][a]; }
    }
    R.result = { value: t.v[0][A], used };
  }
  function lis(R, { A }) {
    const n = A.length;
    const t = R.table('L[i] = length of the longest increasing subsequence ending at A[i]', ['A[i]', 'L[i]', 'prev[i]'], range(0, n - 1));
    t.v[0] = A.slice();
    R.snap({ line: [], msg: `Sequence of ${n} numbers. For each i, look back at every j < i with A[j] < A[i] and extend the best one.`, vars: { n } });
    for (let i = 0; i < n; i++) {
      t.v[1][i] = 1; t.v[2][i] = '−'; t.cls[at(1, i)] = 'cur';
      R.snap({ line: ['a'], msg: `Start L[${i}] = 1: A[${i}] = ${f(A[i])} on its own.`, vars: { i, 'L[i]': 1 } });
      for (let j = 0; j < i; j++) {
        R.ops++; const ok = A[j] < A[i], cand = t.v[1][j] + 1, better = ok && cand > t.v[1][i];
        if (better) { t.v[1][i] = cand; t.v[2][i] = j; }
        t.cls[at(0, j)] = 'src'; t.cls[at(1, j)] = 'src'; t.cls[at(0, i)] = 'cur'; t.cls[at(1, i)] = 'cur';
        R.rows.push([i, j, ok ? 'yes' : 'no', ok ? cand : '—', t.v[1][i], t.v[2][i]]);
        R.snap({ line: ['b', 'c'], msg: ok ? `A[${j}] = ${f(A[j])} < ${f(A[i])}: L[${j}] + 1 = ${cand}. ${better ? `Better: L[${i}] = <b>${cand}</b>, prev = ${j}.` : `Not better than ${t.v[1][i]}.`}` : `A[${j}] = ${f(A[j])} is not smaller than ${f(A[i])}: cannot come before it.`, vars: { i, j, 'L[i]': t.v[1][i] } });
      }
      t.cls[at(1, i)] = 'new'; t.cls[at(2, i)] = 'new';
      R.snap({ line: ['a'], msg: `L[${i}] = <b>${t.v[1][i]}</b>.`, vars: { i, 'L[i]': t.v[1][i] } });
    }
    let best = 0; for (let i = 1; i < n; i++) if (t.v[1][i] > t.v[1][best]) best = i;
    const seq = []; for (let i = best; i !== '−'; i = t.v[2][i]) { seq.unshift(A[i]); t.keep[at(0, i)] = 'path'; t.keep[at(1, i)] = 'path'; }
    R.snap({ line: ['d'], msg: `The largest L is L[${best}] = ${t.v[1][best]}. Following prev back gives ${seq.map(f).join(', ')}.`, vars: { length: t.v[1][best] } });
    R.result = { value: t.v[1][best], seq, L: t.v[1].slice() };
  }

  /* ---------------- 2-D tables ---------------- */
  function knap(R, { w, v, W }) {
    const n = w.length;
    const t = R.table('K[i][c]: best value using items 1..i with capacity c', ['0: none', ...w.map((x, i) => `${i + 1}: w${x} v${v[i]}`)], range(0, W));
    R.snap({ line: [], msg: `${n} items, capacity ${W}. Each item is taken whole or not at all.`, vars: { n, W } });
    for (let c = 0; c <= W; c++) { t.v[0][c] = 0; t.cls[at(0, c)] = 'new'; }
    R.snap({ line: ['a'], msg: `Row 0: with no items the value is 0 for every capacity.`, vars: { n, W } });
    for (let i = 1; i <= n; i++) {
      const wi = w[i - 1], vi = v[i - 1];
      for (let c = 0; c <= W; c++) {
        R.ops++; const skip = t.v[i - 1][c];
        t.cls[at(i - 1, c)] = 'src'; t.cls[at(i, c)] = 'new';
        if (wi > c) {
          t.v[i][c] = skip; R.rows.push([`${i} (${wi}, ${vi})`, c, skip, 'does not fit', skip]);
          R.snap({ line: ['b', 'c'], msg: `Item ${i} (weight ${wi}) does not fit in capacity ${c}: K[${i}][${c}] = K[${i - 1}][${c}] = ${skip}.`, vars: { i, c, 'K[i][c]': skip } });
        } else {
          const take = vi + t.v[i - 1][c - wi]; t.cls[at(i - 1, c - wi)] = take > skip ? 'win' : 'src'; if (take <= skip) t.cls[at(i - 1, c)] = 'win';
          t.v[i][c] = Math.max(skip, take); R.rows.push([`${i} (${wi}, ${vi})`, c, skip, `${vi} + ${t.v[i - 1][c - wi]} = ${take}`, t.v[i][c]]);
          R.snap({ line: ['b', 'd'], msg: `Capacity ${c}: skip item ${i} → ${skip}; take it → ${vi} + K[${i - 1}][${c - wi}] = ${take}. K[${i}][${c}] = <b>${t.v[i][c]}</b> (${take > skip ? 'take' : 'skip'}).`, vars: { i, c, 'K[i][c]': t.v[i][c] } });
        }
      }
    }
    const items = []; let c = W; t.keep[at(n, W)] = 'path';
    for (let i = n; i >= 1; i--) {
      const took = t.v[i][c] !== t.v[i - 1][c];
      if (took) { items.unshift(i); c -= w[i - 1]; }
      t.keep[at(i - 1, c)] = 'path';
      R.snap({ line: ['e'], msg: took ? `K[${i}][${c + w[i - 1]}] ≠ K[${i - 1}][${c + w[i - 1]}], so item ${i} was taken; capacity left ${c}.` : `K[${i}][${c}] = K[${i - 1}][${c}], so item ${i} was not taken.`, vars: { i, c, items: items.join(', ') || '—' } });
    }
    R.result = { value: t.v[n][W], items };
  }
  function lcs(R, { X, Y }) {
    const m = X.length, n = Y.length;
    const t = R.table('c[i][j] = LCS length of X[1..i] and Y[1..j]', ['∅', ...X.split('').map((ch, i) => `${i + 1} ${ch}`)], ['∅', ...Y.split('').map((ch, j) => `${j + 1} ${ch}`)]);
    t.arrow = t.v.map(r => r.map(() => ''));
    for (let i = 0; i <= m; i++) { t.v[i][0] = 0; t.cls[at(i, 0)] = 'new'; } for (let j = 0; j <= n; j++) { t.v[0][j] = 0; t.cls[at(0, j)] = 'new'; }
    R.snap({ line: ['a'], msg: `X = ${X} (m = ${m}), Y = ${Y} (n = ${n}). An empty prefix has LCS length 0, so row 0 and column 0 are 0.`, vars: { m, n } });
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      R.ops++; const xi = X[i - 1], yj = Y[j - 1]; let rule, line;
      if (xi === yj) { t.v[i][j] = t.v[i - 1][j - 1] + 1; t.arrow[i][j] = '↖'; t.cls[at(i - 1, j - 1)] = 'win'; rule = `match: c[${i - 1}][${j - 1}] + 1`; line = 'c'; }
      else if (t.v[i - 1][j] >= t.v[i][j - 1]) { t.v[i][j] = t.v[i - 1][j]; t.arrow[i][j] = '↑'; t.cls[at(i - 1, j)] = 'win'; t.cls[at(i, j - 1)] = 'src'; rule = `c[${i - 1}][${j}] = ${t.v[i - 1][j]} ≥ c[${i}][${j - 1}] = ${t.v[i][j - 1]}`; line = 'd'; }
      else { t.v[i][j] = t.v[i][j - 1]; t.arrow[i][j] = '←'; t.cls[at(i, j - 1)] = 'win'; t.cls[at(i - 1, j)] = 'src'; rule = `c[${i}][${j - 1}] = ${t.v[i][j - 1]} > c[${i - 1}][${j}] = ${t.v[i - 1][j]}`; line = 'e'; }
      t.cls[at(i, j)] = 'new';
      R.rows.push([`${i}, ${j}`, `${xi} vs ${yj}`, rule, `${t.v[i][j]} ${t.arrow[i][j]}`]);
      R.snap({ line: ['b', line], msg: `x[${i}] = ${xi}, y[${j}] = ${yj}: ${xi === yj ? 'equal, so extend the diagonal' : 'different, so copy the larger neighbour'}. c[${i}][${j}] = <b>${t.v[i][j]}</b> ${t.arrow[i][j]}.`, vars: { i, j, 'c[i][j]': t.v[i][j] } });
    }
    let i = m, j = n, out = '';
    while (i > 0 && j > 0) {
      t.keep[at(i, j)] = 'path'; const a = t.arrow[i][j];
      if (a === '↖') { out = X[i - 1] + out; R.snap({ line: ['f'], msg: `c[${i}][${j}] is ↖: ${X[i - 1]} is in the LCS. LCS so far (read backwards): <b>${out}</b>.`, vars: { i, j, LCS: out } }); i--; j--; }
      else if (a === '↑') { R.snap({ line: ['f'], msg: `c[${i}][${j}] is ↑: move up.`, vars: { i, j, LCS: out || '—' } }); i--; }
      else { R.snap({ line: ['f'], msg: `c[${i}][${j}] is ←: move left.`, vars: { i, j, LCS: out || '—' } }); j--; }
    }
    R.result = { value: t.v[m][n], seq: out };
  }
  function edit(R, { X, Y }) {
    const m = X.length, n = Y.length;
    const t = R.table('D[i][j] = edits to turn X[1..i] into Y[1..j]', ['∅', ...X.split('').map((ch, i) => `${i + 1} ${ch}`)], ['∅', ...Y.split('').map((ch, j) => `${j + 1} ${ch}`)]);
    t.arrow = t.v.map(r => r.map(() => ''));
    for (let i = 0; i <= m; i++) { t.v[i][0] = i; t.arrow[i][0] = i ? '↑' : ''; t.cls[at(i, 0)] = 'new'; }
    for (let j = 0; j <= n; j++) { t.v[0][j] = j; t.arrow[0][j] = j ? '←' : ''; t.cls[at(0, j)] = 'new'; }
    R.snap({ line: ['a'], msg: `Turn “${X}” into “${Y}” with insertions, deletions and substitutions (cost 1 each). Column 0: delete i letters; row 0: insert j letters.`, vars: { m, n } });
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      R.ops++; const same = X[i - 1] === Y[j - 1];
      const del = t.v[i - 1][j] + 1, ins = t.v[i][j - 1] + 1, dg = t.v[i - 1][j - 1] + (same ? 0 : 1), best = Math.min(dg, del, ins);
      const mv = best === dg ? '↖' : best === del ? '↑' : '←';
      t.v[i][j] = best; t.arrow[i][j] = mv;
      t.cls[at(i - 1, j)] = 'src'; t.cls[at(i, j - 1)] = 'src'; t.cls[at(i - 1, j - 1)] = 'src';
      t.cls[mv === '↖' ? at(i - 1, j - 1) : mv === '↑' ? at(i - 1, j) : at(i, j - 1)] = 'win'; t.cls[at(i, j)] = 'new';
      const name = mv === '↖' ? (same ? 'match' : `substitute ${X[i - 1]}→${Y[j - 1]}`) : mv === '↑' ? `delete ${X[i - 1]}` : `insert ${Y[j - 1]}`;
      R.rows.push([`${i}, ${j}`, `${X[i - 1]} vs ${Y[j - 1]}`, `${del}, ${ins}, ${dg}`, best, name]);
      R.snap({ line: ['b', 'c', 'd'], msg: `${X[i - 1]} vs ${Y[j - 1]}: delete ${del}, insert ${ins}, ${same ? 'match' : 'substitute'} ${dg}. D[${i}][${j}] = <b>${best}</b> (${name}).`, vars: { i, j, 'D[i][j]': best } });
    }
    let i = m, j = n; const ops = [];
    while (i > 0 || j > 0) {
      t.keep[at(i, j)] = 'path'; const mv = t.arrow[i][j];
      if (mv === '↖') { ops.unshift(X[i - 1] === Y[j - 1] ? `keep ${X[i - 1]}` : `${X[i - 1]}→${Y[j - 1]}`); i--; j--; }
      else if (mv === '↑') { ops.unshift(`delete ${X[i - 1]}`); i--; }
      else { ops.unshift(`insert ${Y[j - 1]}`); j--; }
      R.snap({ line: ['e'], msg: `Move back: ${ops[0]}.`, vars: { i, j } });
    }
    t.keep[at(0, 0)] = 'path';
    R.result = { value: t.v[m][n], ops };
  }
  function mcm(R, { p }) {
    const n = p.length - 1, labs = range(1, n).map(i => `A${i}`);
    const M = R.table('m[i][j] = fewest scalar multiplications for A_i … A_j', labs, labs);
    const S = R.table('s[i][j] = best split k', labs, labs);
    R.snap({ line: [], msg: `${n} matrices: ${range(1, n).map(i => `A${i} is ${p[i - 1]}×${p[i]}`).join(', ')}. Only the order of multiplication changes the cost.`, vars: { n } });
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { if (i > j) M.v[i][j] = ''; if (i >= j) S.v[i][j] = ''; }
    for (let i = 1; i <= n; i++) { M.v[i - 1][i - 1] = 0; M.cls[at(i - 1, i - 1)] = 'new'; }
    R.snap({ line: ['a'], msg: `A single matrix needs no multiplication: m[i][i] = 0.`, vars: { n } });
    for (let l = 2; l <= n; l++) for (let i = 1; i <= n - l + 1; i++) {
      const j = i + l - 1; let best = INF, bk = 0;
      for (let k = i; k < j; k++) {
        R.ops++; const q = M.v[i - 1][k - 1] + M.v[k][j - 1] + p[i - 1] * p[k] * p[j];
        M.cls[at(i - 1, k - 1)] = 'src'; M.cls[at(k, j - 1)] = 'src'; M.cls[at(i - 1, j - 1)] = 'cur';
        const better = q < best; if (better) { best = q; bk = k; M.v[i - 1][j - 1] = q; S.v[i - 1][j - 1] = k; }
        R.rows.push([`(${i}, ${j})`, k, `${M.v[i - 1][k - 1]} + ${M.v[k][j - 1]} + ${p[i - 1]}·${p[k]}·${p[j]}`, q, best, bk]);
        R.snap({ line: ['b', 'c', 'd'], msg: `Chain A${i}…A${j}, split after A${k}: m[${i}][${k}] + m[${k + 1}][${j}] + ${p[i - 1]}·${p[k]}·${p[j]} = <b>${q}</b>. ${better ? 'Best so far.' : `Not better than ${best}.`}`, vars: { l, i, j, k, q, 'm[i][j]': best } });
      }
      M.cls[at(i - 1, j - 1)] = 'new'; S.cls[at(i - 1, j - 1)] = 'new';
      R.snap({ line: ['d'], msg: `m[${i}][${j}] = <b>${best}</b>, split s[${i}][${j}] = ${bk}.`, vars: { l, i, j, 'm[i][j]': best } });
    }
    const paren = (i, j) => { if (i === j) return `A${i}`; S.keep[at(i - 1, j - 1)] = 'path'; const k = S.v[i - 1][j - 1]; return `(${paren(i, k)}${paren(k + 1, j)})`; };
    const par = paren(1, n); M.keep[at(0, n - 1)] = 'path';
    R.snap({ line: ['e'], msg: `Optimal order: <b>${par}</b> with ${M.v[0][n - 1]} scalar multiplications.`, vars: { n, cost: M.v[0][n - 1] } });
    R.result = { value: M.v[0][n - 1], paren: par };
  }

  function run(mode, input) {
    const R = recorder();
    ({ fibrec, fibmemo, fibtab, rod, coin, lis, knap, lcs, edit, mcm })[mode](R, input);
    const r = R.result; let msg;
    if (mode === 'fibrec') msg = `F(${input.n}) = <b>${r.value}</b> after <b>${r.calls}</b> calls. F(${Math.max(0, input.n - 2)}) alone was computed ${r.dup[`F(${Math.max(0, input.n - 2)})`] || 0} times. The number of calls grows like φⁿ ≈ 1.618ⁿ.`;
    else if (mode === 'fibmemo') msg = `F(${input.n}) = <b>${r.value}</b> with ${r.calls} calls, ${r.hits} of them memo hits. Each F(k) is computed once: Θ(n) time.`;
    else if (mode === 'fibtab') msg = `F(${input.n}) = <b>${r.value}</b> with ${Math.max(0, input.n - 1)} additions: Θ(n) time, and only the last two values are really needed (O(1) space).`;
    else if (mode === 'rod') msg = `Best revenue r[${input.p.length}] = <b>${r.value}</b>, cutting into ${r.cuts.join(' + ')}. Θ(n²) time.`;
    else if (mode === 'coin') msg = r.value === INF ? `Amount ${input.A} cannot be made from these coins.` : `Amount ${input.A} needs <b>${r.value}</b> coins: ${r.used.join(' + ')}. Θ(A · k) time for k coin types.`;
    else if (mode === 'lis') msg = `LIS length <b>${r.value}</b>: ${r.seq.map(f).join(', ')}. Θ(n²) time (an O(n log n) method also exists).`;
    else if (mode === 'knap') msg = `Best value <b>${r.value}</b>, taking item${r.items.length === 1 ? '' : 's'} ${r.items.join(', ') || 'none'}. Θ(nW) time: pseudo-polynomial, because W can be exponential in its number of bits.`;
    else if (mode === 'lcs') msg = `LCS length <b>${r.value}</b>: “${r.seq}”. Θ(mn) time and space.`;
    else if (mode === 'edit') msg = `Edit distance <b>${r.value}</b>: ${r.ops.join(', ')}. Θ(mn) time.`;
    else msg = `Minimum cost <b>${r.value}</b> with ${r.paren}. Θ(n³) time, Θ(n²) space.`;
    const last = R.steps[R.steps.length - 1];
    R.steps.push(Object.assign({}, last, { line: [], msg, final: true, cur: -1, tables: last.tables.map(t => Object.assign({}, t, { cls: Object.fromEntries(Object.entries(t.cls).filter(([, c]) => c === 'path')) })) }));
    return { steps: R.steps, result: r, code: code(mode), header: header(mode) };
  }

  const API = { MODES, run, code, header, f };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DPEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
