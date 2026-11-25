// Algorithms page: the animated simulations (sims/, from the algorithm-simulations project) in a frame, with
// buttons that open the matching program in C, C++, Java or Python in the code editor.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem('ccp.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.' + k, v); } catch (_) {} } };
  const D = window.desktop;

  // the simulations use the same Light / Dark / System setting as the playground
  const themeFrame = f => { try { const t = document.documentElement.dataset.theme, r = f.contentDocument.documentElement; if (t) r.dataset.theme = t; else delete r.dataset.theme; } catch (_) {} };
  $('theme').value = store.get('theme') || 'system';
  $('theme').onchange = () => {
    const t = $('theme').value;
    store.set('theme', t);
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    themeFrame($('frame'));
  };
  $('frame').addEventListener('load', () => themeFrame($('frame')));

  const SIMS = [
    ['Sorting', 'insertion-sort', 'Insertion sort', 'Θ(n²), stable'],
    ['Sorting', 'bubble-sort', 'Bubble sort', 'with early exit'],
    ['Sorting', 'counting-sort', 'Counting sort', 'Θ(n + k), stable'],
    ['Sorting', 'merge-sort', 'Merge sort', 'top-down and bottom-up'],
    ['Sorting', 'quick-sort', 'Quick sort', 'Lomuto, Hoare, quickselect'],
    ['Searching', 'search', 'Graph search', 'BFS, DFS, UCS, IDS, greedy, A*'],
    ['Graphs', 'shortest-path', 'Shortest paths', 'Dijkstra, Bellman–Ford, Floyd–Warshall'],
    ['Graphs', 'mst', 'Minimum spanning trees', 'Kruskal, Prim, Borůvka'],
    ['Strings and arrays', 'string-matching', 'String matching', 'naive, Rabin–Karp, KMP, Boyer–Moore'],
    ['Strings and arrays', 'prefix-sum', 'Prefix and suffix sums', 'range queries, difference arrays'],
    ['Design techniques', 'dynamic-programming', 'Dynamic programming', 'Fibonacci, knapsack, LCS, coin change…'],
    ['Design techniques', 'n-queens', 'N-Queens', 'backtracking, state-space tree'],
    ['Hard problems and games', 'tsp', 'Travelling salesman', 'brute force, Held–Karp, 2-opt'],
    ['Hard problems and games', 'game-theory', 'Game theory', 'minimax, alpha–beta, Nash, Nim']
  ];
  const LANG = [['c', 'C'], ['cpp', 'C++'], ['java', 'Java'], ['python', 'Python']];
  // programs (Example menu names) for each simulation
  const programs = {};
  for (const [name, sim] of Object.entries(window.EXAMPLE_SIMS || {})) (programs[sim] = programs[sim] || []).push(name);
  const find = (lang, name) => ((window.MORE_EXAMPLES || {})[lang] || []).find(e => e[1] === name);

  let group = '';
  $('toc').innerHTML = SIMS.map(([g, id, title, sub]) => {
    const h = g !== group ? `<h3>${esc(g)}</h3>` : '';
    group = g;
    return h + `<a href="#${id}" data-id="${id}">${esc(title)}<small>${esc(sub)}</small></a>`;
  }).join('');

  function show(id) {
    const s = SIMS.find(x => x[1] === id) || SIMS[0];
    id = s[1];
    $('simTitle').textContent = s[2];
    const url = `sims/${id}/index.html`;
    if ($('frame').getAttribute('src') !== url) $('frame').setAttribute('src', url);
    $('newTab').href = url;
    $('newTab').hidden = !!D;          // the desktop app has no browser tabs
    document.querySelectorAll('#toc a').forEach(a => a.setAttribute('aria-current', a.dataset.id === id ? 'true' : 'false'));
    const list = programs[id] || [];
    $('code').hidden = !list.length;
    $('code').innerHTML = '<span class="lab">Code to run and change:</span>' + list.map(name =>
      `<span class="prog"><b>${esc(name)}</b>${LANG.map(([l, label]) => find(l, name) ? `<button class="btn" type="button" data-l="${l}" data-n="${esc(name)}" title="Open ${esc(name)} in ${label} in the code editor">${label}</button>` : '').join('')}</span>`).join('');
    store.set('sim', id);
  }
  $('code').onclick = e => {
    const b = e.target.closest('[data-l]');
    if (!b) return;
    const ex = find(b.dataset.l, b.dataset.n);
    try { sessionStorage.setItem('ccp.handoff', JSON.stringify({ lang: b.dataset.l, code: ex[2], input: ex[3], example: b.dataset.n })); } catch (_) {}
    if (D) D.go('editor'); else location.href = 'index.html';
  };
  addEventListener('hashchange', () => show(location.hash.slice(1)));
  show(location.hash.slice(1) || store.get('sim') || SIMS[0][1]);

  if (D) {
    for (const [btn, page] of [['toEditor', 'editor'], ['toStl', 'stl'], ['toNotebook', 'notebook']])
      $(btn).onclick = e => { e.preventDefault(); D.go(page); };
    D.docState({ dirty: false, path: null, name: 'Algorithms' });
    // the simulations are a study aid, so exam mode hides them like the guides
    const applyExam = on => {
      document.querySelector('.main').hidden = on;
      let msg = $('examMsg');
      if (on && !msg) document.querySelector('.wrap').insertAdjacentHTML('beforeend', '<p class="examMsg" id="examMsg">The algorithm simulations are not available in exam mode.</p>');
      else if (!on && msg) msg.remove();
    };
    D.onExam(applyExam);
    D.examState().then(on => { if (on) applyExam(true); });
  }
})();
