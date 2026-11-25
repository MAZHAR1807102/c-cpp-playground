/* Prefix-sum and suffix-sum engine: builds, range queries, difference arrays, 2-D prefix sums and classic applications.
   Arrays are 0-based. P has n + 1 entries: P[0] = 0 and P[i] = A[0] + ... + A[i-1], so sum(A[l..r]) = P[r+1] - P[l].
   Works in the browser (window.PSEngine) and in Node. */
(function (root) {
  const MODES = {
    prefix: { name: 'Prefix sums and range queries', short: 'Prefix sum' },
    suffix: { name: 'Suffix sums and range queries', short: 'Suffix sum' },
    diff: { name: 'Difference array (range updates)', short: 'Difference array' },
    p2d: { name: '2-D prefix sums (rectangle queries)', short: '2-D prefix sum' },
    equi: { name: 'Equilibrium index (prefix = suffix)', short: 'Equilibrium index' },
    prod: { name: 'Product of array except self', short: 'Product except self' },
    subk: { name: 'Count subarrays with sum k', short: 'Subarray sum = k' },
    maxsub: { name: 'Maximum subarray sum', short: 'Max subarray' },
    rain: { name: 'Trapping rain water (prefix and suffix max)', short: 'Rain water' }
  };
  const f = x => x === Infinity ? '∞' : x === -Infinity ? '−∞' : x < 0 ? '−' + (-x) : String(x);
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;

  function recorder() {
    const R = { steps: [], rows: [], ops: 0 };
    // arrays: [{name, vals, base (index of first cell), cls:{}, note}]
    R.snap = (arrays, o) => {
      R.steps.push(Object.assign({ line: [], msg: '', arrays: arrays.map(a => ({ name: a.name, vals: a.vals.slice(), base: a.base || 0, cls: Object.assign({}, a.cls || {}), note: a.note || '', grid: a.grid ? a.grid.map(r => r.slice()) : null, gcls: a.gcls ? Object.assign({}, a.gcls) : null })),
        rows: R.rows.map(r => r.slice()), ops: R.ops, vars: {} }, o));
    };
    return R;
  }
  const blank = n => Array(n).fill(null);

  function code(mode) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (mode === 'prefix') {
      P('BUILD-PREFIX(A)');
      L('a', `P[0] = 0`);
      L('b', `${kw('for')} i = 1 ${kw('to')} n:   P[i] = P[i − 1] + A[i − 1]`);
      P('RANGE-SUM(l, r)   ▷ A[l] + … + A[r] in O(1)');
      L('c', `${kw('return')} P[r + 1] − P[l]`);
    } else if (mode === 'suffix') {
      P('BUILD-SUFFIX(A)');
      L('a', `S[n] = 0`);
      L('b', `${kw('for')} i = n − 1 ${kw('downto')} 0:   S[i] = S[i + 1] + A[i]`);
      P('RANGE-SUM(l, r)');
      L('c', `${kw('return')} S[l] − S[r + 1]`);
    } else if (mode === 'diff') {
      P('RANGE-ADD(l, r, x)   ▷ O(1) per update');
      L('a', `D[l] = D[l] + x`);
      L('b', `D[r + 1] = D[r + 1] − x`);
      P('RECONSTRUCT   ▷ prefix sums of D');
      L('c', `run = 0`);
      L('d', `${kw('for')} i = 0 ${kw('to')} n − 1:   run = run + D[i];   B[i] = A[i] + run`);
    } else if (mode === 'p2d') {
      P('BUILD-2D(A)   ▷ P[i][j] = sum of A[0..i−1][0..j−1]');
      L('a', `P[0][·] = P[·][0] = 0`);
      L('b', `${kw('for')} i = 1 ${kw('to')} R,  ${kw('for')} j = 1 ${kw('to')} C`);
      L('c', `    P[i][j] = A[i−1][j−1] + P[i−1][j] + P[i][j−1] − P[i−1][j−1]`);
      P('RECT-SUM(r1, c1, r2, c2)   ▷ inclusion–exclusion');
      L('d', `${kw('return')} P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]`);
    } else if (mode === 'equi') {
      P('EQUILIBRIUM(A)');
      L('a', `total = A[0] + … + A[n − 1];   left = 0`);
      L('b', `${kw('for')} i = 0 ${kw('to')} n − 1`);
      L('c', `    right = total − left − A[i]   ${cm('▷ suffix sum after i')}`);
      L('d', `    ${kw('if')} left == right:  report i`);
      L('e', `    left = left + A[i]   ${cm('▷ prefix sum before i + 1')}`);
    } else if (mode === 'prod') {
      P('PRODUCT-EXCEPT-SELF(A)   ▷ no division');
      L('a', `pre[0] = 1;   ${kw('for')} i = 1 ${kw('to')} n − 1:  pre[i] = pre[i − 1] · A[i − 1]`);
      L('b', `suf[n − 1] = 1;   ${kw('for')} i = n − 2 ${kw('downto')} 0:  suf[i] = suf[i + 1] · A[i + 1]`);
      L('c', `${kw('for')} i = 0 ${kw('to')} n − 1:   out[i] = pre[i] · suf[i]`);
    } else if (mode === 'subk') {
      P('COUNT-SUBARRAYS(A, k)');
      L('a', `cnt = {0: 1};   sum = 0;   ans = 0`);
      L('b', `${kw('for')} i = 0 ${kw('to')} n − 1`);
      L('c', `    sum = sum + A[i]   ${cm('▷ = P[i + 1]')}`);
      L('d', `    ans = ans + cnt[sum − k]   ${cm('▷ earlier prefixes P[j] = sum − k')}`);
      L('e', `    cnt[sum] = cnt[sum] + 1`);
    } else if (mode === 'maxsub') {
      P('MAX-SUBARRAY(A)   ▷ best P[i+1] − min P[j], j ≤ i');
      L('a', `sum = 0;   minP = 0;   best = −∞`);
      L('b', `${kw('for')} i = 0 ${kw('to')} n − 1`);
      L('c', `    sum = sum + A[i]   ${cm('▷ P[i + 1]')}`);
      L('d', `    best = max(best, sum − minP)`);
      L('e', `    minP = min(minP, sum)`);
    } else {
      P('TRAP-RAIN-WATER(h)');
      L('a', `L[0] = h[0];   ${kw('for')} i = 1 ${kw('to')} n − 1:  L[i] = max(L[i − 1], h[i])   ${cm('▷ prefix max')}`);
      L('b', `R[n−1] = h[n−1];   ${kw('for')} i = n − 2 ${kw('downto')} 0:  R[i] = max(R[i + 1], h[i])   ${cm('▷ suffix max')}`);
      L('c', `${kw('for')} i = 0 ${kw('to')} n − 1:   water += min(L[i], R[i]) − h[i]`);
    }
    return C;
  }

  function prefix(R, A, o) {
    const n = A.length, P = blank(n + 1);
    P[0] = 0;
    R.snap([{ name: 'A', vals: A }, { name: 'P', vals: P }], { line: ['a'], msg: `P has n + 1 = ${n + 1} entries. P[i] is the sum of the first i elements, so P[0] = 0 (the empty sum).` });
    for (let i = 1; i <= n; i++) {
      P[i] = P[i - 1] + A[i - 1]; R.ops++;
      R.snap([{ name: 'A', vals: A, cls: { [i - 1]: 'add' } }, { name: 'P', vals: P, cls: { [i - 1]: 'src', [i]: 'new' } }], { line: ['b'], vars: { i, 'P[i]': f(P[i]) }, msg: `P[${i}] = P[${i - 1}] + A[${i - 1}] = ${f(P[i - 1])} + ${f(A[i - 1])} = <b>${f(P[i])}</b>.` });
    }
    R.snap([{ name: 'A', vals: A }, { name: 'P', vals: P }], { line: ['b'], msg: `Built in Θ(n): ${n} additions. Now any range sum is one subtraction.` });
    for (const [l, r] of o.queries) {
      const ans = P[r + 1] - P[l]; R.ops++;
      const cls = {}; for (let k = l; k <= r; k++) cls[k] = 'range';
      R.rows.push([`sum(A[${l}..${r}])`, `P[${r + 1}] − P[${l}]`, `${f(P[r + 1])} − ${f(P[l])}`, f(ans)]);
      R.snap([{ name: 'A', vals: A, cls }, { name: 'P', vals: P, cls: { [r + 1]: 'new', [l]: 'sub' } }], { line: ['c'], vars: { l, r, answer: f(ans) },
        msg: `sum(A[${l}..${r}]) = P[${r + 1}] − P[${l}] = ${f(P[r + 1])} − ${f(P[l])} = <b>${f(ans)}</b>. P[${r + 1}] counts A[0..${r}]; subtracting P[${l}] removes A[0..${l - 1}].` });
    }
  }

  function suffix(R, A, o) {
    const n = A.length, S = blank(n + 1);
    S[n] = 0;
    R.snap([{ name: 'A', vals: A }, { name: 'S', vals: S }], { line: ['a'], msg: `S[i] is the sum of A[i..n−1], the elements from i to the end. S[n] = 0 (nothing after the last element). Fill it from right to left.` });
    for (let i = n - 1; i >= 0; i--) {
      S[i] = S[i + 1] + A[i]; R.ops++;
      R.snap([{ name: 'A', vals: A, cls: { [i]: 'add' } }, { name: 'S', vals: S, cls: { [i + 1]: 'src', [i]: 'new' } }], { line: ['b'], vars: { i, 'S[i]': f(S[i]) }, msg: `S[${i}] = S[${i + 1}] + A[${i}] = ${f(S[i + 1])} + ${f(A[i])} = <b>${f(S[i])}</b>.` });
    }
    for (const [l, r] of o.queries) {
      const ans = S[l] - S[r + 1]; R.ops++;
      const cls = {}; for (let k = l; k <= r; k++) cls[k] = 'range';
      R.rows.push([`sum(A[${l}..${r}])`, `S[${l}] − S[${r + 1}]`, `${f(S[l])} − ${f(S[r + 1])}`, f(ans)]);
      R.snap([{ name: 'A', vals: A, cls }, { name: 'S', vals: S, cls: { [l]: 'new', [r + 1]: 'sub' } }], { line: ['c'], vars: { l, r, answer: f(ans) },
        msg: `sum(A[${l}..${r}]) = S[${l}] − S[${r + 1}] = ${f(S[l])} − ${f(S[r + 1])} = <b>${f(ans)}</b>. S[${l}] counts A[${l}..${n - 1}]; subtracting S[${r + 1}] removes A[${r + 1}..${n - 1}].` });
    }
  }

  function diff(R, A, o) {
    const n = A.length, D = Array(n + 1).fill(0);
    R.snap([{ name: 'A', vals: A }, { name: 'D', vals: D }], { line: [], msg: `To add x to every element of A[l..r] for many updates, do not touch r − l + 1 cells each time. Record +x at D[l] and −x at D[r + 1]; one prefix-sum pass at the end applies all updates.` });
    for (const [l, r, x] of o.updates) {
      D[l] += x; D[r + 1] -= x; R.ops += 2;
      R.rows.push([`add ${f(x)} to A[${l}..${r}]`, `D[${l}] += ${f(x)}`, `D[${r + 1}] −= ${f(x)}`]);
      const cls = {}; for (let k = l; k <= r; k++) cls[k] = 'range';
      R.snap([{ name: 'A', vals: A, cls }, { name: 'D', vals: D, cls: { [l]: 'new', [r + 1]: 'sub' } }], { line: ['a', 'b'], vars: { l, r, x: f(x) },
        msg: `Add ${f(x)} to A[${l}..${r}]: D[${l}] += ${f(x)} (start adding here), D[${r + 1}] −= ${f(x)} (stop after ${r}). Two operations, whatever the range length.` });
    }
    const B = blank(n); let run = 0;
    R.snap([{ name: 'A', vals: A }, { name: 'D', vals: D }, { name: 'B', vals: B }], { line: ['c'], msg: `Now take prefix sums of D: run = D[0] + … + D[i] is the total added to element i.` });
    for (let i = 0; i < n; i++) {
      run += D[i]; B[i] = A[i] + run; R.ops++;
      R.snap([{ name: 'A', vals: A, cls: { [i]: 'add' } }, { name: 'D', vals: D, cls: { [i]: 'src' } }, { name: 'B', vals: B, cls: { [i]: 'new' } }], { line: ['d'], vars: { i, run: f(run), 'B[i]': f(B[i]) },
        msg: `run = run + D[${i}] = ${f(run)}; B[${i}] = A[${i}] + ${f(run)} = <b>${f(B[i])}</b>.` });
    }
    R.result = B;
  }

  function p2d(R, M, o) {
    const r = M.length, c = M[0].length, P = Array.from({ length: r + 1 }, () => blank(c + 1));
    for (let i = 0; i <= r; i++) P[i][0] = 0; for (let j = 0; j <= c; j++) P[0][j] = 0;
    const g = (mat, gc) => ({ name: '', vals: [], grid: mat, gcls: gc });
    const snap2 = (Ac, Pc, opt) => R.snap([Object.assign(g(M, Ac), { name: 'A' }), Object.assign(g(P, Pc), { name: 'P', base: 0 })], opt);
    snap2({}, {}, { line: ['a'], msg: `P[i][j] is the sum of the rectangle A[0..i−1][0..j−1]. Row 0 and column 0 of P are 0.` });
    for (let i = 1; i <= r; i++) for (let j = 1; j <= c; j++) {
      P[i][j] = M[i - 1][j - 1] + P[i - 1][j] + P[i][j - 1] - P[i - 1][j - 1]; R.ops++;
      snap2({ [`${i - 1},${j - 1}`]: 'add' }, { [`${i},${j}`]: 'new', [`${i - 1},${j}`]: 'src', [`${i},${j - 1}`]: 'src', [`${i - 1},${j - 1}`]: 'sub' }, { line: ['b', 'c'], vars: { i, j, 'P[i][j]': f(P[i][j]) },
        msg: `P[${i}][${j}] = A[${i - 1}][${j - 1}] + P[${i - 1}][${j}] + P[${i}][${j - 1}] − P[${i - 1}][${j - 1}] = ${f(M[i - 1][j - 1])} + ${f(P[i - 1][j])} + ${f(P[i][j - 1])} − ${f(P[i - 1][j - 1])} = <b>${f(P[i][j])}</b>. The corner P[${i - 1}][${j - 1}] was counted twice, so subtract it once.` });
    }
    for (const [r1, c1, r2, c2] of o.rects) {
      const ans = P[r2 + 1][c2 + 1] - P[r1][c2 + 1] - P[r2 + 1][c1] + P[r1][c1]; R.ops++;
      const Ac = {}; for (let i = r1; i <= r2; i++) for (let j = c1; j <= c2; j++) Ac[`${i},${j}`] = 'range';
      R.rows.push([`rows ${r1}..${r2}, cols ${c1}..${c2}`, `${f(P[r2 + 1][c2 + 1])} − ${f(P[r1][c2 + 1])} − ${f(P[r2 + 1][c1])} + ${f(P[r1][c1])}`, f(ans)]);
      snap2(Ac, { [`${r2 + 1},${c2 + 1}`]: 'new', [`${r1},${c2 + 1}`]: 'sub', [`${r2 + 1},${c1}`]: 'sub', [`${r1},${c1}`]: 'src' }, { line: ['d'], vars: { answer: f(ans) },
        msg: `Sum of rows ${r1}..${r2}, columns ${c1}..${c2} = P[${r2 + 1}][${c2 + 1}] − P[${r1}][${c2 + 1}] − P[${r2 + 1}][${c1}] + P[${r1}][${c1}] = ${f(P[r2 + 1][c2 + 1])} − ${f(P[r1][c2 + 1])} − ${f(P[r2 + 1][c1])} + ${f(P[r1][c1])} = <b>${f(ans)}</b>. The top-left part was subtracted twice, so add it back once.` });
    }
  }

  function equi(R, A) {
    const n = A.length, total = A.reduce((a, b) => a + b, 0), found = [];
    let left = 0; R.ops += n;
    R.snap([{ name: 'A', vals: A }], { line: ['a'], vars: { total: f(total), left: 0 }, msg: `An equilibrium index i has (sum of the elements left of i) = (sum of the elements right of i). total = ${f(total)}; the right sum is total − left − A[i], so one pass is enough.` });
    for (let i = 0; i < n; i++) {
      const right = total - left - A[i]; R.ops++;
      const cls = {}; for (let k = 0; k < i; k++) cls[k] = 'left'; for (let k = i + 1; k < n; k++) cls[k] = 'right'; cls[i] = left === right ? 'hit' : 'add';
      if (left === right) found.push(i);
      R.rows.push([i, f(A[i]), f(left), f(right), left === right ? 'equilibrium' : '']);
      R.snap([{ name: 'A', vals: A, cls }], { line: left === right ? ['b', 'c', 'd'] : ['b', 'c'], vars: { i, left: f(left), right: f(right) },
        msg: `i = ${i}: left sum = ${f(left)}, right sum = ${f(total)} − ${f(left)} − ${f(A[i])} = ${f(right)}. ` + (left === right ? '<b>Equal: i is an equilibrium index.</b>' : 'Not equal.') });
      left += A[i];
    }
    R.result = found;
  }

  function prod(R, A) {
    const n = A.length, pre = blank(n), suf = blank(n), out = blank(n);
    pre[0] = 1;
    R.snap([{ name: 'A', vals: A }, { name: 'pre', vals: pre }, { name: 'suf', vals: suf }, { name: 'out', vals: out }], { line: ['a'], msg: `out[i] = product of all elements except A[i], without division (A may contain 0). pre[i] = product of A[0..i−1] (prefix products); suf[i] = product of A[i+1..n−1] (suffix products).` });
    for (let i = 1; i < n; i++) { pre[i] = pre[i - 1] * A[i - 1]; R.ops++; R.snap([{ name: 'A', vals: A, cls: { [i - 1]: 'add' } }, { name: 'pre', vals: pre, cls: { [i - 1]: 'src', [i]: 'new' } }, { name: 'suf', vals: suf }, { name: 'out', vals: out }], { line: ['a'], vars: { i, 'pre[i]': f(pre[i]) }, msg: `pre[${i}] = pre[${i - 1}] · A[${i - 1}] = ${f(pre[i - 1])} · ${f(A[i - 1])} = ${f(pre[i])}.` }); }
    suf[n - 1] = 1;
    for (let i = n - 2; i >= 0; i--) { suf[i] = suf[i + 1] * A[i + 1]; R.ops++; R.snap([{ name: 'A', vals: A, cls: { [i + 1]: 'add' } }, { name: 'pre', vals: pre }, { name: 'suf', vals: suf, cls: { [i + 1]: 'src', [i]: 'new' } }, { name: 'out', vals: out }], { line: ['b'], vars: { i, 'suf[i]': f(suf[i]) }, msg: `suf[${i}] = suf[${i + 1}] · A[${i + 1}] = ${f(suf[i + 1])} · ${f(A[i + 1])} = ${f(suf[i])}.` }); }
    for (let i = 0; i < n; i++) {
      out[i] = pre[i] * suf[i]; R.ops++;
      R.rows.push([i, f(A[i]), f(pre[i]), f(suf[i]), f(out[i])]);
      R.snap([{ name: 'A', vals: A, cls: { [i]: 'hit' } }, { name: 'pre', vals: pre, cls: { [i]: 'src' } }, { name: 'suf', vals: suf, cls: { [i]: 'src' } }, { name: 'out', vals: out, cls: { [i]: 'new' } }], { line: ['c'], vars: { i, 'out[i]': f(out[i]) }, msg: `out[${i}] = pre[${i}] · suf[${i}] = ${f(pre[i])} · ${f(suf[i])} = <b>${f(out[i])}</b>: everything left of ${i} times everything right of ${i}.` });
    }
    R.result = out;
  }

  function subk(R, A, o) {
    const n = A.length, k = o.k, cnt = new Map([[0, 1]]), P = blank(n + 1);
    P[0] = 0; let sum = 0, ans = 0; const pairs = [];
    const tab = () => [...cnt.entries()].sort((a, b) => a[0] - b[0]);
    R.extra = { cnt: tab() };
    R.snap([{ name: 'A', vals: A }, { name: 'P', vals: P }], { line: ['a'], vars: { k: f(k), sum: 0, ans: 0 }, cnt: tab(), msg: `A subarray A[j..i] has sum P[i+1] − P[j]. It equals k exactly when P[j] = P[i+1] − k. So scan once, keeping a hash map cnt of how often each prefix sum has appeared. Start with cnt[0] = 1 (the empty prefix).` });
    for (let i = 0; i < n; i++) {
      sum += A[i]; P[i + 1] = sum; R.ops++;
      const need = sum - k, c = cnt.get(need) || 0;
      const js = []; for (let j = 0; j <= i; j++) if (P[j] === need) js.push(j);
      js.forEach(j => pairs.push([j, i]));
      ans += c;
      const cls = { [i + 1]: 'new' }; js.forEach(j => cls[j] = 'hit');
      const acls = {}; js.forEach(j => { for (let t = j; t <= i; t++) acls[t] = 'range'; }); acls[i] = acls[i] || 'add';
      R.rows.push([i, f(A[i]), f(sum), f(need), c, js.map(j => `A[${j}..${i}]`).join(', ') || '—', ans]);
      R.snap([{ name: 'A', vals: A, cls: acls }, { name: 'P', vals: P, cls }], { line: ['b', 'c', 'd'], vars: { i, sum: f(sum), 'sum − k': f(need), ans }, cnt: tab(), hl: need,
        msg: `i = ${i}: sum = P[${i + 1}] = ${f(sum)}. We need earlier prefix sums equal to ${f(sum)} − ${f(k)} = ${f(need)}: cnt[${f(need)}] = ${c}.` + (c ? ` New subarray${c > 1 ? 's' : ''}: ${js.map(j => `A[${j}..${i}]`).join(', ')}. ans = ${ans}.` : ' None.') });
      cnt.set(sum, (cnt.get(sum) || 0) + 1);
      R.snap([{ name: 'A', vals: A }, { name: 'P', vals: P, cls: { [i + 1]: 'new' } }], { line: ['e'], vars: { i, sum: f(sum), ans }, cnt: tab(), hl: sum, msg: `Record this prefix sum: cnt[${f(sum)}] = ${cnt.get(sum)}.` });
    }
    R.result = { ans, pairs };
  }

  function maxsub(R, A) {
    const n = A.length, P = blank(n + 1);
    P[0] = 0; let sum = 0, minP = 0, minAt = 0, best = -Infinity, bl = 0, br = 0;
    R.snap([{ name: 'A', vals: A }, { name: 'P', vals: P }], { line: ['a'], vars: { minP: 0, best: '−∞' }, msg: `The sum of A[j..i] is P[i+1] − P[j]. For each end i it is largest when P[j] is the <b>smallest</b> prefix sum seen so far. So keep the running sum and the minimum prefix sum: one pass, O(n). (This is Kadane’s algorithm in prefix-sum form.)` });
    for (let i = 0; i < n; i++) {
      sum += A[i]; P[i + 1] = sum; R.ops++;
      const cand = sum - minP, improved = cand > best;
      if (improved) { best = cand; bl = minAt; br = i; }
      const acls = {}; for (let t = bl; t <= br; t++) acls[t] = 'range';
      R.rows.push([i, f(A[i]), f(sum), f(minP), f(cand), f(best), improved ? `A[${bl}..${br}]` : '']);
      R.snap([{ name: 'A', vals: A, cls: Object.assign(acls, { [i]: acls[i] || 'add' }) }, { name: 'P', vals: P, cls: { [i + 1]: 'new', [minAt]: 'sub' } }], { line: ['b', 'c', 'd'], vars: { i, sum: f(sum), minP: f(minP), best: f(best) },
        msg: `i = ${i}: P[${i + 1}] = ${f(sum)}. Best subarray ending at ${i}: P[${i + 1}] − min prefix (P[${minAt}] = ${f(minP)}) = ${f(cand)}. ` + (improved ? `<b>New best ${f(best)}</b>: A[${bl}..${br}].` : `Best so far stays ${f(best)}.`) });
      if (sum < minP) { minP = sum; minAt = i + 1; R.snap([{ name: 'A', vals: A, cls: acls }, { name: 'P', vals: P, cls: { [minAt]: 'sub' } }], { line: ['e'], vars: { i, minP: f(minP), best: f(best) }, msg: `P[${i + 1}] = ${f(sum)} is the new minimum prefix sum: later subarrays may start at ${i + 1}.` }); }
    }
    R.result = { best, l: bl, r: br };
  }

  function rain(R, h) {
    const n = h.length, Lm = blank(n), Rm = blank(n), W = blank(n);
    Lm[0] = h[0];
    const bars = { name: 'h', vals: h, bars: true };
    const S = (cls, extra) => [Object.assign({}, bars, { cls: cls.h || {} }), { name: 'Lmax', vals: Lm, cls: cls.L || {} }, { name: 'Rmax', vals: Rm, cls: cls.R || {} }, { name: 'water', vals: W, cls: cls.W || {} }];
    R.snap(S({}), { line: ['a'], bars: true, W, msg: `Water above bar i is limited by the tallest bar on its left and the tallest on its right: water[i] = min(Lmax[i], Rmax[i]) − h[i]. Lmax is a <b>prefix maximum</b>, Rmax a <b>suffix maximum</b>.` });
    for (let i = 1; i < n; i++) { Lm[i] = Math.max(Lm[i - 1], h[i]); R.ops++; R.snap(S({ h: { [i]: 'add' }, L: { [i - 1]: 'src', [i]: 'new' } }), { line: ['a'], bars: true, W, vars: { i, 'Lmax[i]': Lm[i] }, msg: `Lmax[${i}] = max(Lmax[${i - 1}], h[${i}]) = max(${Lm[i - 1]}, ${h[i]}) = ${Lm[i]}.` }); }
    Rm[n - 1] = h[n - 1];
    for (let i = n - 2; i >= 0; i--) { Rm[i] = Math.max(Rm[i + 1], h[i]); R.ops++; R.snap(S({ h: { [i]: 'add' }, R: { [i + 1]: 'src', [i]: 'new' } }), { line: ['b'], bars: true, W, vars: { i, 'Rmax[i]': Rm[i] }, msg: `Rmax[${i}] = max(Rmax[${i + 1}], h[${i}]) = max(${Rm[i + 1]}, ${h[i]}) = ${Rm[i]}.` }); }
    let tot = 0;
    for (let i = 0; i < n; i++) {
      W[i] = Math.min(Lm[i], Rm[i]) - h[i]; tot += W[i]; R.ops++;
      R.rows.push([i, h[i], Lm[i], Rm[i], W[i], tot]);
      R.snap(S({ h: { [i]: 'add' }, L: { [i]: 'src' }, R: { [i]: 'src' }, W: { [i]: 'new' } }), { line: ['c'], bars: true, W, vars: { i, 'water[i]': W[i], total: tot }, msg: `water[${i}] = min(${Lm[i]}, ${Rm[i]}) − ${h[i]} = <b>${W[i]}</b>. Total so far ${tot}.` });
    }
    R.result = tot;
  }

  function header(mode) {
    return ({
      prefix: ['Query', 'Formula', 'Values', 'Answer'], suffix: ['Query', 'Formula', 'Values', 'Answer'], diff: ['Update', 'Left end', 'Right end + 1'],
      p2d: ['Rectangle', 'P[r2+1][c2+1] − P[r1][c2+1] − P[r2+1][c1] + P[r1][c1]', 'Answer'], equi: ['i', 'A[i]', 'Left sum', 'Right sum', 'Result'],
      prod: ['i', 'A[i]', 'pre[i]', 'suf[i]', 'out[i]'], subk: ['i', 'A[i]', 'sum = P[i+1]', 'sum − k', 'cnt[sum − k]', 'New subarrays', 'ans'],
      maxsub: ['i', 'A[i]', 'P[i+1]', 'min prefix', 'best ending at i', 'best', 'Best range'], rain: ['i', 'h[i]', 'Lmax', 'Rmax', 'water', 'total']
    })[mode];
  }

  function run(mode, input) {
    const R = recorder();
    ({ prefix, suffix, diff, p2d, equi, prod, subk, maxsub, rain })[mode](R, mode === 'p2d' ? input.M : input.A, input);
    let msg = '';
    if (mode === 'prefix' || mode === 'suffix') msg = `Building took Θ(n); ${input.queries.length === 1 ? 'the range query' : `each of the ${input.queries.length} range queries`} took O(1). Without the ${mode} array, each query would cost up to n additions.`;
    else if (mode === 'diff') msg = `${input.updates.length} range update${input.updates.length === 1 ? '' : 's'} in O(1) each, plus one Θ(n) pass: B = [${R.result.map(f).join(', ')}].`;
    else if (mode === 'p2d') msg = `Built in Θ(R·C); each rectangle query is 4 lookups, O(1).`;
    else if (mode === 'equi') msg = R.result.length ? `Equilibrium ind${R.result.length > 1 ? 'ices' : 'ex'}: <b>${R.result.join(', ')}</b>. One pass, O(n) time, O(1) extra space.` : 'There is no equilibrium index. One pass, O(n) time.';
    else if (mode === 'prod') msg = `out = [${R.result.map(f).join(', ')}]. Three passes, O(n) time, no division.`;
    else if (mode === 'subk') msg = `<b>${R.result.ans}</b> subarray${R.result.ans === 1 ? '' : 's'} with sum ${f(input.k)}: ${R.result.pairs.map(([j, i]) => `A[${j}..${i}]`).join(', ') || 'none'}. O(n) expected time with a hash map, instead of O(n²) checking every subarray.`;
    else if (mode === 'maxsub') msg = `Maximum subarray sum <b>${f(R.result.best)}</b>, for A[${R.result.l}..${R.result.r}]. O(n) time, O(1) extra space.`;
    else msg = `Total trapped water: <b>${R.result}</b> units. O(n) time with the two arrays.`;
    const last = R.steps[R.steps.length - 1];
    R.snap(last.arrays, Object.assign({}, { line: [], msg, final: true, bars: last.bars, W: last.W, cnt: last.cnt }));
    R.steps[R.steps.length - 1].arrays.forEach(a => a.cls = {});
    return { steps: R.steps, result: R.result, code: code(mode), header: header(mode) };
  }

  const API = { MODES, run, code, header, f };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PSEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
