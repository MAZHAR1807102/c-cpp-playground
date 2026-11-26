// The tab bar shared by every page: fills <nav id="modes">, remembers which tabs are hidden (Window menu),
// and in the desktop app switches pages through the app and follows its Window menu and exam mode.
(() => {
  'use strict';
  const I = {
    editor: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>',
    algorithms: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/><circle cx="16" cy="9" r="1.5"/>',
    stl: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
    notebook: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M9 3v18M12 8h5M12 12h5"/>',
    practice: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 6h3a3 3 0 0 1-3 4M7 6H4a3 3 0 0 0 3 4"/>',
    verilog: '<path d="M2 12h3l2-6 3 12 3-12 3 12 2-6h4"/>'
  };
  const TABS = [
    { id: 'editor', label: 'Code editor', href: 'index.html', tip: 'Write and run C, C++, Java and Python' },
    { id: 'algorithms', label: 'Algorithms', href: 'algorithms.html', tip: 'Animated algorithm simulations, with the code in every language' },
    { id: 'stl', label: 'C++ STL', href: 'stl.html', tip: 'The C++ Standard Template Library with runnable examples' },
    { id: 'notebook', label: 'Notebook', href: 'notebook.html', tip: 'Python notebook for data science and machine learning' },
    { id: 'practice', label: 'Practice', href: 'practice.html', tip: 'Codeforces and CodeChef problems to solve and submit' },
    { id: 'verilog', label: 'Verilog', href: 'verilog.html', tip: 'Verilog: waveforms, truth tables, logic equations and circuits as you type' }
  ];
  // in exam mode only the code editor and the notebook stay
  const EXAM_HIDES = ['algorithms', 'stl', 'practice'];
  const svg = id => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[id]}</svg>`;
  const D = window.desktop;
  const page = document.body.dataset.page || 'editor';
  const KEY = 'ccp.tabs.hidden';
  let hidden = new Set();
  try { hidden = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (_) {}
  let exam = false;
  const nav = document.getElementById('modes');
  if (!nav) return;
  nav.classList.add('modes');
  nav.setAttribute('aria-label', 'Pages');

  function visible(t) {
    if (t.id === 'editor' || t.id === page) return true;
    if (exam && EXAM_HIDES.includes(t.id)) return false;
    return !hidden.has(t.id);
  }
  function render() {
    nav.innerHTML = TABS.filter(visible).map(t =>
      `<a class="tab" href="${t.href}" data-tab="${t.id}" title="${t.tip}"${t.id === page ? ' aria-current="page"' : ''}>${svg(t.id)}<span>${t.label}</span></a>`).join('')
      + `<button class="winbtn" type="button" aria-haspopup="true" aria-expanded="false" title="Window: choose which tabs are shown"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg></button>`
      + `<div class="winmenu" role="menu" hidden><h4>Window · tabs to show</h4>${TABS.map(t => t.id === 'editor'
        ? `<label class="fixed">${svg(t.id)}<span>${t.label}</span><input type="checkbox" checked disabled></label>`
        : `<label>${svg(t.id)}<span>${t.label}</span><input type="checkbox" data-t="${t.id}"${hidden.has(t.id) ? '' : ' checked'}${exam && EXAM_HIDES.includes(t.id) ? ' disabled' : ''}></label>`).join('')}
        <p>${exam ? 'Exam mode hides Algorithms, C++ STL and Practice.' : 'The code editor is always shown.'}</p></div>`;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify([...hidden])); } catch (_) {}
    if (D && D.tabsState) D.tabsState([...hidden]);
  }
  function setTab(id, show) {
    if (id === 'editor' || !TABS.some(t => t.id === id)) return;
    if (show) hidden.delete(id); else hidden.add(id);
    save();
    const open = !nav.querySelector('.winmenu').hidden;
    render();
    if (open) toggleMenu(true);
  }
  function toggleMenu(force) {
    const m = nav.querySelector('.winmenu'), b = nav.querySelector('.winbtn');
    const show = force != null ? force : m.hidden;
    m.hidden = !show;
    b.setAttribute('aria-expanded', show);
  }
  nav.addEventListener('click', e => {
    const a = e.target.closest('a.tab');
    if (a && D) { e.preventDefault(); if (a.dataset.tab !== page) D.go(a.dataset.tab); return; }
    if (e.target.closest('.winbtn')) { toggleMenu(); return; }
  });
  nav.addEventListener('change', e => { if (e.target.dataset.t) setTab(e.target.dataset.t, e.target.checked); });
  document.addEventListener('click', e => { if (!nav.contains(e.target)) { const m = nav.querySelector('.winmenu'); if (m && !m.hidden) toggleMenu(false); } });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { const m = nav.querySelector('.winmenu'); if (m && !m.hidden) toggleMenu(false); } });
  addEventListener('storage', e => { if (e.key === KEY) { try { hidden = new Set(JSON.parse(e.newValue || '[]')); } catch (_) {} render(); } });

  render();
  window.PlaygroundTabs = { setTab, isShown: id => TABS.some(t => t.id === id && visible(t)) };

  if (D) {
    if (D.tabsState) D.tabsState([...hidden]);
    // the app's own Window menu sends "tabs:<id>:1" or "tabs:<id>:0"
    D.onMenu(a => { const m = /^tabs:(\w+):([01])$/.exec(a); if (m) setTab(m[1], m[2] === '1'); });
    const examChange = on => { exam = on; render(); };
    D.onExam(examChange);
    D.examState().then(on => { if (on) examChange(true); });
  }
})();
