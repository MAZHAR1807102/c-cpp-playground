// Practice page: Codeforces and CodeChef problems (practice-data.js) with filters, Solve in the editor,
// Submit to the judge and hints (practice-hints.js).
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem('ccp.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.' + k, v); } catch (_) {} } };
  const D = window.desktop;

  $('theme').value = store.get('theme') || 'system';
  $('theme').onchange = () => {
    const t = $('theme').value;
    store.set('theme', t);
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  };

  /* ---------- the problems ---------- */
  const P = window.PRACTICE || { tags: [], cf: [], cc: [], updated: '' };
  const problems = [];
  for (const [c, i, name, rating, tags, solved] of P.cf)
    problems.push({ judge: 'cf', id: c + i, name, rating, tags: tags.map(t => P.tags[t]), solved, order: c * 100 + i.charCodeAt(0),
      url: `https://codeforces.com/problemset/problem/${c}/${i}`, submit: `https://codeforces.com/contest/${c}/submit?submittedProblemIndex=${encodeURIComponent(i)}` });
  for (const [code, name, rating, solved, tags] of P.cc)
    problems.push({ judge: 'cc', id: code, name, rating, tags: tags.map(t => P.tags[t]), solved, order: 0,
      url: `https://www.codechef.com/problems/${code}`, submit: `https://www.codechef.com/submit/${code}` });
  for (const p of problems) p.key = p.judge + ':' + p.id, p.text = (p.id + ' ' + p.name).toLowerCase();
  const byKey = new Map(problems.map(p => [p.key, p]));
  $('note').textContent = `${P.cf.length.toLocaleString()} Codeforces and ${P.cc.length.toLocaleString()} CodeChef problems · list updated ${P.updated}. Solve here, then Submit opens the judge's own submit page.`;

  let done = new Set();
  try { done = new Set(JSON.parse(store.get('practice.done') || '[]')); } catch (_) {}
  const saveDone = () => store.set('practice.done', JSON.stringify([...done]));

  /* ---------- filters ---------- */
  const RATINGS = [800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2400, 2600, 2800, 3000, 3500];
  $('rmin').innerHTML = '<option value="0">any</option>' + RATINGS.map(r => `<option>${r}</option>`).join('');
  $('rmax').innerHTML = '<option value="0">any</option>' + RATINGS.map(r => `<option>${r}</option>`).join('');
  const tagCount = {};
  for (const p of problems) for (const t of p.tags) tagCount[t] = (tagCount[t] || 0) + 1;
  const TAGS = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a]);
  $('tags').innerHTML = TAGS.map(t => `<button type="button" class="tag" data-tag="${esc(t)}" aria-pressed="false">${esc(t)} <small>${tagCount[t]}</small></button>`).join('');

  const saved = (() => { try { return JSON.parse(store.get('practice.filters') || '{}'); } catch (_) { return {}; } })();
  const F = { judge: saved.judge || 'all', q: '', rmin: +saved.rmin || 0, rmax: +saved.rmax || 0, sort: saved.sort || 'solved', hideDone: !!saved.hideDone, tags: new Set(saved.tags || []) };
  function syncControls() {
    document.querySelectorAll('[data-j]').forEach(b => b.setAttribute('aria-pressed', b.dataset.j === F.judge));
    $('rmin').value = F.rmin; $('rmax').value = F.rmax; $('sort').value = F.sort; $('hideDone').checked = F.hideDone; $('q').value = F.q;
    document.querySelectorAll('[data-tag]').forEach(b => b.setAttribute('aria-pressed', F.tags.has(b.dataset.tag)));
  }
  const saveFilters = () => store.set('practice.filters', JSON.stringify({ judge: F.judge, rmin: F.rmin, rmax: F.rmax, sort: F.sort, hideDone: F.hideDone, tags: [...F.tags] }));

  let results = [], shown = 0, seed = Math.random();
  function apply() {
    const q = F.q.trim().toLowerCase();
    const lo = F.rmin, hi = F.rmax;
    results = problems.filter(p =>
      (F.judge === 'all' || p.judge === F.judge) &&
      (!q || p.text.includes(q)) &&
      (!lo || (p.rating && p.rating >= lo)) &&
      (!hi || (p.rating && p.rating <= hi)) &&
      (!F.hideDone || !done.has(p.key)) &&
      [...F.tags].every(t => p.tags.includes(t)));
    const cmp = {
      solved: (a, b) => b.solved - a.solved,
      easy: (a, b) => (a.rating || 9999) - (b.rating || 9999) || b.solved - a.solved,
      hard: (a, b) => b.rating - a.rating || b.solved - a.solved,
      new: (a, b) => b.order - a.order || b.solved - a.solved,
      random: (a, b) => hash(a.key) - hash(b.key)
    }[F.sort];
    results.sort(cmp);
    shown = 0;
    $('list').textContent = '';
    $('count').textContent = `${results.length.toLocaleString()} problem${results.length === 1 ? '' : 's'}`;
    if (!results.length) $('list').innerHTML = '<p class="empty">No problems match. Remove a topic or widen the difficulty range.</p>';
    more();
    saveFilters();
  }
  function hash(s) { let h = Math.floor(seed * 2147483647); for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }

  // Codeforces rank colours for ratings
  const color = r => !r ? 'var(--muted)' : r < 1200 ? '#8a8a8a' : r < 1400 ? '#2e9b2e' : r < 1600 ? '#17a2a2' : r < 1900 ? '#3b6fe0' : r < 2100 ? '#a64dd6' : r < 2400 ? '#e08a00' : '#e0383e';
  const fmtSolved = n => n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n);
  function row(p) {
    const isDone = done.has(p.key);
    return `<article class="prob${isDone ? ' done' : ''}" data-k="${esc(p.key)}">
      <span class="judge ${p.judge}" title="${Practice.JUDGE[p.judge]}">${p.judge === 'cf' ? 'CF' : 'CC'}</span>
      <div class="pname"><span class="pid">${esc(p.id)}</span><a href="${esc(p.url)}" target="_blank" rel="noopener" title="Open the problem on ${Practice.JUDGE[p.judge]}">${esc(p.name)}</a>
        <div class="meta">${p.rating ? `<span class="rating" style="color:${color(p.rating)}">${p.rating}</span>` : '<span class="rating">unrated</span>'}
          <span>solved by ${fmtSolved(p.solved)}</span>${p.tags.map(t => `<span class="t" data-addtag="${esc(t)}" title="Show only ${esc(t)} problems">${esc(t)}</span>`).join('')}</div></div>
      <div class="acts">
        <a class="btn" href="${esc(p.url)}" target="_blank" rel="noopener">Problem ↗</a>
        <button class="btn primary" type="button" data-a="solve">Solve in editor</button>
        <button class="btn" type="button" data-a="hints">Hints</button>
        <button class="btn" type="button" data-a="submit" title="Copies your code for this problem and opens the ${Practice.JUDGE[p.judge]} submit page">Submit ↗</button>
        <button class="btn mark" type="button" data-a="done" aria-pressed="${isDone}" title="Mark as solved">${isDone ? '✓ Solved' : 'Mark solved'}</button>
      </div></article>`;
  }
  function more() {
    const next = results.slice(shown, shown + 60);
    shown += next.length;
    const old = $('list').querySelector('.more');
    if (old) old.remove();
    $('list').insertAdjacentHTML('beforeend', next.map(row).join('') + (shown < results.length ? `<button class="btn more" type="button">Show more (${(results.length - shown).toLocaleString()} left)</button>` : ''));
  }

  /* ---------- events ---------- */
  document.querySelector('.seg').onclick = e => { const b = e.target.closest('[data-j]'); if (b) { F.judge = b.dataset.j; syncControls(); apply(); } };
  let qt = 0;
  $('q').oninput = () => { clearTimeout(qt); qt = setTimeout(() => { F.q = $('q').value; apply(); }, 150); };
  $('rmin').onchange = () => { F.rmin = +$('rmin').value; if (F.rmax && F.rmin > F.rmax) F.rmax = F.rmin; syncControls(); apply(); };
  $('rmax').onchange = () => { F.rmax = +$('rmax').value; if (F.rmax && F.rmin > F.rmax) F.rmin = F.rmax; syncControls(); apply(); };
  $('sort').onchange = () => { F.sort = $('sort').value; seed = Math.random(); apply(); };
  $('hideDone').onchange = () => { F.hideDone = $('hideDone').checked; apply(); };
  $('tags').onclick = e => { const b = e.target.closest('[data-tag]'); if (!b) return; const t = b.dataset.tag; if (F.tags.has(t)) F.tags.delete(t); else F.tags.add(t); syncControls(); apply(); };
  $('moreTags').onclick = () => { const open = $('tags').classList.toggle('open'); $('moreTags').textContent = open ? 'Fewer topics' : 'All topics'; };
  $('clear').onclick = () => { Object.assign(F, { judge: 'all', q: '', rmin: 0, rmax: 0, sort: 'solved', hideDone: false, tags: new Set() }); syncControls(); apply(); };

  let picking = null;
  $('list').addEventListener('click', e => {
    if (e.target.closest('.more')) { more(); return; }
    const tagEl = e.target.closest('[data-addtag]');
    if (tagEl) { F.tags.add(tagEl.dataset.addtag); syncControls(); apply(); window.scrollTo(0, 0); return; }
    const art = e.target.closest('.prob'), btn = e.target.closest('[data-a]');
    if (!art || !btn) return;
    const p = byKey.get(art.dataset.k);
    const a = btn.dataset.a;
    if (a === 'hints') PracticeHints.open(p);
    else if (a === 'solve') { picking = p; $('pickTitle').textContent = `Solve ${p.id} · ${p.name}`; $('pick').showModal(); }
    else if (a === 'submit') {
      const cur = JSON.parse(store.get('practice.current') || 'null');
      const lang = cur && cur.key === p.key ? cur.lang : null;
      const code = lang ? store.get('code.' + lang) : null;
      Practice.submit(p, code).then(copied => toast((copied ? 'Your code is copied: paste it into the submit box and choose the language there. ' : code ? 'Copy your code from the editor and paste it into the submit box. ' : 'Open this problem with "Solve in editor" first and your code will be copied for you. ') + Practice.NOTE[p.judge]));
    } else if (a === 'done') {
      if (done.has(p.key)) done.delete(p.key); else done.add(p.key);
      saveDone();
      art.outerHTML = row(p);
    }
  });
  $('pick').addEventListener('click', e => {
    if (e.target === $('pick') || e.target.closest('[data-close]')) { $('pick').close(); return; }
    const b = e.target.closest('[data-l]');
    if (!b || !picking) return;
    const lang = b.dataset.l, p = picking;
    const prob = { key: p.key, judge: p.judge, id: p.id, name: p.name, rating: p.rating, tags: p.tags, url: p.url, submit: p.submit, lang };
    store.set('practice.current', JSON.stringify(prob));
    // keep earlier work on the same problem in the same language
    const work = store.get('practice.code.' + p.key + '.' + lang);
    try { sessionStorage.setItem('ccp.handoff', JSON.stringify({ lang, code: work || Practice.template(p, lang), input: store.get('practice.input.' + p.key) || '', practice: prob })); } catch (_) {}
    $('pick').close();
    if (D) D.go('editor'); else location.href = 'index.html';
  });

  let tt = 0;
  function toast(text) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = text; t.hidden = false;
    clearTimeout(tt); tt = setTimeout(() => { t.hidden = true; }, 7000);
  }

  syncControls();
  apply();

  if (D) {
    D.docState({ dirty: false, path: null, name: 'Practice' });
    const applyExam = on => {
      document.querySelector('.filters').hidden = on; $('list').hidden = on; $('note').hidden = on;
      let m = $('examMsg');
      if (on && !m) document.body.insertAdjacentHTML('beforeend', '<p class="exammsg" id="examMsg">Practice is not available in exam mode.</p>');
      else if (!on && m) m.remove();
    };
    D.onExam(applyExam);
    D.examState().then(on => { if (on) applyExam(true); });
  }
})();
