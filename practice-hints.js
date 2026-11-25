// Hints for the Practice page and the editor's practice bar. They are made from a problem's topics (tags) and
// difficulty, step by step: understand the limits, then each topic's idea, steps and common mistakes, then links.
// PracticeHints.open(problem) shows them in a dialog; problem = { judge, id, name, rating, tags, url }.
(() => {
  'use strict';
  const A = (id, label) => ['algorithms.html#' + id, label];          // our animation pages
  const S = (id, label) => ['stl.html#' + id, label];                 // our STL guide
  const T = {
    'greedy': { idea: 'Make the choice that looks best right now, and never undo it.',
      signs: 'You must pick or order items to maximise or minimise something, and sorting by one key seems to settle it.',
      steps: ['Guess the rule: "always take the smallest / earliest-ending / most valuable per unit".', 'Test the rule by hand on small cases, and try to find a counterexample.', 'Prove it with an exchange argument: swapping a different choice for the greedy one never makes the answer worse.', 'Often the code is: sort, then one pass.'],
      traps: 'A rule that works on the samples but fails on a tricky case. If you find a counterexample, the problem may need DP instead.', links: [S('sorting', 'sort with a comparator'), S('priority_queue', 'priority_queue')] },
    'math': { idea: 'Find a formula or a property instead of simulating everything.',
      signs: 'Large numbers (up to 10^9 or 10^18) where a loop over all values is too slow.',
      steps: ['Work out the answer by hand for n = 1, 2, 3, 4, 5 and look for a pattern.', 'Write the pattern as a formula and check it on the samples.', 'Use long long (or Python ints) for anything that can exceed about 2·10^9.'],
      traps: 'Overflow in multiplication, integer division rounding (use (a + b - 1) / b to round up), and negative numbers with %.', links: [] },
    'implementation': { idea: 'Do exactly what the statement says; the challenge is being careful, not clever.',
      signs: 'Long statement with many rules, small limits, a "simulate the process" feel.',
      steps: ['Read the statement twice and list every rule.', 'Choose simple data structures (arrays, strings, a grid).', 'Write it in small functions and test each with the samples.'],
      traps: 'Off-by-one errors, 0- vs 1-based indexes, forgetting an edge case such as n = 1.', links: [] },
    'dp': { idea: 'Break the problem into smaller versions of itself and store each answer so it is computed once.',
      signs: '"Number of ways", "minimum cost", "maximum value", choices that depend on earlier choices, n up to about 5000 (or 10^5 with a 1-D state).',
      steps: ['Define the state: dp[i] (or dp[i][j]) = the answer for the first i items / a prefix / a sub-range.', 'Write the transition: how dp[i] is built from smaller states (take it or leave it, last step, split point).', 'Set the base cases and the order of filling, then read the answer from the right cell.', 'Check the total work: number of states × work per state.'],
      traps: 'A wrong state that forgets something the future depends on; forgetting the modulo; memory too large (keep only the last row).', links: [A('dynamic-programming', 'dynamic programming animation'), A('n-queens', 'backtracking (N-Queens)')] },
    'constructive algorithms': { idea: 'Build an answer that satisfies the conditions, often from a simple pattern.',
      signs: '"Print any array / string / permutation such that…", or "print -1 if impossible".',
      steps: ['Solve tiny cases by hand and write the answers down.', 'Look for a pattern you can extend (alternate, sort, reverse, pair up).', 'Find exactly when it is impossible, and prove the pattern always works otherwise.'],
      traps: 'Missing the impossible cases; a pattern that breaks for even/odd n.', links: [] },
    'data structures': { idea: 'Pick a structure that answers the repeated queries fast.',
      signs: 'Many queries or updates (10^5 or more) on an array or a set of values.',
      steps: ['List the operations you need and how often.', 'Match them to a structure: set/map (order, lower_bound), priority_queue (min/max), prefix sums (range sums, no updates), Fenwick or segment tree (range queries with updates), stack/deque (nearest greater, sliding window).', 'Check every operation is O(log n) or better.'],
      traps: 'Using a vector where erase in the middle is O(n); forgetting that std::set removes duplicates (use multiset).', links: [S('set', 'set and multiset'), S('map', 'map'), S('priority_queue', 'priority_queue'), A('prefix-sum', 'prefix sums animation')] },
    'brute force': { idea: 'Try every possibility; it is fast enough because the limits are small.',
      signs: 'Small n (up to about 10–20) or a small range of values.',
      steps: ['Estimate the count: n! for n ≤ 10, 2^n for n ≤ 20, n^3 for n ≤ 500.', 'Enumerate with loops, recursion, bitmasks or next_permutation.', 'Check each candidate and keep the best.'],
      traps: 'Missing some candidates, or an enumeration that is bigger than you think.', links: [S('permutations', 'next_permutation'), A('tsp', 'brute force (TSP)')] },
    'binary search': { idea: 'If a yes/no condition switches from false to true only once, find the switch point in O(log range).',
      signs: '"Minimum x such that…", "maximum time", answer up to 10^9 or 10^18, or searching a sorted array.',
      steps: ['Write check(x): can it be done with x? It must be monotonic (false…false true…true).', 'Binary search on x between a low that fails and a high that works.', 'Total time: check cost × log(range).'],
      traps: 'An endless loop from mid rounding; overflow in (lo + hi) / 2 (use lo + (hi - lo) / 2); a check that is not really monotonic.', links: [S('searching', 'lower_bound / upper_bound')] },
    'sortings': { idea: 'Sorting often makes the structure obvious: neighbours, pairs, or a greedy order.',
      signs: 'Order does not matter in the input, or you compare elements with each other.',
      steps: ['Sort (maybe with a custom comparator or by pairs).', 'Now look at neighbours, use two pointers, or apply a greedy rule.'],
      traps: 'Losing the original indexes (sort pairs (value, index)); a comparator that is not a strict ordering.', links: [S('sorting', 'sort, stable_sort'), A('merge-sort', 'merge sort animation'), A('quick-sort', 'quick sort animation')] },
    'graphs': { idea: 'Model things as vertices and their relations as edges, then use a graph algorithm.',
      signs: 'Cities and roads, people and friendships, states and moves.',
      steps: ['Decide what the vertices and edges are; store an adjacency list.', 'Choose the algorithm: BFS (fewest steps), DFS (components, cycles), Dijkstra (weighted shortest path), DSU (merging groups), topological sort (dependencies).'],
      traps: 'Recursion too deep for DFS on 10^5 vertices (use an explicit stack); forgetting the graph may be disconnected.', links: [A('search', 'BFS / DFS animation'), A('shortest-path', 'shortest paths animation')] },
    'dfs and similar': { idea: 'Explore everything reachable: DFS goes deep first, BFS goes level by level.',
      signs: 'Connected components, flood fill on a grid, reachability, cycles.',
      steps: ['Build the adjacency list (or move through the grid with dr/dc arrays).', 'Keep a visited array; start a DFS/BFS from each unvisited vertex.', 'Collect what you need during the search (size, colour, parent, depth).'],
      traps: 'Not marking visited before pushing (BFS); stack overflow on deep recursion.', links: [A('search', 'BFS / DFS animation'), S('queue', 'queue and BFS on a grid')] },
    'trees': { idea: 'A tree has n - 1 edges and exactly one path between any two vertices: root it and use DFS.',
      signs: '"n vertices and n - 1 edges", parent arrays, subtrees.',
      steps: ['Root the tree (often at vertex 1) with a DFS or BFS.', 'Compute values bottom-up (subtree sizes, DP on children) or top-down (depths, parents).', 'For paths between two vertices, think about their lowest common ancestor.'],
      traps: 'Deep recursion on a long chain; going back to the parent in DFS.', links: [A('mst', 'spanning trees animation')] },
    'number theory': { idea: 'Use divisibility, primes, gcd and modular arithmetic.',
      signs: 'Divisors, primes, gcd/lcm, "modulo 10^9+7", remainders.',
      steps: ['Primes up to 10^6–10^7: sieve. Divisors of x: loop d up to sqrt(x).', 'gcd(a, b) by Euclid; lcm = a / gcd * b.', 'Under a modulus, use fast power; division is multiplication by the inverse (pow(a, p - 2) for a prime p).'],
      traps: 'Overflow before taking the modulus; a negative result from % in C/C++/Java (add the modulus).', links: [S('numeric', 'gcd and lcm')] },
    'combinatorics': { idea: 'Count arrangements with formulas instead of listing them.',
      signs: '"How many ways", answers modulo 10^9+7.',
      steps: ['Decide what is being chosen and whether order matters.', 'Use C(n, k) = n! / (k! (n-k)!), with factorials and inverse factorials precomputed modulo p.', 'Split into cases, or count the complement (total minus bad).'],
      traps: 'Counting some arrangements twice; forgetting the modulus after every multiplication.', links: [] },
    'strings': { idea: 'Process characters with counting, two pointers, hashing or prefix functions.',
      signs: 'Text input, palindromes, substrings, matching a pattern.',
      steps: ['Count characters with an array of 26.', 'Palindromes: compare from both ends. Pattern search: KMP or Z-function in O(n + m).', 'Compare substrings fast with hashing.'],
      traps: 'O(n^2) substr calls; reading a line with spaces (use getline).', links: [A('string-matching', 'string matching animation'), S('string', 'string')] },
    'bitmasks': { idea: 'Use the bits of an integer as a set of yes/no flags.',
      signs: 'n ≤ 20 items (subsets), XOR, AND/OR of numbers.',
      steps: ['A subset of n items is a number from 0 to 2^n - 1; item i is in it when (mask >> i) & 1.', 'Look at each bit separately: problems about XOR or AND are often solved bit by bit.'],
      traps: 'Operator precedence: write (x & y) == 0 with brackets; 1 << 40 needs 1LL.', links: [S('bitset', 'bitset')] },
    'two pointers': { idea: 'Move two indexes through a sorted array (or a window) so the total work is O(n).',
      signs: 'Pairs with a given sum, the longest/shortest subarray with a property, merging sorted lists.',
      steps: ['Sort if needed.', 'Keep left and right; move one forward depending on the current sum or condition.', 'Each pointer only moves forward, so the loop is O(n).'],
      traps: 'A condition that is not monotonic when the window grows; forgetting to update the answer at the right moment.', links: [] },
    'geometry': { idea: 'Work with points and vectors using exact integer arithmetic where possible.',
      signs: 'Coordinates, distances, polygons, areas.',
      steps: ['Use the cross product to tell left/right turns and to compute areas.', 'Avoid floating point; compare squared distances.'],
      traps: 'Precision errors with doubles; collinear points; overflow in products of coordinates.', links: [] },
    'dsu': { idea: 'Disjoint set union keeps groups that only ever merge, answering "same group?" almost in O(1).',
      signs: 'Merging components, Kruskal, connectivity after adding edges.',
      steps: ['parent[x] = x at the start; find(x) follows parents to the root (with path compression).', 'union(a, b) links one root to the other (by size).'],
      traps: 'Forgetting path compression and union by size on big inputs.', links: [A('mst', "Kruskal's algorithm animation")] },
    'shortest paths': { idea: 'Find least-cost paths: BFS for unit weights, Dijkstra for non-negative weights, Bellman-Ford with negatives.',
      signs: 'Weighted edges, "minimum time / cost to reach".',
      steps: ['Build the adjacency list with weights.', 'Run Dijkstra with a min-priority queue of (distance, vertex).', 'Skip old entries whose distance is larger than the best known.'],
      traps: 'Using int for distances that can reach 10^14; negative edges with Dijkstra.', links: [A('shortest-path', 'shortest paths animation'), S('priority_queue', "Dijkstra with priority_queue")] },
    'divide and conquer': { idea: 'Split the problem in halves, solve each, and combine.',
      signs: 'Counting pairs across halves (like inversions), recursive structure.',
      steps: ['Write solve(l, r) that solves both halves and then handles what crosses the middle.', 'Make the combine step O(r - l) so the total is O(n log n).'],
      traps: 'An expensive combine step that makes it O(n^2).', links: [A('merge-sort', 'merge sort animation')] },
    'games': { idea: 'Find winning and losing positions: a position is winning if some move leads to a losing one.',
      signs: 'Two players moving alternately, "who wins if both play optimally".',
      steps: ['Compute win/lose for small positions by hand or by brute force.', 'Look for a pattern (parity, modulo, symmetry) or use Grundy numbers (XOR, as in Nim).'],
      traps: 'Assuming the opponent plays badly.', links: [A('game-theory', 'game theory animation')] },
    'probabilities': { idea: 'Use expected value and its linearity: the expected sum is the sum of expectations.',
      signs: '"Expected number", "probability", answers modulo a prime.',
      steps: ['Write the expectation as a sum of simple events.', 'For answers modulo p, represent fractions with modular inverses.'],
      traps: 'Treating dependent events as independent.', links: [] },
    'hashing': { idea: 'Map strings or sets to numbers so they can be compared in O(1).',
      signs: 'Comparing many substrings, finding equal parts.',
      steps: ['Polynomial hash with prefix hashes lets you get any substring hash in O(1).', 'Use two moduli (or a 64-bit modulus) to avoid collisions.'],
      traps: 'Collisions with a single small modulus; anti-hash tests for unordered_map (use a custom hash).', links: [S('unordered', 'unordered_map')] },
    'interactive': { idea: 'Your program asks questions and reads the judge\'s answers.',
      signs: 'The statement says "This is an interactive problem".',
      steps: ['Flush after every output (cout << endl, or fflush(stdout), System.out.flush(), print(..., flush=True)).', 'Usually binary search or halving keeps the number of questions small.'],
      traps: 'Forgetting to flush; asking more questions than allowed. Interactive problems cannot be tested with the Input box here.', links: [] },
    'matrices': { idea: 'Use matrix multiplication, often with fast exponentiation, for linear recurrences.',
      signs: 'Huge n (10^18) with a recurrence like Fibonacci.',
      steps: ['Write the recurrence as a matrix times a vector.', 'Raise the matrix to the n-th power in O(k^3 log n).'],
      traps: 'Overflow inside the multiplication; forgetting the modulus.', links: [] },
    'flows': { idea: 'Model capacities as a network and compute the maximum flow or a minimum cut.',
      signs: 'Assignments with limits, matching, "minimum number of edges to remove".',
      steps: ['Build source → left side → right side → sink with capacities.', 'Run Dinic; the max flow equals the min cut.'],
      traps: 'Forgetting reverse edges.', links: [] },
    'ternary search': { idea: 'Find the minimum of a function that goes down and then up.',
      signs: 'A unimodal function of one variable.',
      steps: ['Compare f(m1) and f(m2) at two inner points and drop the worse third.'],
      traps: 'Flat regions where the function is not strictly unimodal.', links: [] },
    'meet-in-the-middle': { idea: 'Split into two halves of about n/2, enumerate each, and combine with sorting or hashing.',
      signs: 'n around 40, where 2^n is too much but 2^(n/2) is fine.',
      steps: ['Enumerate all subsets of each half.', 'Sort one list and binary search (or two pointers) from the other.'],
      traps: 'Memory for 2^20 entries per side.', links: [] },
    'string suffix structures': { idea: 'Suffix arrays or automata answer substring questions quickly.',
      signs: 'Counting distinct substrings, longest repeated substring.',
      steps: ['Build a suffix array with LCP, or a suffix automaton.'], traps: 'These are advanced; try hashing first.', links: [] },
    'graph matchings': { idea: 'Pair up vertices of two groups as much as possible.',
      signs: 'Assigning workers to jobs, one each.', steps: ['Use Kuhn\'s algorithm (DFS augmenting paths) or a flow network.'], traps: 'Large graphs need Hopcroft-Karp.', links: [] },
    'fft': { idea: 'Multiply polynomials in O(n log n).', signs: 'Counting sums of pairs, convolutions with n up to 10^5–10^6.', steps: ['Write the answer as a polynomial product and use FFT/NTT.'], traps: 'Precision with FFT doubles; NTT needs a suitable prime.', links: [] },
    '2-sat': { idea: 'Each variable is true or false and every clause has two literals: solve with strongly connected components.', signs: '"Choose one of two options for each item" with pairwise constraints.', steps: ['Build the implication graph and find SCCs.'], traps: 'x and not x in the same component means impossible.', links: [] },
    'expression parsing': { idea: 'Evaluate formulas with a stack or recursive descent.', signs: 'Brackets, operators, precedence.', steps: ['Use two stacks (numbers, operators) or a recursive parser per precedence level.'], traps: 'Unary minus and precedence.', links: [S('stack', 'stack')] },
    'chinese remainder theorem': { idea: 'Combine congruences x ≡ a (mod m) into one.', signs: 'Several remainders with different moduli.', steps: ['Merge two congruences at a time with the extended Euclidean algorithm.'], traps: 'Moduli that are not coprime.', links: [] },
    'schedules': { idea: 'Order tasks in time, often greedily by deadline or end time.', signs: 'Intervals, deadlines, meetings.', steps: ['Sort by end time or deadline; use a priority queue for the current tasks.'], traps: 'Ties in the sort order.', links: [S('priority_queue', 'priority_queue')] },
    'communication': { idea: 'Your program runs twice and must pass information through limited messages.', signs: 'The statement describes two runs.', steps: ['Design a compact encoding first.'], traps: 'Exceeding the message limit.', links: [] },
    'prefix sums': { idea: 'Precompute running totals so any range sum takes O(1).', signs: 'Many range-sum questions on a fixed array.', steps: ['P[0] = 0, P[i+1] = P[i] + a[i]; sum(l..r) = P[r+1] - P[l].', 'For range updates, use a difference array.'], traps: 'Off-by-one between P and a; overflow (use long long).', links: [A('prefix-sum', 'prefix sums animation')] },
    'arrays': { idea: 'Work with indexes carefully; often one or two passes are enough.', signs: 'A list of numbers and a question about it.', steps: ['Think about what you need to remember while scanning once (max so far, count, last position).'], traps: 'Index out of range at the ends.', links: [] },
    'recursion': { idea: 'Solve the problem by calling the same function on a smaller input.', signs: 'Self-similar structure: trees, subsets, divide and conquer.', steps: ['Write the base case first, then the step that makes the problem smaller.'], traps: 'Missing base case; very deep recursion.', links: [] }
  };
  const LIMITS = 'Look at the limits first: about 10^8 simple steps fit in a second. n ≤ 10: n! is fine · n ≤ 20: 2^n · n ≤ 500: n^3 · n ≤ 5000: n^2 · n ≤ 2·10^5: n log n · n up to 10^9 or more: O(log n) or a formula.';
  function tier(r) {
    if (!r) return 'This problem has no difficulty rating yet. Start with the samples and the limits.';
    if (r <= 1000) return `Rated ${r}: a beginner problem. The solution is usually direct: read carefully and handle the edge cases.`;
    if (r <= 1400) return `Rated ${r}: usually one idea, often a simple greedy, sorting or counting observation.`;
    if (r <= 1900) return `Rated ${r}: expect one key observation plus a standard technique from the topics below.`;
    if (r <= 2400) return `Rated ${r}: hard. Usually two ideas combined; check that your plan fits the time limit before coding.`;
    return `Rated ${r}: very hard. Read the editorial after a serious attempt; it is normal to need it at this level.`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // the hints for one problem, in the order they are revealed
  function build(p) {
    const out = [{ t: 'Start here', h: `<p>${esc(tier(p.rating))}</p><p>${esc(LIMITS)}</p><p>Solve the samples by hand before writing code; it often shows the idea.</p>` }];
    const tags = (p.tags || []).filter(t => T[t]);
    if (!tags.length) out.push({ t: 'Topics', h: '<p>This problem has no topic tags. Think about which techniques the limits allow (see above), and try small cases by hand to find a pattern.</p>' });
    for (const t of tags) {
      const x = T[t];
      out.push({ t: `Topic: ${t}`, h: `<p><b>The idea.</b> ${esc(x.idea)}</p><p><b>When it fits.</b> ${esc(x.signs)}</p>` });
      out.push({ t: `How to use ${t}`, h: `<ol>${x.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol><p><b>Common mistakes.</b> ${esc(x.traps)}</p>` + (x.links.length ? `<p><b>Learn it here:</b> ${x.links.map(([href, label]) => `<a href="${href}" data-internal>${esc(label)}</a>`).join(' · ')}</p>` : '') });
    }
    const q = encodeURIComponent(`${p.judge === 'cf' ? 'Codeforces' : 'CodeChef'} ${p.id} ${p.name} editorial`);
    out.push({ t: 'Still stuck?', h: `<p>Read the official editorial (the authors' explanation), then write the code yourself without looking.</p><p><a href="https://www.google.com/search?q=${q}" target="_blank" rel="noopener">Search for the editorial of ${esc(p.id)}</a> · <a href="${esc(p.url)}" target="_blank" rel="noopener">Open the problem</a></p>` });
    return out;
  }

  let dlg = null, reveal = () => {};
  function open(p) {
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.className = 'hintdlg';
      dlg.innerHTML = `<style>
        .hintdlg{border:1px solid var(--line); border-radius:14px; background:var(--surface); color:var(--ink); padding:0; width:min(640px,calc(100vw - 32px)); max-height:calc(100dvh - 40px)}
        .hintdlg::backdrop{background:rgba(0,0,0,.5)}
        .hintdlg .hh{padding:16px 20px 10px; border-bottom:1px solid var(--line)}
        .hintdlg .hh h3{margin:0; font:800 1.25rem "Bricolage Grotesque",system-ui,sans-serif}
        .hintdlg .hh p{margin:4px 0 0; color:var(--muted); font-size:.88rem}
        .hintdlg .hb{padding:12px 20px; overflow:auto; max-height:calc(100dvh - 220px)}
        .hintdlg .hint{border:1px solid var(--line); border-radius:10px; padding:10px 14px; margin-bottom:10px; background:color-mix(in oklab,var(--accent) 5%,var(--surface))}
        .hintdlg .hint h4{margin:0 0 4px; font-size:.95rem; color:var(--accent)}
        .hintdlg .hint p,.hintdlg .hint ol{margin:4px 0; font-size:.92rem; line-height:1.5}
        .hintdlg .hint ol{padding-left:1.3em}
        .hintdlg a{color:var(--accent)}
        .hintdlg .hf{display:flex; align-items:center; gap:8px; padding:10px 20px 16px; border-top:1px solid var(--line)}
        .hintdlg .hf span{margin-right:auto; color:var(--muted); font-size:.85rem}
        .hintdlg button{font:700 .88rem "Atkinson Hyperlegible",sans-serif; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:8px; padding:7px 14px; cursor:pointer}
        .hintdlg button.primary{background:var(--accent); border-color:var(--accent); color:var(--accent-ink)}
        .hintdlg button:disabled{opacity:.45; cursor:default}
      </style><div class="hh"><h3></h3><p></p></div><div class="hb" aria-live="polite"></div>
      <div class="hf"><span></span><button type="button" data-all>Show all</button><button type="button" class="primary" data-next>Next hint</button><button type="button" data-close>Close</button></div>`;
      document.body.appendChild(dlg);
      dlg.addEventListener('click', e => {
        if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
        else if (e.target.closest('[data-next]')) reveal(1);
        else if (e.target.closest('[data-all]')) reveal(99);
        else {
          const a = e.target.closest('a[data-internal]');
          if (a && window.desktop) { e.preventDefault(); const page = a.getAttribute('href').split('.')[0]; try { sessionStorage.setItem('ccp.goto', a.getAttribute('href').split('#')[1] || ''); } catch (_) {} window.desktop.go(page === 'algorithms' ? 'algorithms' : 'stl'); }
        }
      });
    }
    const hints = build(p);
    let shown = 0;
    const body = dlg.querySelector('.hb');
    dlg.querySelector('h3').textContent = `${p.id} · ${p.name}`;
    dlg.querySelector('.hh p').textContent = `${p.judge === 'cf' ? 'Codeforces' : 'CodeChef'}${p.rating ? ' · rating ' + p.rating : ''}${p.tags && p.tags.length ? ' · ' + p.tags.join(', ') : ''}`;
    reveal = k => {
      while (k-- > 0 && shown < hints.length) {
        const h = hints[shown++], el = document.createElement('div');
        el.className = 'hint';
        el.innerHTML = `<h4>Hint ${shown} of ${hints.length}: ${esc(h.t)}</h4>${h.h}`;
        body.appendChild(el);
        el.scrollIntoView({ block: 'nearest' });
      }
      dlg.querySelector('.hf span').textContent = shown < hints.length ? 'Try again after each hint before reading the next.' : 'That is all the hints.';
      dlg.querySelector('[data-next]').disabled = dlg.querySelector('[data-all]').disabled = shown >= hints.length;
    };
    body.textContent = '';
    reveal(1);
    if (!dlg.open) dlg.showModal();
  }
  window.PracticeHints = { open, build };

  /* ---------- shared by the Practice page and the editor ---------- */
  const JUDGE = { cf: 'Codeforces', cc: 'CodeChef' };
  // a starting program with the problem's name and link at the top
  function template(p, lang) {
    const head = [`${JUDGE[p.judge]} ${p.id}: ${p.name}`, p.url, 'Read the input (put the sample input in the Input box) and print the answer.'];
    if (lang === 'python') return head.map(l => '# ' + l).join('\n') + '\nimport sys\ninput = sys.stdin.readline\n\n\ndef main():\n    n = int(input())\n    \n\n\nmain()\n';
    const c = head.map(l => '// ' + l).join('\n') + '\n';
    if (lang === 'cpp') return c + '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    int n;\n    cin >> n;\n    \n    return 0;\n}\n';
    if (lang === 'c') return c + '#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    \n    return 0;\n}\n';
    return c + 'import java.io.*;\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        StringTokenizer st = new StringTokenizer(br.readLine());\n        int n = Integer.parseInt(st.nextToken());\n        \n    }\n}\n';
  }
  // copy text to the clipboard right away (inside the click, before a new tab takes the focus)
  function copy(text) {
    if (window.desktop && window.desktop.copy) { window.desktop.copy(text); return Promise.resolve(true); }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove();
    if (ok || !navigator.clipboard) return Promise.resolve(ok);
    return navigator.clipboard.writeText(text).then(() => true, () => false);
  }
  // Submit: start copying the code (if any), then open the judge's submit page in the browser.
  // Returns a promise of whether the code was copied.
  function submit(p, code) {
    const copied = code ? copy(code) : Promise.resolve(false);
    window.open(p.submit, '_blank', 'noopener');
    return copied;
  }
  const NOTE = { cf: 'Log in to Codeforces once in your browser (tick "Remember me"); after that Submit opens the submit form straight away.', cc: 'Log in to CodeChef once in your browser; after that Submit opens the submit page straight away.' };
  window.Practice = { template, submit, copy, JUDGE, NOTE };
})();
