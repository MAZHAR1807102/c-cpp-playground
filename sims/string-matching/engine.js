/* String-matching engine: naive, Rabin-Karp, finite automaton, Knuth-Morris-Pratt, Boyer-Moore-Horspool and Z algorithm.
   Positions are 0-based: a match at shift s means T[s..s+m-1] = P. Works in the browser (window.SMEngine) and in Node. */
(function (root) {
  const MAX_STEPS = 1500;
  const ALGS = {
    naive: { name: 'Naive (brute force)', short: 'Naive' },
    rk: { name: 'Rabin–Karp', short: 'Rabin–Karp' },
    fa: { name: 'Finite automaton', short: 'Automaton' },
    kmp: { name: 'Knuth–Morris–Pratt', short: 'KMP' },
    bm: { name: 'Boyer–Moore–Horspool', short: 'Boyer–Moore' },
    z: { name: 'Z algorithm', short: 'Z' }
  };
  const TOO = {};
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  const q_ = c => c === ' ' ? '␣' : c;

  function prefixFunction(P) {
    const m = P.length, pi = Array(m).fill(0);
    let k = 0;
    for (let q = 1; q < m; q++) { while (k > 0 && P[k] !== P[q]) k = pi[k - 1]; if (P[k] === P[q]) k++; pi[q] = k; }
    return pi;
  }
  function alphabet(P, T) { return [...new Set((P + T).split(''))].sort(); }
  function transition(P, Sigma) {   // delta[q][a] for q = 0..m, via the prefix function: O(m |Sigma|)
    const m = P.length, pi = prefixFunction(P), d = [];
    for (let q = 0; q <= m; q++) {
      d.push({});
      for (const a of Sigma) d[q][a] = (q < m && P[q] === a) ? q + 1 : (q === 0 ? 0 : d[pi[q - 1]][a]);
    }
    return d;
  }
  function naiveFind(T, P) { const r = []; for (let s = 0; s + P.length <= T.length; s++) if (T.substr(s, P.length) === P) r.push(s); return r; }

  function recorder(T, P) {
    const R = { steps: [], rows: [], cmp: 0, found: [], extra: {} };
    R.snap = o => {
      R.steps.push(Object.assign({ line: [], msg: '', s: null, cells: {}, pcells: {}, found: R.found.slice(), rows: R.rows.map(r => r.slice()), cmp: R.cmp, vars: {}, extra: JSON.parse(JSON.stringify(R.extra)) }, o));
      if (R.steps.length > MAX_STEPS) throw TOO;
    };
    return R;
  }

  function code(alg) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (alg === 'naive') {
      P('NAIVE-STRING-MATCHER(T, P)');
      L('n1', `n = T.length;   m = P.length`);
      L('n2', `${kw('for')} s = 0 ${kw('to')} n − m`);
      L('n3', `    ${kw('if')} P[0..m−1] == T[s..s+m−1]   ${cm('▷ compare left to right')}`);
      L('n4', `        print “pattern occurs with shift” s`);
    } else if (alg === 'rk') {
      P('RABIN-KARP-MATCHER(T, P, d, q)');
      L('r1', `h = d^(m−1) mod q`);
      L('r2', `p = 0;   t = 0`);
      L('r3', `${kw('for')} i = 0 ${kw('to')} m − 1   ${cm('▷ preprocessing, Horner’s rule')}`);
      L('r4', `    p = (d·p + P[i]) mod q;   t = (d·t + T[i]) mod q`);
      L('r5', `${kw('for')} s = 0 ${kw('to')} n − m`);
      L('r6', `    ${kw('if')} p == t   ${cm('▷ a hit: check it')}`);
      L('r7', `        ${kw('if')} P[0..m−1] == T[s..s+m−1]  print s   ${cm('▷ else spurious')}`);
      L('r8', `    ${kw('if')} s < n − m`);
      L('r9', `        t = (d·(t − T[s]·h) + T[s+m]) mod q   ${cm('▷ roll')}`);
    } else if (alg === 'fa') {
      P('COMPUTE-TRANSITION-FUNCTION(P, Σ)');
      L('a1', `${kw('for')} q = 0 ${kw('to')} m,  ${kw('for each')} a ∈ Σ`);
      L('a2', `    δ(q, a) = length of the longest prefix of P that is a suffix of P[0..q−1]a`);
      P('FINITE-AUTOMATON-MATCHER(T, δ, m)');
      L('a3', `q = 0`);
      L('a4', `${kw('for')} i = 0 ${kw('to')} n − 1`);
      L('a5', `    q = δ(q, T[i])`);
      L('a6', `    ${kw('if')} q == m   print “match with shift” i − m + 1`);
    } else if (alg === 'kmp') {
      P('COMPUTE-PREFIX-FUNCTION(P)');
      L('p1', `π[0] = 0;   k = 0`);
      L('p2', `${kw('for')} q = 1 ${kw('to')} m − 1`);
      L('p3', `    ${kw('while')} k > 0 ${kw('and')} P[k] ≠ P[q]:  k = π[k − 1]`);
      L('p4', `    ${kw('if')} P[k] == P[q]:  k = k + 1`);
      L('p5', `    π[q] = k`);
      P('KMP-MATCHER(T, P)');
      L('k1', `q = 0   ${cm('▷ number of characters matched')}`);
      L('k2', `${kw('for')} i = 0 ${kw('to')} n − 1`);
      L('k3', `    ${kw('while')} q > 0 ${kw('and')} P[q] ≠ T[i]:  q = π[q − 1]   ${cm('▷ fall back')}`);
      L('k4', `    ${kw('if')} P[q] == T[i]:  q = q + 1`);
      L('k5', `    ${kw('if')} q == m`);
      L('k6', `        print “match with shift” i − m + 1;   q = π[q − 1]`);
    } else if (alg === 'bm') {
      P('HORSPOOL(T, P)');
      L('b1', `${kw('for each')} c ∈ Σ:  shift[c] = m`);
      L('b2', `${kw('for')} j = 0 ${kw('to')} m − 2:  shift[P[j]] = m − 1 − j`);
      L('b3', `s = 0`);
      L('b4', `${kw('while')} s ≤ n − m`);
      L('b5', `    j = m − 1;   ${kw('while')} j ≥ 0 ${kw('and')} P[j] == T[s+j]:  j = j − 1   ${cm('▷ right to left')}`);
      L('b6', `    ${kw('if')} j < 0:  print s`);
      L('b7', `    s = s + shift[T[s + m − 1]]   ${cm('▷ bad-character shift')}`);
    } else {
      P('Z-ALGORITHM(S)   ▷ S = P $ T');
      L('z1', `l = r = 0;   Z[0] = |S|`);
      L('z2', `${kw('for')} i = 1 ${kw('to')} |S| − 1`);
      L('z3', `    ${kw('if')} i < r:  Z[i] = min(r − i, Z[i − l])   ${cm('▷ reuse the Z-box')}`);
      L('z4', `    ${kw('while')} i + Z[i] < |S| ${kw('and')} S[Z[i]] == S[i + Z[i]]:  Z[i]++`);
      L('z5', `    ${kw('if')} i + Z[i] > r:  l = i;  r = i + Z[i]`);
      L('z6', `    ${kw('if')} Z[i] == m:  match with shift i − m − 1`);
    }
    return C;
  }
  function header(alg) {
    if (alg === 'rk') return ['Shift s', 't = hash of T[s..s+m−1]', 'p', 'Result'];
    if (alg === 'fa') return ['i', 'T[i]', 'State q after', 'Note'];
    if (alg === 'kmp') return ['i', 'T[i]', 'q before', 'Fall-backs', 'q after', 'Note'];
    if (alg === 'z') return ['i', 'S[i]', 'Z[i]', 'Reused', 'Compared', 'Z-box [l, r)'];
    return ['Shift s', 'Comparisons', 'Result', 'Next shift'];
  }

  function naive(R, T, P) {
    const n = T.length, m = P.length;
    R.snap({ line: ['n1'], msg: `Try every shift s = 0 … ${n - m} and compare P with T[s..s+${m - 1}] character by character, left to right.` });
    for (let s = 0; s <= n - m; s++) {
      let j = 0, c = 0;
      const pc = {};
      while (j < m) {
        R.cmp++; c++;
        const ok = P[j] === T[s + j];
        pc[j] = ok ? 'ok' : 'bad';
        R.snap({ line: ['n2', 'n3'], s, pcells: Object.assign({}, pc), cur: s + j, vars: { s, j, 'T[s+j]': q_(T[s + j]), 'P[j]': q_(P[j]) },
          msg: `Shift ${s}: compare P[${j}] = ‘${q_(P[j])}’ with T[${s + j}] = ‘${q_(T[s + j])}’: ${ok ? 'equal' : '<b>mismatch</b>'}.` });
        if (!ok) break; j++;
      }
      if (j === m) { R.found.push(s); R.rows.push([s, c, 'match', s + 1]); R.snap({ line: ['n4'], s, pcells: pc, vars: { s }, msg: `All ${m} characters match: <b>pattern occurs with shift ${s}</b>.` }); }
      else R.rows.push([s, c, 'mismatch at j = ' + j, s + 1]);
    }
  }

  function rk(R, T, P, o) {
    const n = T.length, m = P.length;
    const digits = /^\d+$/.test(T + P), d = digits ? 10 : 256, q = o.q;
    const val = c => digits ? Number(c) : c.charCodeAt(0);
    let h = 1; for (let i = 0; i < m - 1; i++) h = (h * d) % q;
    let p = 0, t = 0;
    for (let i = 0; i < m; i++) { p = (d * p + val(P[i])) % q; t = (d * t + val(T[i])) % q; }
    R.extra = { d, q, h, p, t, digits, spurious: 0, hits: 0 };
    R.snap({ line: ['r1', 'r2', 'r3', 'r4'], s: 0, vars: { d, q, h, p, t },
      msg: `Treat each window of ${m} characters as a number in base d = ${d}${digits ? ' (the digits themselves)' : ' (character codes)'}, reduced modulo q = ${q}. Horner’s rule gives p = P mod q = ${p} and t₀ = ${t}. h = d^(m−1) mod q = ${h}.` });
    for (let s = 0; s <= n - m; s++) {
      R.extra.t = t;
      if (p === t) {
        R.extra.hits++;
        let j = 0; const pc = {};
        while (j < m) { R.cmp++; const ok = P[j] === T[s + j]; pc[j] = ok ? 'ok' : 'bad'; if (!ok) break; j++; }
        if (j === m) { R.found.push(s); R.rows.push([s, t, p, 'hit → match']); R.snap({ line: ['r5', 'r6', 'r7'], s, pcells: pc, vars: { s, t, p }, msg: `Shift ${s}: t = ${t} equals p = ${p}, a <b>hit</b>. Check the characters: all match, so the pattern <b>occurs with shift ${s}</b>.` }); }
        else { R.extra.spurious++; R.rows.push([s, t, p, 'spurious hit']); R.snap({ line: ['r5', 'r6', 'r7'], s, pcells: pc, vars: { s, t, p }, msg: `Shift ${s}: t = ${t} equals p = ${p}, a hit, but checking the characters finds a mismatch at j = ${j}. A <b>spurious hit</b>: two different windows with the same value mod ${q}.` }); }
      } else {
        R.rows.push([s, t, p, '—']);
        R.snap({ line: ['r5', 'r6'], s, vars: { s, t, p }, msg: `Shift ${s}: t = ${t} ≠ p = ${p}, so T[${s}..${s + m - 1}] cannot equal P. No characters compared.` });
      }
      if (s < n - m) {
        const nt = ((d * (t - val(T[s]) * h) + val(T[s + m])) % q + q) % q;
        R.snap({ line: ['r8', 'r9'], s, vars: { s, t, 'new t': nt }, msg: `Roll the hash in O(1): drop ‘${q_(T[s])}’, shift left, add ‘${q_(T[s + m])}’: t = (${d}·(${t} − ${val(T[s])}·${h}) + ${val(T[s + m])}) mod ${q} = ${nt}.` });
        t = nt;
      }
    }
  }

  function fa(R, T, P) {
    const n = T.length, m = P.length, Sigma = alphabet(P, T), delta = transition(P, Sigma);
    R.extra = { Sigma, delta, q: 0, i: null };
    R.snap({ line: ['a1', 'a2'], msg: `Build the string-matching automaton: states 0 … ${m}, where state q means “the last q characters read are P[0..q−1]”. δ(q, a) is the length of the longest prefix of P that is a suffix of P[0..q−1]a. The table has ${(m + 1) * Sigma.length} entries.` });
    let q = 0;
    R.snap({ line: ['a3'], vars: { q }, msg: `Start in state 0. Each text character is read exactly once, with one table lookup: Θ(n) matching.` });
    for (let i = 0; i < n; i++) {
      const nq = delta[q][T[i]]; R.cmp++;
      const note = nq === m ? 'match' : nq === q + 1 ? 'advance' : nq === 0 ? 'reset to 0' : `fall back to ${nq}`;
      R.extra.q = nq; R.extra.i = i; R.extra.prev = q;
      if (nq === m) R.found.push(i - m + 1);
      R.rows.push([i, q_(T[i]), nq, note]);
      R.snap({ line: nq === m ? ['a4', 'a5', 'a6'] : ['a4', 'a5'], s: Math.max(0, i - nq + 1), cur: i, pcells: Object.fromEntries([...Array(nq).keys()].map(k => [k, 'ok'])), vars: { i, 'T[i]': q_(T[i]), q: nq },
        msg: `Read T[${i}] = ‘${q_(T[i])}’: δ(${q}, ‘${q_(T[i])}’) = ${nq}. ` + (nq === m ? `State ${m} is accepting: <b>match with shift ${i - m + 1}</b>.` : nq === q + 1 ? `The last ${nq} characters match P[0..${nq - 1}].` : nq === 0 ? 'No prefix of P ends here.' : `Only the last ${nq} character${nq === 1 ? '' : 's'} still match a prefix of P.`) });
      q = nq;
    }
  }

  function kmp(R, T, P) {
    const n = T.length, m = P.length, pi = Array(m).fill(null);
    pi[0] = 0; let k = 0;
    R.extra = { pi: pi.slice(), pq: null, pk: null, phase: 'pre' };
    R.snap({ line: ['p1'], msg: `First compute the prefix function: π[q] is the length of the longest proper prefix of P that is also a suffix of P[0..q]. It says how far to fall back after a mismatch. π[0] = 0.` });
    for (let q = 1; q < m; q++) {
      const fb = [];
      while (k > 0 && P[k] !== P[q]) { R.cmp++; fb.push(`${k}→${pi[k - 1]}`); k = pi[k - 1]; }
      R.cmp++;
      if (P[k] === P[q]) k++;
      pi[q] = k; R.extra.pi = pi.slice(); R.extra.pq = q; R.extra.pk = k;
      R.snap({ line: ['p2', 'p3', 'p4', 'p5'], vars: { q, k, 'P[q]': q_(P[q]) }, msg: `q = ${q} (P[${q}] = ‘${q_(P[q])}’): ` + (fb.length ? `mismatch, fall back k = ${fb.join(', ')}; ` : '') + `${k > 0 ? `P[0..${k - 1}] = “${P.slice(0, k)}” is both a prefix and a suffix of “${P.slice(0, q + 1)}”` : 'no proper prefix is also a suffix'}, so π[${q}] = ${k}.` });
    }
    R.extra.phase = 'match'; R.extra.pq = null;
    let q = 0;
    R.snap({ line: ['k1'], s: 0, vars: { q }, msg: `π = [${pi.join(', ')}]. Now scan the text once. q counts how many characters of P are matched so far; the text pointer i never moves back.` });
    for (let i = 0; i < n; i++) {
      const q0 = q, fb = [];
      while (q > 0 && P[q] !== T[i]) { R.cmp++; fb.push(`${q}→${pi[q - 1]}`); R.snap({ line: ['k2', 'k3'], s: i - q, cur: i, pcells: Object.assign(Object.fromEntries([...Array(q).keys()].map(x => [x, 'ok'])), { [q]: 'bad' }), vars: { i, q, 'T[i]': q_(T[i]) }, msg: `T[${i}] = ‘${q_(T[i])}’ ≠ P[${q}] = ‘${q_(P[q])}’. Fall back: q = π[${q - 1}] = ${pi[q - 1]}. The pattern slides right by ${q - pi[q - 1]}, and the first ${pi[q - 1]} characters are already known to match.` }); q = pi[q - 1]; }
      R.cmp++;
      const ok = P[q] === T[i];
      if (ok) q++;
      let note = ok ? 'match char' : 'no match';
      if (q === m) {
        R.found.push(i - m + 1); note = `match at shift ${i - m + 1}`;
        R.rows.push([i, q_(T[i]), q0, fb.join(', ') || '—', q, note]);
        R.snap({ line: ['k4', 'k5', 'k6'], s: i - m + 1, cur: i, pcells: Object.fromEntries([...Array(m).keys()].map(x => [x, 'ok'])), vars: { i, q }, msg: `T[${i}] = P[${m - 1}]: all ${m} characters matched. <b>Match with shift ${i - m + 1}</b>. Continue with q = π[${m - 1}] = ${pi[m - 1]} to find overlapping matches.` });
        q = pi[m - 1];
      } else {
        R.rows.push([i, q_(T[i]), q0, fb.join(', ') || '—', q, note]);
        R.snap({ line: ['k2', 'k4'], s: i - q + (ok ? 1 : 0), cur: i, pcells: Object.assign(Object.fromEntries([...Array(q).keys()].map(x => [x, 'ok'])), ok ? {} : { [q]: 'bad' }), vars: { i, q, 'T[i]': q_(T[i]) },
          msg: ok ? `T[${i}] = ‘${q_(T[i])}’ = P[${q - 1}]: q becomes ${q}.` : `T[${i}] = ‘${q_(T[i])}’ ≠ P[0]: q stays 0; move to the next text character.` });
      }
    }
  }

  function bm(R, T, P) {
    const n = T.length, m = P.length, Sigma = alphabet(P, T), sh = {};
    Sigma.forEach(c => sh[c] = m);
    for (let j = 0; j < m - 1; j++) sh[P[j]] = m - 1 - j;
    R.extra = { shift: sh, Sigma };
    R.snap({ line: ['b1', 'b2'], msg: `Bad-character table: shift[c] = distance from the last occurrence of c in P[0..${m - 2}] to the end of P, or m = ${m} if c does not occur there. After every attempt, the pattern jumps by shift[T[s + m − 1]], the text character under its last position.` });
    let s = 0;
    while (s <= n - m) {
      let j = m - 1, c = 0; const pc = {};
      while (j >= 0) {
        R.cmp++; c++;
        const ok = P[j] === T[s + j]; pc[j] = ok ? 'ok' : 'bad';
        R.snap({ line: ['b4', 'b5'], s, cur: s + j, pcells: Object.assign({}, pc), vars: { s, j }, msg: `Shift ${s}: compare from the <b>right</b>: P[${j}] = ‘${q_(P[j])}’ vs T[${s + j}] = ‘${q_(T[s + j])}’: ${ok ? 'equal' : '<b>mismatch</b>'}.` });
        if (!ok) break; j--;
      }
      const last = T[s + m - 1], jump = sh[last];
      if (j < 0) { R.found.push(s); }
      R.rows.push([s, c, j < 0 ? 'match' : `mismatch at j = ${j}`, s + jump]);
      R.snap({ line: j < 0 ? ['b6', 'b7'] : ['b7'], s, pcells: pc, vars: { s, 'T[s+m−1]': q_(last), shift: jump }, msg: (j < 0 ? `All characters match: <b>pattern occurs with shift ${s}</b>. ` : '') + `The text character under the last pattern position is ‘${q_(last)}’, shift[‘${q_(last)}’] = ${jump}: move the pattern to s = ${s + jump}.` + (jump === m ? ` (‘${q_(last)}’ is not in P[0..${m - 2}], so the whole pattern jumps past it.)` : '') });
      s += jump;
    }
  }

  function zalg(R, T, P) {
    const S = P + '$' + T, N = S.length, m = P.length, Z = Array(N).fill(null);
    Z[0] = N; let l = 0, r = 0;
    R.extra = { S, Z: Z.slice(), l, r, i: null };
    R.snap({ line: ['z1'], msg: `Join S = P + ‘$’ + T (length ${N}; ‘$’ appears in neither). Z[i] = the length of the longest substring starting at i that is also a prefix of S. A position in T with Z[i] = m = ${m} is a match.` });
    for (let i = 1; i < N; i++) {
      let z = 0, reused = '—';
      const l0 = l, r0 = r;
      if (i < r) { z = Math.min(r - i, Z[i - l]); reused = `min(${r - i}, Z[${i - l}]) = ${z}`; }
      let comps = 0;
      while (i + z < N && S[z] === S[i + z]) { z++; comps++; R.cmp++; }
      if (i + z < N) { comps++; R.cmp++; }
      Z[i] = z;
      if (i + z > r) { l = i; r = i + z; }
      R.extra = { S, Z: Z.slice(), l, r, i };
      const pos = i - m - 1;
      if (z === m && i > m) R.found.push(pos);
      R.rows.push([i, q_(S[i]), z, reused, comps, `[${l}, ${r})`]);
      R.snap({ line: z === m && i > m ? ['z2', 'z3', 'z4', 'z5', 'z6'] : ['z2', 'z3', 'z4', 'z5'], s: i > m ? pos : null, vars: { i, 'Z[i]': z, l, r },
        msg: `i = ${i}: ` + (reused !== '—' ? `i is inside the Z-box [${l0}, ${r0}), so S[${i}..${r0 - 1}] equals S[${i - l0}..${r0 - l0 - 1}]: start from ${reused} without comparing. ` : '') + `${comps} comparison${comps === 1 ? ' gives' : 's give'} Z[${i}] = ${z}.` +
          (z === m && i > m ? ` Z[${i}] = m: <b>match with shift ${pos}</b>.` : '') });
    }
  }

  function run(alg, T, P, o) {
    const R = recorder(T, P);
    let tooMany = false;
    try { ({ naive, rk, fa, kmp, bm, z: zalg })[alg](R, T, P, o); } catch (e) { if (e !== TOO) throw e; tooMany = true; }
    const truth = naiveFind(T, P);
    const msg = tooMany ? 'Stopped: too many steps. Use a shorter text.' :
      (R.found.length ? `Done. The pattern occurs with shift${R.found.length > 1 ? 's' : ''} <b>${R.found.join(', ')}</b>` : 'Done. The pattern does <b>not</b> occur in the text') +
      `. ${R.cmp} character comparison${R.cmp === 1 ? '' : 's'}${alg === 'fa' ? ' (here: table lookups)' : ''}; the naive method makes up to (n − m + 1)·m = ${(T.length - P.length + 1) * P.length}.` +
      (alg === 'rk' ? ` ${R.extra.hits} hit${R.extra.hits === 1 ? '' : 's'}, of which ${R.extra.spurious} spurious.` : '');
    R.snap({ line: [], msg, final: true });
    return { steps: R.steps, result: { found: R.found.slice(), cmp: R.cmp, ok: JSON.stringify(R.found) === JSON.stringify(truth), extra: R.extra, tooMany }, code: code(alg), header: header(alg) };
  }

  const API = { ALGS, run, prefixFunction, transition, alphabet, naiveFind, code, header };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.SMEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
