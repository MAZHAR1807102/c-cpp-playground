// C++ STL guide: renders stl-data.js and runs each example with the same Clang (compiler.js) and WASI runner
// (runner.js) as the code editor.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get(k) { try { return localStorage.getItem('ccp.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.' + k, v); } catch (_) {} } };
  const D = window.desktop;
  const TIME_LIMIT = 5000;

  /* ---------- theme ---------- */
  $('theme').value = store.get('theme') || 'system';
  $('theme').onchange = () => {
    const t = $('theme').value;
    store.set('theme', t);
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  };

  /* ---------- page ---------- */
  const topics = window.STL || [];
  const groups = [];
  for (const t of topics) if (!groups.includes(t.group)) groups.push(t.group);
  $('toc').innerHTML = groups.map(g => `<h3>${esc(g)}</h3>` + topics.filter(t => t.group === g).map(t => `<a href="#${t.id}" data-t="${t.id}">${esc(t.title)}</a>`).join('')).join('');
  const main = $('topics');
  const examples = [];
  for (const t of topics) {
    const sec = document.createElement('section');
    sec.className = 'topic'; sec.id = t.id;
    sec.innerHTML = `<div class="thead"><h2>${esc(t.title)}</h2><code>#include ${esc(t.header)}</code></div>
      <p class="about">${esc(t.about)}</p>
      <table class="ops"><thead><tr><th>Syntax</th><th>What it does</th><th>Time</th></tr></thead><tbody>${t.rows.map(([s, d, c]) => `<tr><td>${esc(s)}</td><td>${esc(d)}</td><td>${esc(c)}</td></tr>`).join('')}</tbody></table>`;
    main.appendChild(sec);
    t.examples.forEach((e, i) => examples.push(makeExample(sec, t, e, i)));
    sec.dataset.text = (t.title + ' ' + t.header + ' ' + t.about + ' ' + t.rows.flat().join(' ') + ' ' + t.examples.map(e => e.title + ' ' + e.code).join(' ')).toLowerCase();
  }
  main.insertAdjacentHTML('beforeend', '<p class="none" id="none" hidden>Nothing matches. Try a function name such as <code>push_back</code> or <code>lower_bound</code>.</p>');

  function makeExample(sec, topic, e, i) {
    const box = document.createElement('div');
    box.className = 'ex';
    const hasInput = e.input != null;
    box.innerHTML = `<div class="exhead"><b>${esc(e.title)}</b><span class="hint">edit, then run</span>
        <button class="btn" type="button" data-a="reset" title="Put the original code back">Reset</button>
        <button class="btn" type="button" data-a="open" title="Open this program in the code editor">Open in editor</button>
        <button class="btn primary" type="button" data-a="run" title="Ctrl + Enter">Run</button></div>
      <div class="exed"></div>
      <div class="exio${hasInput ? ' withinput' : ''}">${hasInput ? '<label><span>Input</span><textarea spellcheck="false"></textarea></label>' : ''}
        <div class="exout"><span class="lab">Output</span><pre aria-live="polite"></pre><div class="st"></div></div></div>`;
    sec.appendChild(box);
    const ex = { id: topic.id + '-' + i, box, orig: e.code, input: e.input || '', out: box.querySelector('.exout pre'), st: box.querySelector('.st'), stdin: box.querySelector('textarea'), marks: [] };
    if (ex.stdin) ex.stdin.value = ex.input;
    ex.cm = CodeMirror(box.querySelector('.exed'), {
      value: e.code, mode: 'text/x-c++src', lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, autoCloseBrackets: true, viewportMargin: Infinity,
      extraKeys: { 'Ctrl-Enter': () => run(ex), 'Cmd-Enter': () => run(ex), Tab: c => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ') }
    });
    ex.cm.on('focus', () => { current = ex; });
    ex.cm.on('changes', () => clearMarks(ex));
    box.querySelector('.exhead').onclick = ev => {
      const a = ev.target.dataset.a;
      if (a === 'run') run(ex);
      else if (a === 'reset') { ex.cm.setValue(ex.orig); if (ex.stdin) ex.stdin.value = ex.input; ex.out.textContent = ''; ex.st.textContent = ''; ex.st.className = 'st'; }
      else if (a === 'open') openInEditor(ex);
    };
    return ex;
  }
  let current = null;

  function openInEditor(ex) {
    try { sessionStorage.setItem('ccp.handoff', JSON.stringify({ lang: 'cpp', code: ex.cm.getValue(), input: ex.stdin ? ex.stdin.value : '' })); } catch (_) {}
    if (D) D.go('editor'); else location.href = 'index.html';
  }

  /* ---------- search ---------- */
  $('q').addEventListener('input', () => {
    const q = $('q').value.trim().toLowerCase();
    let shown = 0;
    for (const sec of main.querySelectorAll('section.topic')) {
      const hit = !q || sec.dataset.text.includes(q);
      sec.hidden = !hit; if (hit) shown++;
      $('toc').querySelector(`[data-t="${sec.id}"]`).hidden = !hit;
    }
    $('none').hidden = shown > 0;
    if (q) for (const ex of examples) if (!ex.box.closest('section').hidden) ex.cm.refresh();
  });

  // highlight the topic being read
  const links = new Map([...$('toc').querySelectorAll('a')].map(a => [a.dataset.t, a]));
  const seen = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const en of entries) { if (en.isIntersecting) seen.add(en.target.id); else seen.delete(en.target.id); }
    const first = topics.find(t => seen.has(t.id));
    links.forEach((a, id) => a.classList.toggle('cur', !!first && id === first.id));
  }, { rootMargin: '-150px 0px -55% 0px' });
  main.querySelectorAll('section.topic').forEach(s => observer.observe(s));

  /* ---------- the compiler (Clang in a worker) ---------- */
  let compiler = null, ready = false, busy = null, reqId = 0, runner = null, killTimer = 0;
  const waiting = [];
  function status(kind, text) { $('dot').className = 'dot ' + kind; $('stat').textContent = text; }
  function startCompiler() {
    compiler = new Worker('compiler.js', { type: 'module' });
    compiler.onmessage = ({ data: m }) => {
      if (m.type === 'progress') {
        $('meter').hidden = false;
        $('bar').style.width = m.total ? Math.round(m.done / m.total * 100) + '%' : '30%';
        status('busy', `Loading the C++ compiler… ${m.total ? Math.round(m.done / 1048576) + ' / ' + Math.round(m.total / 1048576) + ' MB' : ''}`);
      } else if (m.type === 'ready') {
        ready = true; $('meter').hidden = true;
        status('ok', 'C++ compiler ready');
        next();
      } else if (m.type === 'fatal') {
        status('err', 'The compiler could not load: ' + m.message);
      } else if (m.type === 'compiled') {
        const ex = busy;
        if (!ex || m.id !== reqId) return;
        showDiag(ex, m.diag);
        if (!m.ok) { finish(ex, 'bad', `Compile error · ${fmt(m.ms)}`); return; }
        ex.compileMs = m.ms;
        startRun(ex, m.wasm);
      }
    };
    status('busy', 'Loading the C++ compiler…');
    compiler.postMessage({ type: 'load' });
  }
  const fmt = ms => ms < 1000 ? Math.round(ms) + ' ms' : (ms / 1000).toFixed(1) + ' s';

  function run(ex) {
    if (busy === ex || waiting.includes(ex)) return;
    ex.out.textContent = ''; clearMarks(ex);
    ex.st.className = 'st'; ex.st.textContent = ready ? 'Waiting…' : 'Waiting for the compiler to load…';
    waiting.push(ex); next();
  }
  function next() {
    if (!ready || busy || !waiting.length) return;
    const ex = busy = waiting.shift();
    ex.st.textContent = 'Compiling…';
    status('busy', 'Compiling…');
    compiler.postMessage({ type: 'compile', id: ++reqId, lang: 'cpp', source: ex.cm.getValue(), std: 'c++20', opt: 'O1' });
  }
  function startRun(ex, wasm) {
    ex.st.textContent = 'Running…'; status('busy', 'Running…');
    runner = new Worker('runner.js', { type: 'module' });
    runner.onmessage = ({ data: m }) => {
      if (m.type === 'out') for (const [stream, text] of m.chunks) append(ex, text, stream === 2 ? 'e' : '');
      else if (m.type === 'done') {
        clearTimeout(killTimer); runner.terminate(); runner = null;
        if (m.trap) { append(ex, `\nThe program crashed: ${m.trap}\n`, 'e'); finish(ex, 'bad', 'Crashed'); return; }
        finish(ex, m.code === 0 ? 'ok' : 'bad', `Compiled in ${fmt(ex.compileMs)} · ran in ${fmt(m.ms)} · exit ${m.code}`);
      }
    };
    killTimer = setTimeout(() => {
      if (!runner) return;
      runner.terminate(); runner = null;
      append(ex, `\nStopped after ${TIME_LIMIT / 1000} seconds. Is there an infinite loop?\n`, 'e');
      finish(ex, 'bad', 'Time limit');
    }, TIME_LIMIT);
    runner.postMessage({ wasm, stdin: ex.stdin ? ex.stdin.value : '' }, [wasm.buffer]);
  }
  function finish(ex, kind, text) {
    ex.st.className = 'st ' + kind; ex.st.textContent = text;
    busy = null; status('ok', 'C++ compiler ready'); next();
  }
  function append(ex, text, cls) {
    if (!text) return;
    if (cls) { const s = document.createElement('span'); s.className = cls; s.textContent = text; ex.out.appendChild(s); }
    else ex.out.appendChild(document.createTextNode(text));
  }
  // compiler messages: errors and warnings, with the line highlighted in the example's editor
  function showDiag(ex, diag) {
    const lines = (diag || '').split('\n').filter(l => l && !/^fix-it:/.test(l));
    for (const l of lines) {
      const m = l.match(/^main\.cpp:(\d+):\d+: (error|warning|note)/);
      append(ex, l.replace(/^main\.cpp:/, 'line ') + '\n', m ? (m[2] === 'error' ? 'e' : m[2] === 'warning' ? 'w' : 'm') : 'm');
      if (m && m[2] !== 'note') {
        const n = +m[1] - 1;
        if (n >= 0 && n < ex.cm.lineCount()) ex.marks.push(ex.cm.addLineClass(n, 'background', 'errline'));
      }
    }
  }
  function clearMarks(ex) { for (const h of ex.marks) ex.cm.removeLineClass(h, 'background', 'errline'); ex.marks = []; }

  startCompiler();

  /* ---------- desktop app ---------- */
  if (D) {
    $('toEditor').onclick = e => { e.preventDefault(); D.go('editor'); };
    $('toNotebook').onclick = e => { e.preventDefault(); D.go('notebook'); };
    D.docState({ dirty: false, path: null, name: 'C++ STL' });
    D.onMenu(a => { if (a === 'run' && current) run(current); });
    // the STL guide is a study aid, so exam mode hides it like the header guide
    const applyExam = on => {
      main.hidden = on; $('toc').hidden = on;
      let msg = $('examMsg');
      if (on && !msg) { document.querySelector('.layout').insertAdjacentHTML('afterbegin', '<p class="none" id="examMsg" style="grid-column:1/-1">The STL guide is not available in exam mode.</p>'); }
      else if (!on && msg) msg.remove();
    };
    D.onExam(applyExam);
    D.examState().then(on => { if (on) applyExam(true); });
  }
})();
