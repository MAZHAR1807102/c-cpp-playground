/* Shared player for the sorting simulations: step/play/scrub/keyboard controls,
   pseudocode line highlighting, input parsing and movement animation of cells marked data-id. */
(function () {
  const $ = id => document.getElementById(id);
  const SPEEDS = [1700, 1150, 750, 450, 240];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // letter tags for equal keys: 3 3 3 -> a b c; keys that occur once get ''
  function tags(arr) {
    const seen = {}, cnt = {};
    arr.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
    return arr.map(v => { seen[v] = seen[v] || 0; const t = String.fromCharCode(97 + seen[v]++); return cnt[v] > 1 ? t : ''; });
  }

  function parse(raw, maxN, minV, maxV) {
    const toks = raw.trim() ? raw.trim().split(/[\s,]+/).filter(Boolean) : [];
    if (!toks.length) return { error: 'Type at least two keys, for example 5 2 4 6 1 3.' };
    if (toks.some(t => !/^-?\d+$/.test(t))) return { error: 'Keys must be whole numbers, separated by spaces or commas.' };
    const arr = toks.map(Number);
    if (arr.length < 2) return { error: 'Type at least two keys.' };
    if (arr.length > maxN) return { error: `That is ${arr.length} keys. Use at most ${maxN} so the steps stay easy to follow.` };
    if (arr.some(v => v < minV || v > maxV)) return { error: `Keep every key between ${minV} and ${maxV}.` };
    return { arr };
  }

  function inversions(a) { let c = 0; for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++; return c; }

  // one array row: index labels, cells, optional pointer row; every element gets an explicit column
  function rowHTML(cells, ptrs, plain) {  // plain: no per-value colour
    return cells.map((c, i) => {
      const col = i + 1;
      return `<div class="idx${c.hot ? ' hot' : ''}" style="grid-row:1;grid-column:${col}">${col}</div>` +
        (c.item
          ? `<div class="cell ${plain ? '' : `key v${((c.item.v % 8) + 8) % 8}`} ${c.cls || ''}" data-id="${c.item.id}" style="grid-row:2;grid-column:${col}">${c.item.v}${c.item.t ? `<sub>${c.item.t}</sub>` : ''}</div>`
          : `<div class="cell empty ${c.cls || ''}" style="grid-row:2;grid-column:${col}">${c.label || '·'}</div>`) +
        (ptrs ? `<div class="ptr" style="grid-row:3;grid-column:${col}">${ptrs[col] || ''}</div>` : '');
    }).join('');
  }


  // order of equal keys after sorting: {seq: '3<sub>a</sub> 3<sub>b</sub>', kept: true/false} for the most repeated value, or null
  function stability(items) {
    const g = {};
    items.forEach(x => { if (x.t) (g[x.v] = g[x.v] || []).push(x.t); });
    const ks = Object.keys(g); if (!ks.length) return null;
    const v = ks.reduce((a, b) => g[b].length > g[a].length ? b : a);
    return { seq: g[v].map(t => `${v}<sub>${t}</sub>`).join(' '), kept: g[v].every((t, i) => i === 0 || t > g[v][i - 1]) };
  }
  const fmt = x => x.v + (x.t ? `<sub>${x.t}</sub>` : '');

  function start(render) {
    let steps = [], cur = 0, timer = null, last = -1;

    function rects() { const m = new Map(); document.querySelectorAll('[data-id]').forEach(el => m.set(el.dataset.id, el.getBoundingClientRect())); return m; }
    function show() {
      const s = steps[cur];
      const before = last >= 0 && Math.abs(cur - last) === 1 && !reduce.matches ? rects() : null;
      render(s);
      const lines = [].concat(s.line || []);
      document.querySelectorAll('#code li').forEach(li => li.classList.toggle('on', lines.includes(+li.dataset.l)));
      if (before) {
        const dur = Math.min(520, SPEEDS[$('speed').value - 1] * 0.55);
        document.querySelectorAll('[data-id]').forEach(el => {
          const a = before.get(el.dataset.id); if (!a || !el.animate) return;
          const b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
          if (Math.abs(dx) + Math.abs(dy) > 1) el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.3,.7,.2,1)' });
        });
      }
      $('scrub').max = steps.length - 1; $('scrub').value = cur;
      $('count').textContent = `Step ${cur + 1} / ${steps.length}`;
      $('bFirst').disabled = $('bPrev').disabled = cur === 0;
      $('bLast').disabled = $('bNext').disabled = cur === steps.length - 1;
      last = cur;
    }
    function go(i) { cur = Math.max(0, Math.min(steps.length - 1, i)); show(); if (cur === steps.length - 1) stop(); }
    function stop() { clearTimeout(timer); timer = null; $('playIcon').innerHTML = '<path d="M7 5v14l12-7z"/>'; $('bPlay').setAttribute('aria-label', 'Play'); }
    function tick() { if (cur >= steps.length - 1) return stop(); go(cur + 1); if (timer) timer = setTimeout(tick, SPEEDS[$('speed').value - 1]); }
    function play() {
      if (timer) return stop();
      if (cur >= steps.length - 1) go(0);
      $('playIcon').innerHTML = '<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'; $('bPlay').setAttribute('aria-label', 'Pause');
      timer = setTimeout(tick, 250);
    }
    $('bFirst').onclick = () => { stop(); go(0); };
    $('bPrev').onclick = () => { stop(); go(cur - 1); };
    $('bNext').onclick = () => { stop(); go(cur + 1); };
    $('bLast').onclick = () => { stop(); go(steps.length - 1); };
    $('bPlay').onclick = play;
    $('scrub').oninput = e => { stop(); go(+e.target.value); };
    document.addEventListener('keydown', e => {
      if (e.target.closest('input[type=text],input[type=number],select,textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); stop(); go(cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(cur - 1); }
      else if (e.key === ' ' && !e.target.closest('button')) { e.preventDefault(); play(); }
      else if (e.key === 'Home') { stop(); go(0); }
      else if (e.key === 'End') { stop(); go(steps.length - 1); }
    });
    return { load(newSteps) { stop(); steps = newSteps; cur = 0; last = -1; show(); } };
  }

  window.Sim = { tags, parse, inversions, rowHTML, stability, fmt, start };
})();
