/* N-Queens engine: backtracking (first solution or all solutions), backtracking with column/diagonal arrays
   for O(1) safety checks, and min-conflicts local search. Rows and columns are shown 1-based, as in textbooks;
   x[r] is the column of the queen in row r. Each step stores the board, the cell being tried, the attacking queen,
   the state-space tree (for small runs), counters and trace rows.
   Works in the browser (window.NQEngine) and in Node. */
(function (root) {
  const MODES = {
    first: { name: 'Backtracking: first solution', short: 'First solution' },
    all: { name: 'Backtracking: all solutions', short: 'All solutions' },
    sets: { name: 'Backtracking with column and diagonal arrays', short: 'O(1) safety check' },
    minconf: { name: 'Min-conflicts local search', short: 'Min-conflicts' }
  };
  const kw = s => `<span class="kw">${s}</span>`, cm = s => `<span class="cm">${s}</span>`;
  const TREE_MAX = 90, STEP_MAX = 6000;

  function code(mode) {
    const C = [], P = t => C.push({ proc: t }), L = (k, t) => C.push({ key: k, text: t });
    if (mode === 'minconf') {
      P('MIN-CONFLICTS(n, maxSteps)   ▷ one queen per row, x[r] = its column');
      L('a', `x = a random (or greedy) column for every row`);
      L('b', `${kw('for')} step = 1 ${kw('to')} maxSteps:`);
      L('c', `    ${kw('if')} no queen is attacked:  ${kw('return')} x   ${cm('▷ solved')}`);
      L('d', `    r = a random row whose queen is attacked`);
      L('e', `    x[r] = the column with the fewest conflicts in row r  ${cm('(random tie-break)')}`);
      L('f', `${kw('return')} failure   ${cm('▷ restart with a new random start')}`);
      return C;
    }
    P(`N-QUEENS(r)   ▷ call N-QUEENS(1); rows above r already hold safe queens`);
    L('a', `${kw('if')} r > n:  print x[1..n]${mode === 'all' ? ';  ' + kw('return') + '  ' + cm('▷ keep searching') : ';  ' + kw('stop')}`);
    L('b', `${kw('for')} c = 1 ${kw('to')} n:`);
    L('c', `    ${kw('if')} PLACE(r, c):`);
    L('d', `        x[r] = c${mode === 'sets' ? ';  col[c] = d1[r + c] = d2[r − c + n] = true' : ''}`);
    L('e', `        N-QUEENS(r + 1)`);
    L('f', `        remove queen r${mode === 'sets' ? ';  clear the three flags' : ''}   ${cm('▷ backtrack')}`);
    L('g', `${cm('▷ no column left in row r: return to row r − 1')}`);
    P('PLACE(r, c)   ▷ is square (r, c) safe?');
    if (mode === 'sets') L('h', `${kw('return')} ${kw('not')} (col[c] ${kw('or')} d1[r + c] ${kw('or')} d2[r − c + n])   ${cm('▷ O(1)')}`);
    else {
      L('h', `${kw('for')} j = 1 ${kw('to')} r − 1:   ${kw('if')} x[j] == c ${kw('or')} |x[j] − c| == r − j:  ${kw('return')} false`);
      L('i', `${kw('return')} true`);
    }
    return C;
  }
  function header(mode) {
    return mode === 'minconf' ? ['Step', 'Row r', 'Conflicts per column', 'Move', 'Attacked queens'] : ['Row r', 'Column c', 'Check', 'Action', 'x[1..r]'];
  }

  function recorder(n) {
    const R = { steps: [], rows: [], tree: [], x: Array(n).fill(-1), stats: { tries: 0, placed: 0, back: 0, sols: 0 }, sols: [], flags: null, overflow: false };
    R.snap = o => {
      if (R.steps.length >= STEP_MAX) { R.overflow = true; return; }
      R.steps.push(Object.assign({ line: [], msg: '', vars: {}, tryAt: null, att: null, counts: null, cur: -1 }, o, {
        x: R.x.slice(), stats: Object.assign({}, R.stats), sols: R.sols.length, solList: R.sols.slice(-8).map(s => s.slice()),
        treeLen: R.tree.length, flags: R.flags ? { col: R.flags.col.slice(), d1: R.flags.d1.slice(), d2: R.flags.d2.slice() } : null,
        rows: R.rows.slice()
      }));
    };
    return R;
  }
  const xs = (x, upto) => x.slice(0, upto).map(c => c + 1).join(', ') || '—';

  function backtrack(R, n, mode) {
    const all = mode === 'all', sets = mode === 'sets', x = R.x, S = R.stats;
    const verbose = !all || n <= 6;
    if (sets) R.flags = { col: Array(n).fill(false), d1: Array(2 * n - 1).fill(false), d2: Array(2 * n - 1).fill(false) };
    R.tree.push({ id: 0, parent: -1, label: 'start', st: 'done', depth: 0 });
    R.snap({ msg: `Place ${n} queens on a ${n} × ${n} board so that no two share a row, a column or a diagonal. Put one queen in each row, trying columns from left to right.`, vars: { n } });
    function attacker(r, c) { for (let j = 0; j < r; j++) if (x[j] === c || Math.abs(x[j] - c) === r - j) return j; return -1; }
    function solve(r, node) {
      if (r === n) {
        S.sols++; R.sols.push(x.slice()); R.tree[node].st = 'sol';
        R.rows.push([r, '—', '—', `solution ${S.sols}`, xs(x, n)]);
        R.snap({ line: ['a'], cur: node, msg: `All ${n} rows hold a queen: solution ${S.sols} is (${xs(x, n)}).${all ? ' Keep searching for more.' : ''}`, vars: { r: '> n', solutions: S.sols } });
        return !all;
      }
      for (let c = 0; c < n; c++) {
        if (R.overflow) return true;
        S.tries++; const j = attacker(r, c);
        const why = j < 0 ? '' : x[j] === c ? `same column as the queen in row ${j + 1}` : `same diagonal as the queen in row ${j + 1}`;
        const checkLine = sets ? ['b', 'c', 'h'] : ['b', 'c', 'h'];
        if (j >= 0) {
          if (R.tree.length < 4 * TREE_MAX) R.tree.push({ id: R.tree.length, parent: node, label: `${c + 1}`, st: 'dead', depth: r + 1 });
          if (verbose) {
            R.rows.push([r + 1, c + 1, sets ? 'flag set' : `attacked by row ${j + 1}`, 'skip', xs(x, r)]);
            R.snap({ line: checkLine, cur: R.tree.length - 1, tryAt: [r, c], att: [j, x[j]], msg: `Row ${r + 1}, column ${c + 1}: ${why}. ${sets ? `(${x[j] === c ? `col[${c + 1}]` : (j + x[j] === r + c ? `d1[${r + c + 2}]` : `d2[${r - c + n}]`)} is already true.) ` : ''}Not safe.`, vars: { r: r + 1, c: c + 1 } });
          }
          continue;
        }
        x[r] = c; S.placed++;
        if (sets) { R.flags.col[c] = R.flags.d1[r + c] = R.flags.d2[r - c + n - 1] = true; }
        const id = R.tree.length; R.tree.push({ id, parent: node, label: `${c + 1}`, st: 'live', depth: r + 1 });
        R.rows.push([r + 1, c + 1, 'safe', 'place', xs(x, r + 1)]);
        R.snap({ line: sets ? ['c', 'h', 'd'] : ['c', 'i', 'd'], cur: id, tryAt: [r, c], msg: `Row ${r + 1}, column ${c + 1} is safe. Place the queen: x[${r + 1}] = ${c + 1}.`, vars: { r: r + 1, c: c + 1 } });
        if (solve(r + 1, id)) return true;
        if (R.overflow) return true;
        x[r] = -1; S.back++;
        if (sets) { R.flags.col[c] = R.flags.d1[r + c] = R.flags.d2[r - c + n - 1] = false; }
        if (R.tree[id].st === 'live') R.tree[id].st = 'done';
        R.rows.push([r + 1, c + 1, '—', 'remove (backtrack)', xs(x, r)]);
        R.snap({ line: ['f'], cur: id, tryAt: [r, c], msg: `Back in row ${r + 1}: remove the queen from column ${c + 1} and try the next column.`, vars: { r: r + 1, c: c + 1 } });
      }
      if (verbose && r > 0) R.snap({ line: ['g'], cur: node, msg: `Row ${r + 1} has no safe column left. Dead end: backtrack to row ${r}.`, vars: { r: r + 1 } });
      return false;
    }
    solve(0, 0);
    // tree nodes that never reached a solution and are finished are dead ends
    R.tree.forEach(t => { if (t.st === 'live') t.st = 'done'; });
  }

  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function minconf(R, n, seed, maxSteps) {
    const rand = rng(seed), x = R.x, S = R.stats;
    const conf = (r, c) => { let k = 0; for (let j = 0; j < n; j++) if (j !== r && x[j] >= 0 && (x[j] === c || Math.abs(x[j] - c) === Math.abs(j - r))) k++; return k; };
    for (let r = 0; r < n; r++) x[r] = Math.floor(rand() * n);
    const attacked = () => range(n).filter(r => conf(r, x[r]) > 0);
    R.snap({ line: ['a'], msg: `Start from a random board with one queen in each row (seed ${seed}). ${attacked().length} queens are attacked.`, vars: { n, seed } });
    for (let step = 1; step <= maxSteps; step++) {
      const bad = attacked();
      if (!bad.length) { S.sols = 1; R.sols.push(x.slice()); R.snap({ line: ['c'], msg: `No queen is attacked: solved after ${step - 1} moves.`, vars: { step: step - 1, attacked: 0 } }); R.solved = true; return; }
      const r = bad[Math.floor(rand() * bad.length)], counts = range(n).map(c => conf(r, c));
      const mn = Math.min(...counts), best = range(n).filter(c => counts[c] === mn), c = best[Math.floor(rand() * best.length)], from = x[r];
      R.snap({ line: ['b', 'c', 'd'], tryAt: [r, from], counts: { r, v: counts }, msg: `${bad.length} queen${bad.length === 1 ? ' is' : 's are'} attacked. Pick row ${r + 1}; its queen has ${counts[from]} conflict${counts[from] === 1 ? '' : 's'}. The numbers show the conflicts for each column of that row.`, vars: { step, r: r + 1, attacked: bad.length } });
      x[r] = c; S.tries++; if (c !== from) S.placed++;
      const after = attacked().length;
      R.rows.push([step, r + 1, counts.join(' '), c === from ? `stay in column ${c + 1}` : `column ${from + 1} → ${c + 1}`, after]);
      R.snap({ line: ['e'], tryAt: [r, c], counts: { r, v: counts }, msg: `Move row ${r + 1}'s queen to column ${c + 1}, which has the fewest conflicts (${mn})${best.length > 1 ? `; ties broken at random among columns ${best.map(b => b + 1).join(', ')}` : ''}. Now ${after} queen${after === 1 ? ' is' : 's are'} attacked.`, vars: { step, r: r + 1, attacked: after } });
    }
    if (!attacked().length) { S.sols = 1; R.sols.push(x.slice()); R.solved = true; R.snap({ line: ['c'], msg: `Solved after ${maxSteps} moves.`, vars: {} }); return; }
    R.snap({ line: ['f'], msg: `No solution within ${maxSteps} moves (stuck on a plateau or local minimum). Try another seed: min-conflicts restarts from a new random board.`, vars: {} });
  }
  const range = n => Array.from({ length: n }, (_, i) => i);

  function run(mode, input) {
    const n = input.n, R = recorder(n);
    if (mode === 'minconf') minconf(R, n, input.seed || 1, input.maxSteps || 100); else backtrack(R, n, mode);
    const S = R.stats; let msg;
    if (mode === 'minconf') msg = R.solved ? `Solved: x = (${xs(R.sols[0], n)}) after ${S.tries} moves. Min-conflicts solves even n = 1,000,000 in about 50 moves on average, but it can get stuck and gives no proof when there is no solution.` : `Not solved in ${input.maxSteps || 100} moves. Restart with a different seed.`;
    else if (mode === 'all') msg = `<b>${S.sols}</b> solution${S.sols === 1 ? '' : 's'} for n = ${n}, after ${S.placed} placements and ${S.tries} squares tested (out of ${n}<sup>${n}</sup> = ${Math.pow(n, n).toLocaleString('en')} ways to put one queen per row).${n > 6 ? ' Unsafe squares are counted but not shown as separate steps.' : ''}`;
    else msg = S.sols ? `First solution x = (<b>${xs(R.sols[0], n)}</b>) after ${S.placed} placements, ${S.back} backtracks and ${S.tries} squares tested.` : `No solution exists for n = ${n}: the whole tree was searched (${S.placed} placements).`;
    if (R.overflow) msg += ` (Showing the first ${STEP_MAX} steps only.)`;
    const last = R.steps[R.steps.length - 1];
    if (!R.overflow) R.steps.push(Object.assign({}, last, { line: [], msg, final: true, tryAt: null, att: null, counts: null, cur: -1, x: R.sols.length && mode !== 'all' ? R.sols[0].slice() : last.x }));
    else R.steps[R.steps.length - 1] = Object.assign({}, last, { msg });
    const tree = R.tree.length <= TREE_MAX && mode !== 'minconf' ? R.tree : null;
    return { steps: R.steps, tree, sols: R.sols, stats: S, code: code(mode), header: header(mode), solved: R.solved };
  }

  const API = { MODES, run, code, header };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.NQEngine = API;
})(typeof window !== 'undefined' ? window : globalThis);
