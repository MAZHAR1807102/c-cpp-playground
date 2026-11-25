// Playground notebook: cells, the Python kernel (notebook-runner.js), outputs, saving as .ipynb, files and packages.
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const store = { get(k) { try { return localStorage.getItem('ccp.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.' + k, v); return true; } catch (_) { return false; } } };
  const D = window.desktop;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 10);
  let examOn = false;

  /* ---------- theme ---------- */
  $('theme').value = store.get('theme') || 'system';
  $('theme').onchange = () => {
    const t = $('theme').value;
    store.set('theme', t);
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  };
  $('sugg').checked = store.get('sugg') !== '0';
  $('sugg').onchange = () => store.set('sugg', $('sugg').checked ? '1' : '0');

  /* ---------- Markdown (a small, safe subset) ---------- */
  function inline(s) {
    return s.split(/(`[^`]+`)/).map(p => {
      if (/^`[^`]+`$/.test(p)) return '<code>' + esc(p.slice(1, -1)) + '</code>';
      return esc(p)
        .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<b>$1</b>')
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<i>$2</i>').replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<i>$2</i>');
    }).join('');
  }
  function markdown(src) {
    const L = src.replace(/\r/g, '').split('\n'), out = [];
    let i = 0, para = [];
    const endPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
    while (i < L.length) {
      const l = L[i];
      let m;
      if (/^\s*```/.test(l)) {
        endPara(); const code = []; i++;
        while (i < L.length && !/^\s*```/.test(L[i])) code.push(L[i++]);
        i++; out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); continue;
      }
      if ((m = l.match(/^(#{1,6})\s+(.*)$/))) { endPara(); const n = m[1].length; out.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) { endPara(); out.push('<hr>'); i++; continue; }
      if (/^\s*>/.test(l)) {
        endPara(); const q = [];
        while (i < L.length && /^\s*>/.test(L[i])) q.push(L[i++].replace(/^\s*>\s?/, ''));
        out.push('<blockquote>' + markdown(q.join('\n')) + '</blockquote>'); continue;
      }
      if ((m = l.match(/^\s*([-*+]|\d+[.)])\s+/))) {
        endPara(); const ordered = /\d/.test(m[1]), items = [];
        while (i < L.length && /^\s*([-*+]|\d+[.)])\s+/.test(L[i])) {
          let item = L[i++].replace(/^\s*([-*+]|\d+[.)])\s+/, '');
          while (i < L.length && /^\s{2,}\S/.test(L[i]) && !/^\s*([-*+]|\d+[.)])\s+/.test(L[i])) item += ' ' + L[i++].trim();
          items.push('<li>' + inline(item) + '</li>');
        }
        out.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`); continue;
      }
      if (!l.trim()) { endPara(); i++; continue; }
      para.push(l.trim()); i++;
    }
    endPara();
    return out.join('\n');
  }

  /* ---------- HTML output (pandas tables and the like), with anything active removed ---------- */
  function clean(html) {
    const doc = new DOMParser().parseFromString(String(html), 'text/html');
    doc.querySelectorAll('script,style,iframe,frame,frameset,object,embed,link,meta,base,form,noscript,template').forEach(n => n.remove());
    doc.body.querySelectorAll('*').forEach(el => {
      for (const a of [...el.attributes]) {
        const n = a.name.toLowerCase(), v = a.value.trim();
        if (n.startsWith('on') || n === 'srcdoc' || n === 'formaction') el.removeAttribute(a.name);
        else if ((n === 'href' || n === 'src' || n === 'xlink:href' || n === 'action') && !/^(https?:|#|data:image\/(png|jpe?g|gif|webp);)/i.test(v)) el.removeAttribute(a.name);
      }
      if (el.tagName === 'A') { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener'); }
    });
    return doc.body.innerHTML;
  }

  /* ---------- cells ---------- */
  const nb = $('nb');
  let cells = [], selected = null, nbName = 'notebook.ipynb', dirty = false, filePath = null;
  const PLAY = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z"/></svg>';

  function makeCell(type, src = '', outputs = [], count = null) {
    const c = { id: uid(), type, outputs: [], count, state: null, el: document.createElement('div') };
    c.el.className = 'cell ' + (type === 'code' ? 'code' : 'md');
    c.el.innerHTML = `<div class="cgut"><button class="crun" type="button" title="Run (Shift + Enter)" aria-label="Run cell">${PLAY}</button><span class="cnum"></span></div>
      <div class="cmain"><div class="cedit"></div><div class="mdview" hidden></div><div class="cout" aria-live="polite"></div><div class="ctime"></div></div>
      <div class="ctools"><button type="button" data-a="up" title="Move up">↑</button><button type="button" data-a="down" title="Move down">↓</button><button type="button" data-a="type" title="Change to a text or code cell">${type === 'code' ? 'To text' : 'To code'}</button><button type="button" data-a="clear" title="Clear this cell's output">Clear</button><button type="button" data-a="del" class="del" title="Delete cell">Delete</button></div>`;
    c.q = s => c.el.querySelector(s);
    c.cm = CodeMirror(c.q('.cedit'), {
      value: src, mode: type === 'code' ? 'python' : 'markdown', lineNumbers: type === 'code', indentUnit: 4, tabSize: 4,
      matchBrackets: true, autoCloseBrackets: type === 'code', lineWrapping: type !== 'code', viewportMargin: Infinity,
      extraKeys: {
        'Shift-Enter': () => runCell(c, 'next'), 'Ctrl-Enter': () => runCell(c), 'Cmd-Enter': () => runCell(c), 'Alt-Enter': () => runCell(c, 'insert'),
        'Ctrl-Space': cm => showHint(cm, true), Tab: cm => cm.somethingSelected() ? cm.indentSelection('add') : cm.replaceSelection('    '),
        'Shift-Tab': cm => cm.indentSelection('subtract'), Esc: cm => cm.getInputField().blur(),
        Up: cm => { if (cm.getCursor().line === 0 && !cm.state.completionActive) return moveSel(c, -1); return CodeMirror.Pass; },
        Down: cm => { if (cm.getCursor().line === cm.lastLine() && !cm.state.completionActive) return moveSel(c, 1); return CodeMirror.Pass; }
      }
    });
    c.cm.on('focus', () => select(c));
    c.cm.on('changes', () => { changed(); clearMark(c); });
    c.cm.on('inputRead', (cm, ch) => { if (type === 'code' && $('sugg').checked && !examOn && /[\w.]$/.test(ch.text.join(''))) showHint(cm, false); });
    c.q('.crun').onclick = () => runCell(c);
    c.el.addEventListener('mousedown', e => { if (!e.target.closest('.CodeMirror')) select(c); });
    c.q('.mdview').ondblclick = () => editMd(c);
    c.q('.ctools').onclick = e => {
      const a = e.target.dataset.a; if (!a) return;
      if (a === 'up') moveCell(c, -1); else if (a === 'down') moveCell(c, 1);
      else if (a === 'type') changeType(c); else if (a === 'clear') { c.outputs = []; renderOutputs(c); c.q('.ctime').textContent = ''; changed(); }
      else if (a === 'del') deleteCell(c);
    };
    for (const o of outputs) addOutput(c, o[0], o[1], true);
    renderOutputs(c); updatePrompt(c);
    if (type === 'md' && src.trim()) renderMd(c);
    return c;
  }
  function insertCell(c, after) {
    const i = after ? cells.indexOf(after) + 1 : cells.length;
    cells.splice(i, 0, c);
    nb.insertBefore(c.el, cells[i + 1] ? cells[i + 1].el : null);
    c.cm.refresh();
    return c;
  }
  function select(c) {
    if (selected === c) return;
    if (selected) selected.el.classList.remove('sel');
    selected = c; if (c) c.el.classList.add('sel');
  }
  function focusCell(c, atEnd) {
    select(c);
    if (c.type === 'md' && !c.q('.mdview').hidden) { c.el.scrollIntoView({ block: 'nearest' }); return; }
    c.cm.focus();
    c.cm.setCursor(atEnd ? { line: c.cm.lastLine(), ch: 0 } : { line: 0, ch: 0 });
    c.el.scrollIntoView({ block: 'nearest' });
  }
  function moveSel(c, d) { const n = cells[cells.indexOf(c) + d]; if (!n) return CodeMirror.Pass; focusCell(n, d < 0); }
  function moveCell(c, d) {
    const i = cells.indexOf(c), j = i + d;
    if (j < 0 || j >= cells.length) return;
    cells.splice(i, 1); cells.splice(j, 0, c);
    nb.insertBefore(c.el, d < 0 ? cells[j + 1].el : (cells[j + 1] ? cells[j + 1].el : null));
    c.cm.refresh(); changed();
  }
  let lastDeleted = null;
  function deleteCell(c) {
    const i = cells.indexOf(c);
    cells.splice(i, 1); c.el.remove();
    lastDeleted = { c, i };
    if (!cells.length) insertCell(makeCell('code'));
    const n = cells[Math.min(i, cells.length - 1)]; select(n);
    changed();
    toast('Cell deleted', 'Undo', () => {
      if (!lastDeleted) return;
      const { c: d, i: at } = lastDeleted; lastDeleted = null;
      cells.splice(at, 0, d); nb.insertBefore(d.el, cells[at + 1] ? cells[at + 1].el : null); d.cm.refresh(); focusCell(d); changed();
    });
  }
  function changeType(c) {
    const n = makeCell(c.type === 'code' ? 'md' : 'code', c.cm.getValue());
    const i = cells.indexOf(c); cells[i] = n; nb.replaceChild(n.el, c.el); n.cm.refresh();
    if (n.type === 'md') editMd(n); else focusCell(n);
    changed();
  }
  function addCell(type) {
    const c = insertCell(makeCell(type), selected);
    if (type === 'md') editMd(c); else focusCell(c);
    changed();
  }

  // text cells: shown as formatted text; double-click to edit, Shift + Enter to show again
  function renderMd(c) {
    const v = c.q('.mdview');
    v.innerHTML = clean(markdown(c.cm.getValue()));
    v.hidden = false; c.q('.cedit').hidden = true; c.el.classList.remove('editing');
  }
  function editMd(c) {
    c.q('.mdview').hidden = true; c.q('.cedit').hidden = false; c.el.classList.add('editing');
    c.cm.refresh(); select(c); c.cm.focus();
  }

  function updatePrompt(c) {
    const n = c.q('.cnum');
    if (c.type !== 'code') { n.textContent = ''; return; }
    n.className = 'cnum' + (c.state ? ' run' : '');
    n.textContent = c.state === 'queued' ? '[*]' : c.state === 'running' ? '[*]' : c.count ? `[${c.count}]` : '[ ]';
    n.title = c.state === 'queued' ? 'Waiting to run' : c.state === 'running' ? 'Running' : c.count ? `Ran as number ${c.count}` : 'Not run yet';
  }

  /* ---------- outputs ---------- */
  // c.outputs is a list of [kind, data]; consecutive text on the same stream is merged
  function addOutput(c, kind, data, quiet) {
    const lastO = c.outputs[c.outputs.length - 1];
    if ((kind === 'stdout' || kind === 'stderr') && lastO && lastO[0] === kind) {
      lastO[1] += data;
      if (!quiet && lastO.el) { lastO.el.textContent = lastO[1]; }
      return;
    }
    const o = [kind, data];
    c.outputs.push(o);
    if (!quiet) c.q('.cout').appendChild(outputEl(c, o));
  }
  function renderOutputs(c) {
    const box = c.q('.cout'); box.textContent = '';
    for (const o of c.outputs) box.appendChild(outputEl(c, o));
  }
  function outputEl(c, o) {
    const [kind0, data] = o, result = kind0.startsWith('result:'), kind = result ? kind0.slice(7) : kind0;
    let el;
    if (kind === 'stdout' || kind === 'stderr' || kind === 'text') { el = document.createElement('pre'); el.className = 'o-' + kind; el.textContent = data; }
    else if (kind === 'error') { el = document.createElement('pre'); el.className = 'o-err'; el.textContent = data; }
    else if (kind === 'note') { el = document.createElement('div'); el.className = 'o-note'; el.textContent = data; }
    else if (kind === 'html') { el = document.createElement('div'); el.className = 'o-html'; el.innerHTML = clean(data); }
    else if (kind === 'markdown') { el = document.createElement('div'); el.className = 'o-md mdview'; el.innerHTML = clean(markdown(data)); }
    else if (kind === 'png' || kind === 'jpeg' || kind === 'svg') {
      el = document.createElement('div'); el.className = 'o-img';
      const img = document.createElement('img');
      img.src = kind === 'svg' ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data) : `data:image/${kind};base64,` + data;
      img.alt = 'Figure'; el.appendChild(img);
    }
    else if (kind === 'hint') { el = document.createElement('div'); el.className = 'o-hint'; el.innerHTML = data.html; if (data.fix) { const b = document.createElement('button'); b.className = 'fix'; b.type = 'button'; b.textContent = data.fix.label; b.onclick = data.fix.run; el.appendChild(document.createElement('br')); el.appendChild(b); } }
    else { el = document.createElement('pre'); el.textContent = String(data); }
    if (kind0 === 'stdout' || kind0 === 'stderr') o.el = el;
    if (result && c.count) {
      const w = document.createElement('div'); w.className = 'o-res';
      w.innerHTML = `<span class="olab">Out[${c.count}]</span>`; w.appendChild(el); return w;
    }
    return el;
  }
  function clearMark(c) { if (c.mark != null) { c.cm.removeLineClass(c.mark, 'background', 'errline'); c.mark = null; } }

  // plain-English help for the most common notebook errors
  function errorHint(c, res) {
    if (examOn) return null;   // hints are part of the suggestions, which exam mode turns off
    const m = res.msg || '';
    let x;
    if (res.missing) {
      const name = res.missing.split('.')[0];
      const known = pkgList && (pkgList.has(name.toLowerCase()) || extra.includes(name));
      if (offline && !known) return { html: `<b>${esc(name)}</b> is not included in the offline app. It carries numpy, pandas, scipy, scikit-learn, matplotlib, seaborn, statsmodels, sympy, networkx and openpyxl; other libraries need the website version (with internet).` };
      if (/^(torch|tensorflow|keras|jax|cv2)$/.test(name)) return { html: `<b>${esc(name)}</b> cannot run in the browser (it needs native code that is not available in WebAssembly). For neural networks use NumPy or scikit-learn's <code>MLPClassifier</code>.` };
      return { html: `The library <b>${esc(name)}</b> is not installed. Install it, then run this cell again.`, fix: { label: `Install ${name}`, run: () => { const cell = c; pip([name], cell); } } };
    }
    if ((x = m.match(/Missing optional dependency '([\w-]+)'/))) {
      const name = x[1];
      return { html: `This needs the library <b>${esc(name)}</b>${name === 'openpyxl' ? ' (it reads Excel files)' : ''}. Install it, then run this cell again.`, fix: { label: `Install ${name}`, run: () => pip([name], c) } };
    }
    if ((x = m.match(/^NameError: name '(\w+)' is not defined/))) {
      const name = x[1];
      const def = cells.find(o => o !== c && o.type === 'code' && new RegExp(`(^|\\n)\\s*(def\\s+${name}\\b|class\\s+${name}\\b|${name}\\s*=|import\\s+.*\\b${name}\\b|from\\s+\\S+\\s+import\\s+.*\\b${name}\\b|for\\s+${name}\\b)`).test(o.cm.getValue()));
      if (def && !def.count) return { html: `<code>${esc(name)}</code> is made in another cell that has not run yet. Run the cells above first (or <b>Run all</b>).`, fix: { label: 'Run all cells above', run: () => runAbove(c) } };
      if (def) return { html: `<code>${esc(name)}</code> was defined in a cell that ran before Python restarted. Run the cells above again.`, fix: { label: 'Run all cells above', run: () => runAbove(c) } };
      return { html: `<code>${esc(name)}</code> is not defined. Check the spelling (upper and lower case matter), or define it before using it.` };
    }
    if (/FileNotFoundError/.test(m)) return { html: 'The file is not in the notebook. Add it with <b>Files</b> in the toolbar, then use just its name, for example <code>pd.read_csv("data.csv")</code>.' };
    if (/KeyboardInterrupt/.test(m)) return null;
    if (/^IndentationError/.test(m)) return { html: 'The indentation (spaces at the start of the line) is wrong. Lines inside <code>if</code>, <code>for</code>, <code>def</code> must be indented by the same amount, usually 4 spaces.' };
    if (/^KeyError/.test(m) && /pandas|DataFrame|loc|\[/.test(c.cm.getValue())) return { html: 'There is no column or row with that name. Print <code>df.columns</code> to see the exact names (they are case-sensitive and may contain spaces).' };
    if (/MemoryError|memory access out of bounds|Out of memory/i.test(m)) return { html: 'Python ran out of memory. Use less data, or Restart to free memory.' };
    return null;
  }
  function markLine(c, line) {
    clearMark(c);
    if (line > 0 && line <= c.cm.lineCount()) c.mark = c.cm.addLineClass(line - 1, 'background', 'errline');
  }

  /* ---------- kernel ---------- */
  let worker = null, ready = false, queue = [], running = null, execCount = 0, intr = null, pkgList = null, extra = [], offline = false, installed = [];
  const uploads = new Map();   // files added with Files, restored when Python restarts
  let pendingComplete = null, fileWaiters = [];

  function setStatus(kind, text) { $('kdot').className = 'dot ' + kind; $('kstat').textContent = text; $('kstat').title = text; }
  function idle() { setStatus('ok', `Python ${pyVersion} · ready`); }
  let pyVersion = '3';

  function startKernel() {
    ready = false;
    intr = (self.crossOriginIsolated && typeof SharedArrayBuffer === 'function') ? new Int32Array(new SharedArrayBuffer(4)) : null;
    worker = new Worker('notebook-runner.js', { type: 'module' });
    worker.onmessage = onKernel;
    worker.onerror = e => setStatus('err', 'Python failed to start: ' + (e.message || 'unknown error'));
    setStatus('busy', 'Starting Python…');
    worker.postMessage({ type: 'load', interrupt: intr });
  }
  function onKernel({ data: m }) {
    if (m.type === 'ready') {
      ready = true; pyVersion = m.version; offline = m.offline; extra = m.extra || [];
      pkgList = new Map(m.packages.map(([n, v]) => [n, v]));
      for (const [name, bytes] of uploads) worker.postMessage({ type: 'putFile', name, bytes: bytes.slice(0) });
      $('helpStop').hidden = !!intr;
      if (offline) $('helpPkgs').innerHTML = 'The offline app carries numpy, pandas, scipy, scikit-learn, matplotlib, seaborn, statsmodels, sympy, networkx and openpyxl (Excel files). Other libraries need the website version (with internet).';
      idle(); renderChips(); pump();
    } else if (m.type === 'fatal') {
      setStatus('err', 'Python failed to start: ' + m.message);
    } else if (m.type === 'status') {
      setStatus('busy', m.text);
    } else if (m.type === 'out') {
      const c = cells.find(x => x.id === m.id);
      if (c) { for (const [k, d] of m.items) addOutput(c, k, d); }
      else if (m.id === 'pkg') for (const [, d] of m.items) $('plog').textContent += d.endsWith('\n') ? d : d + '\n';
    } else if (m.type === 'done') {
      installed = m.packages;
      const c = running; running = null;
      if (c && c.id === m.id) {
        c.state = null; updatePrompt(c);
        c.q('.ctime').textContent = fmtTime(m.ms);
        if (!m.ok) {
          markLine(c, m.line);
          const h = errorHint(c, m);
          if (h) addOutput(c, 'hint', h);
          for (const q of queue) { q.state = null; updatePrompt(q); }
          queue = [];
        }
        changed(true);
      }
      $('stopBtn').disabled = !queue.length;
      idle(); renderChips(); pump();
    } else if (m.type === 'installed') {
      installed = m.packages; renderChips(); idle();
    } else if (m.type === 'completions') {
      if (pendingComplete && pendingComplete.id === m.id) { pendingComplete.resolve(m.list); pendingComplete = null; }
    } else if (m.type === 'files') {
      renderFiles(m.list);
    } else if (m.type === 'file') {
      const w = fileWaiters.shift(); if (w) w(m);
    } else if (m.type === 'fileError') {
      toast(m.message);
    }
  }
  const fmtTime = ms => ms < 1000 ? `${Math.round(ms)} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.floor(ms / 60000)} min ${Math.round(ms % 60000 / 1000)} s`;

  function runCell(c, then) {
    if (c.type === 'md') renderMd(c);
    else {
      if (c.state) return true;
      clearMark(c);
      c.outputs = []; renderOutputs(c); c.q('.ctime').textContent = '';
      c.state = 'queued'; updatePrompt(c);
      queue.push(c); pump();
    }
    if (then === 'next') {
      const n = cells[cells.indexOf(c) + 1];
      if (n) focusCell(n); else addCell('code');
    } else if (then === 'insert') {
      const n = insertCell(makeCell('code'), c); focusCell(n); changed();
    }
    return true;
  }
  function pump() {
    $('stopBtn').disabled = !running && !queue.length;
    if (!ready || running || !queue.length) return;
    const c = queue.shift();
    running = c; c.state = 'running'; c.count = ++execCount; updatePrompt(c);
    setStatus('busy', 'Running…');
    worker.postMessage({ type: 'run', id: c.id, source: c.cm.getValue() });
    $('stopBtn').disabled = false;
  }
  function runAll() { for (const c of cells) if (c.type === 'code') runCell(c); else renderMd(c); }
  function runAbove(c) { for (const o of cells) { if (o === c) break; if (o.type === 'code') runCell(o); } runCell(c); }
  function stop() {
    for (const q of queue) { q.state = null; updatePrompt(q); }
    queue = [];
    if (!running) { pump(); return; }
    if (intr) { intr[0] = 2; return; }   // KeyboardInterrupt inside Python; variables are kept
    const c = running;
    restart(true);
    addOutput(c, 'note', 'Stopped. Python was restarted to stop it, so the variables were cleared: run the cells above again.');
  }
  function restart(quiet) {
    if (worker) worker.terminate();
    if (running) { running.state = null; updatePrompt(running); running = null; }
    for (const q of queue) { q.state = null; updatePrompt(q); }
    queue = []; execCount = 0; installed = [];
    startKernel();
    if (!quiet) toast('Python restarted: all variables were cleared.');
  }
  function pip(names, cell) {
    if (cell) {
      // show the install in the cell's output, then run the cell again
      cell.outputs = []; renderOutputs(cell);
      const src = '%pip install ' + names.join(' ');
      const tmp = { id: cell.id };
      if (!ready || running) { toast('Wait for the running cell to finish.'); return; }
      running = cell; cell.state = 'running'; updatePrompt(cell); setStatus('busy', 'Installing…');
      worker.postMessage({ type: 'run', id: tmp.id, source: src });
      const again = () => { if (!running) { runCell(cell); } else setTimeout(again, 200); };
      setTimeout(again, 200);
      return;
    }
    setStatus('busy', 'Installing ' + names.join(', ') + '…');
    worker.postMessage({ type: 'install', id: 'pkg', names });
  }

  /* ---------- suggestions: from the live Python variables when possible ---------- */
  const PY_WORDS = ['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
    'print', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'str', 'int', 'float', 'bool', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'enumerate', 'zip', 'map', 'filter', 'isinstance', 'type', 'open', 'display',
    'numpy', 'pandas', 'matplotlib', 'seaborn', 'sklearn', 'scipy', 'np', 'pd', 'plt', 'sns'];
  let completeId = 0;
  function askKernel(text) {
    return new Promise(resolve => {
      if (!ready || running) return resolve(null);
      const id = ++completeId;
      pendingComplete = { id, resolve };
      worker.postMessage({ type: 'complete', id, text });
      setTimeout(() => { if (pendingComplete && pendingComplete.id === id) { pendingComplete = null; resolve(null); } }, 700);
    });
  }
  function hintSource(cm, callback) {
    const cur = cm.getCursor(), before = cm.getLine(cur.line).slice(0, cur.ch);
    const tok = (before.match(/[A-Za-z_][\w.]*$/) || [''])[0];
    const inStringOrComment = /^(string|comment)/.test(cm.getTokenTypeAt(cur) || '');
    if (!tok || inStringOrComment || (!cm.state.forceHint && tok.length < 2 && !tok.endsWith('.'))) return callback(null);
    const from = CodeMirror.Pos(cur.line, cur.ch - tok.length);
    const dot = tok.lastIndexOf('.');
    askKernel(tok).then(list => {
      let words = list || [];
      if (dot < 0) {
        const seen = new Set(words.map(w => w.replace(/\($/, '')));
        const own = new Set();
        for (const c of cells) if (c.type === 'code') for (const w of c.cm.getValue().match(/[A-Za-z_]\w{2,}/g) || []) own.add(w);
        for (const w of [...PY_WORDS, ...own]) if (w.startsWith(tok) && w !== tok && !seen.has(w)) { words.push(w); seen.add(w); }
      }
      const priv = tok.slice(dot + 1).startsWith('_');
      words = words.filter(w => w !== tok && (priv || !w.slice(dot + 1).startsWith('_')));
      if (!words.length) return callback(null);
      callback({ list: words.slice(0, 80).map(w => ({ text: w, displayText: dot >= 0 ? w.slice(dot + 1) : w })), from, to: cur });
    });
  }
  hintSource.async = true;
  function showHint(cm, force) {
    if (!force && cm.state.completionActive) return;
    cm.state.forceHint = force;
    cm.showHint({ hint: hintSource, completeSingle: false, closeCharacters: /[\s()\[\]{};:>,=+\-*\/]/ });
  }

  /* ---------- saving: Jupyter .ipynb format ---------- */
  const lines = s => { const a = s.split('\n'); return a.map((l, i) => i < a.length - 1 ? l + '\n' : l).filter((l, i) => l !== '' || i < a.length - 1); };
  function toIpynb(withOutputs = true) {
    return {
      nbformat: 4, nbformat_minor: 5,
      metadata: { kernelspec: { name: 'python3', display_name: 'Python 3 (Pyodide)', language: 'python' }, language_info: { name: 'python', version: pyVersion } },
      cells: cells.map(c => c.type === 'md'
        ? { cell_type: 'markdown', id: c.id, metadata: {}, source: lines(c.cm.getValue()) }
        : { cell_type: 'code', id: c.id, metadata: {}, execution_count: c.count || null, source: lines(c.cm.getValue()), outputs: withOutputs ? c.outputs.map(o => toJupyterOutput(o, c.count)).filter(Boolean) : [] })
    };
  }
  function toJupyterOutput([kind, data], count) {
    if (kind === 'stdout' || kind === 'stderr') return { output_type: 'stream', name: kind, text: lines(data) };
    if (kind === 'note' || kind === 'hint') return null;
    if (kind === 'error') {
      const L = data.trim().split('\n'), last = L[L.length - 1] || '', i = last.indexOf(':');
      return { output_type: 'error', ename: i > 0 ? last.slice(0, i) : last, evalue: i > 0 ? last.slice(i + 1).trim() : '', traceback: L };
    }
    const result = kind.startsWith('result:'), k = result ? kind.slice(7) : kind;
    const mime = { html: 'text/html', png: 'image/png', jpeg: 'image/jpeg', svg: 'image/svg+xml', markdown: 'text/markdown', text: 'text/plain' }[k];
    if (!mime) return null;
    const d = { [mime]: mime.startsWith('image/p') || mime === 'image/jpeg' ? data : lines(data) };
    if (mime !== 'text/plain') d['text/plain'] = [k === 'html' ? '<table>' : '<Figure>'];
    return result ? { output_type: 'execute_result', execution_count: count || null, data: d, metadata: {} } : { output_type: 'display_data', data: d, metadata: {} };
  }
  const joinSrc = s => Array.isArray(s) ? s.join('') : String(s || '');
  const stripAnsi = s => s.replace(/\x1b\[[0-9;]*m/g, '');
  function fromIpynb(j) {
    if (!j || !Array.isArray(j.cells)) throw new Error('This is not a Jupyter notebook.');
    return j.cells.filter(c => c.cell_type === 'code' || c.cell_type === 'markdown' || c.cell_type === 'raw').map(c => {
      const outs = [];
      for (const o of c.outputs || []) {
        if (o.output_type === 'stream') outs.push([o.name === 'stderr' ? 'stderr' : 'stdout', joinSrc(o.text)]);
        else if (o.output_type === 'error') outs.push(['error', stripAnsi((o.traceback || []).join('\n')) || `${o.ename}: ${o.evalue}`]);
        else if (o.data) {
          const d = o.data, pre = o.output_type === 'execute_result' ? 'result:' : '';
          if (d['image/png']) outs.push([pre + 'png', joinSrc(d['image/png']).replace(/\s/g, '')]);
          else if (d['image/jpeg']) outs.push([pre + 'jpeg', joinSrc(d['image/jpeg']).replace(/\s/g, '')]);
          else if (d['text/html']) outs.push([pre + 'html', joinSrc(d['text/html'])]);
          else if (d['image/svg+xml']) outs.push([pre + 'svg', joinSrc(d['image/svg+xml'])]);
          else if (d['text/markdown']) outs.push([pre + 'markdown', joinSrc(d['text/markdown'])]);
          else if (d['text/plain']) outs.push([pre + 'text', joinSrc(d['text/plain'])]);
        }
      }
      return { type: c.cell_type === 'code' ? 'code' : 'md', src: joinSrc(c.source), outs, count: c.execution_count || null };
    });
  }
  function load(list, name, path) {
    // a different notebook starts with fresh Python, as in Jupyter (uploaded files stay)
    if (worker) restart(true);
    cells.forEach(c => c.el.remove()); cells = []; selected = null;
    for (const x of list) insertCell(makeCell(x.type, x.src, x.outs, x.count));
    if (!cells.length) insertCell(makeCell('code'));
    nbName = name || 'notebook.ipynb'; filePath = path || null;
    select(cells[0]); window.scrollTo(0, 0);
    saved(); persist();
  }

  let saveTimer = 0;
  function changed(fromRun) {
    if (!fromRun) { dirty = true; docState(); }
    clearTimeout(saveTimer); saveTimer = setTimeout(persist, 600);
  }
  function persist() {
    const j = { name: nbName, nb: toIpynb(true) };
    if (!store.set('nb', JSON.stringify(j))) store.set('nb', JSON.stringify({ name: nbName, nb: toIpynb(false) }));   // too big with the pictures
  }
  function saved() { dirty = false; docState(); }
  function docState() { if (D) D.docState({ dirty, path: filePath, name: filePath ? filePath.split(/[\\/]/).pop() : nbName }); }

  async function openNotebook() {
    if (D) {
      const r = await D.openFile({ kind: 'notebook' });
      if (!r) return;
      try { load(fromIpynb(JSON.parse(r.content)), r.path.split(/[\\/]/).pop(), r.path); } catch (e) { toast('Could not open it: ' + e.message); }
      return;
    }
    $('openInput').click();
  }
  $('openInput').onchange = async () => {
    const f = $('openInput').files[0]; $('openInput').value = '';
    if (!f) return;
    if (dirty && !confirm('Replace the current notebook? (It is not saved as a file.)')) return;
    try { load(fromIpynb(JSON.parse(await f.text())), f.name); } catch (e) { toast('Could not open it: ' + e.message); }
  };
  async function saveNotebook(saveAs) {
    const text = JSON.stringify(toIpynb(true), null, 1);
    if (D) {
      const p = await D.saveFile({ path: saveAs ? null : filePath, content: text, suggested: nbName, kind: 'notebook' });
      if (!p) return false;
      filePath = p; nbName = p.split(/[\\/]/).pop(); saved(); persist(); return true;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/x-ipynb+json' }));
    a.download = nbName; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    saved(); return true;
  }
  async function newNotebook() {
    if (D) { if (!(await D.discardOk())) return; }
    else if (dirty && !confirm('Start a new, empty notebook? The current one will be replaced.')) return;
    load([{ type: 'code', src: '', outs: [] }], 'notebook.ipynb');
    focusCell(cells[0]);
  }

  /* ---------- examples ---------- */
  const EX = window.NB_EXAMPLES || [];
  $('ex').innerHTML = '<option value="">Examples…</option>' + EX.map((e, i) => `<option value="${i}">${esc(e.title)}</option>`).join('');
  $('ex').onchange = async () => {
    const e = EX[+$('ex').value]; $('ex').value = '';
    if (!e) return;
    if (D) { if (!(await D.discardOk())) return; }
    else if (dirty && !confirm(`Open the example "${e.title}"? It replaces the current notebook.`)) return;
    load(e.cells.map(([t, s]) => ({ type: t === 'md' ? 'md' : 'code', src: s, outs: [] })), e.title.split(':')[0].replace(/[^\w]+/g, '-').toLowerCase().replace(/^-|-$/g, '') + '.ipynb');
    toast('Example opened. Press Run all to run it.', 'Run all', runAll);
  };

  /* ---------- packages ---------- */
  const COMMON = ['numpy', 'pandas', 'scipy', 'scikit-learn', 'matplotlib', 'seaborn', 'statsmodels', 'sympy', 'networkx', 'scikit-image', 'xgboost', 'lightgbm', 'beautifulsoup4', 'pillow'];
  function renderChips() {
    const box = $('chips');
    box.innerHTML = COMMON.map(n => {
      const has = installed.includes(n), can = !offline || (pkgList && pkgList.has(n)) || extra.includes(n);
      if (offline && !can) return '';
      return `<button type="button" class="chip${has ? ' on' : ''}" data-p="${n}" ${has ? 'disabled title="Installed"' : 'title="Install"'}>${has ? '✓ ' : '+ '}${n}</button>`;
    }).join('');
    $('pkgNote').textContent = offline
      ? 'Importing a library in a cell loads it automatically. The offline app carries the libraries below.'
      : 'Importing a library in a cell loads it automatically. You can also install one here: most of the Pyodide collection and pure-Python packages from PyPI work. Installed libraries are cleared when Python restarts.';
  }
  $('chips').onclick = e => { const p = e.target.closest('[data-p]'); if (p && !p.disabled) { $('plog').textContent = ''; pip([p.dataset.p]); } };
  $('pkgForm').onsubmit = e => {
    e.preventDefault();
    const names = $('pkgName').value.trim().split(/[\s,]+/).filter(Boolean);
    if (!names.length) return;
    if (!ready) { toast('Python is still starting.'); return; }
    $('plog').textContent = ''; pip(names); $('pkgName').value = '';
  };

  /* ---------- files ---------- */
  const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(1) + ' MB';
  function renderFiles(list) {
    const ul = $('flist');
    ul.innerHTML = list.length ? list.map(([n, s]) => `<li><span class="n">${esc(n)}</span><span class="s">${fmtSize(s)}</span><button class="btn" type="button" data-get="${esc(n)}">Download</button><button class="btn" type="button" data-del="${esc(n)}">Remove</button></li>`).join('')
      : '<li class="empty">No files yet.</li>';
  }
  async function addFiles(files) {
    for (const f of files) {
      if (f.size > 200 * 1048576) { toast(`${f.name} is larger than 200 MB.`); continue; }
      const bytes = await f.arrayBuffer();
      uploads.set(f.name, bytes);
      if (ready) worker.postMessage({ type: 'putFile', name: f.name, bytes: bytes.slice(0) });
    }
  }
  $('addFiles').onclick = () => $('fileInput').click();
  $('fileInput').onchange = () => { addFiles([...$('fileInput').files]); $('fileInput').value = ''; };
  const drop = $('drop');
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); addFiles([...e.dataTransfer.files]); };
  $('flist').onclick = e => {
    const g = e.target.dataset.get, d = e.target.dataset.del;
    if (g) {
      if (running) { toast('Wait for the running cell to finish.'); return; }
      fileWaiters.push(m => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([m.bytes])); a.download = m.name;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
      worker.postMessage({ type: 'getFile', name: g });
    } else if (d) { uploads.delete(d); worker.postMessage({ type: 'deleteFile', name: d }); }
  };

  /* ---------- toolbar and dialogs ---------- */
  function openDlg(id) { const d = $(id); if (!d.open) d.showModal(); }
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });
  $('helpBtn').onclick = () => openDlg('helpDlg');
  $('pkgBtn').onclick = () => { renderChips(); openDlg('pkgDlg'); };
  $('filesBtn').onclick = () => { openDlg('filesDlg'); if (ready && !running) worker.postMessage({ type: 'files' }); else renderFiles([...uploads].map(([n, b]) => [n, b.byteLength])); };
  $('runAllBtn').onclick = runAll;
  $('stopBtn').onclick = stop;
  $('restartBtn').onclick = () => { if (confirm('Restart Python? Every variable and installed library is cleared (the cells and their output stay).')) restart(); };
  $('addCode').onclick = $('addCode2').onclick = () => addCell('code');
  $('addText').onclick = $('addText2').onclick = () => addCell('md');
  $('newBtn').onclick = newNotebook; $('openBtn').onclick = openNotebook; $('saveBtn').onclick = () => saveNotebook(false);
  if (!D) { $('saveBtn').textContent = 'Download'; $('saveBtn').title = 'Download as a Jupyter notebook (.ipynb)'; }

  let toastTimer = 0;
  function toast(text, btn, fn) {
    $('toastText').textContent = text;
    $('toastBtn').hidden = !btn; $('toastBtn').textContent = btn || '';
    $('toastBtn').onclick = () => { $('toast').hidden = true; fn && fn(); };
    $('toast').hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { $('toast').hidden = true; }, btn ? 7000 : 4000);
  }

  // shortcuts outside the editors
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('.CodeMirror, input, textarea, select, dialog')) return;
    if (!selected) return;
    if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); runCell(selected, 'next'); }
    else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCell(selected); }
    else if (e.key === 'Enter') { e.preventDefault(); if (selected.type === 'md') editMd(selected); else focusCell(selected); }
  });

  /* ---------- start ---------- */
  let initial = null;
  try { initial = JSON.parse(store.get('nb') || 'null'); } catch (_) {}
  if (initial && initial.nb) {
    try { const list = fromIpynb(initial.nb); for (const x of list) insertCell(makeCell(x.type, x.src, x.outs, x.count)); nbName = initial.name || nbName; } catch (_) {}
  }
  if (!cells.length) {
    const e = EX[0];
    if (e) for (const [t, s] of e.cells) insertCell(makeCell(t === 'md' ? 'md' : 'code', s));
    else insertCell(makeCell('code'));
  }
  select(cells[0]);
  startKernel();

  /* ---------- desktop app ---------- */
  if (D) {
    const dlg = $('pwdlg');
    let pwMode = 'on';
    function applyExam(on) {
      examOn = on;
      document.documentElement.classList.toggle('exam', on);
      $('exambadge').hidden = !on;
      $('sugg').disabled = on; $('sugg').checked = on ? false : store.get('sugg') !== '0';
    }
    function askPassword(mode) {
      pwMode = mode;
      $('pwtitle').textContent = mode === 'on' ? 'Start exam mode' : 'End exam mode';
      $('pwtext').textContent = mode === 'on'
        ? 'Exam mode turns off suggestions and error hints, and hides the examples and guides. It stays on, even after the app restarts, until this password is entered. Choose a password that students do not know.'
        : 'Enter the password that was chosen when exam mode was started.';
      $('pw2row').hidden = mode !== 'on';
      $('pw1').value = $('pw2').value = ''; $('pwerr').textContent = '';
      dlg.showModal(); $('pw1').focus();
    }
    $('pwcancel').onclick = () => dlg.close();
    $('pwform').onsubmit = async e => {
      e.preventDefault();
      const pw = $('pw1').value;
      if (pwMode === 'on') {
        if (pw.length < 4) { $('pwerr').textContent = 'Use at least 4 characters.'; return; }
        if (pw !== $('pw2').value) { $('pwerr').textContent = 'The two passwords are different.'; return; }
        await D.examEnable(pw); dlg.close();
      } else if (await D.examDisable(pw)) dlg.close();
      else { $('pwerr').textContent = 'Wrong password.'; $('pw1').select(); }
    };
    D.onExam(applyExam);
    D.examState().then(on => { if (on) applyExam(true); });
    D.onMenu(async a => {
      if (a === 'new') newNotebook();
      else if (a === 'open') openNotebook();
      else if (a === 'save') saveNotebook(false);
      else if (a === 'saveAs') saveNotebook(true);
      else if (a === 'saveThenClose') { if (await saveNotebook(false)) D.closeNow(); }
      else if (a === 'run') { if (selected) runCell(selected); }
      else if (a === 'guide') openDlg('helpDlg');
      else if (a === 'examOn') askPassword('on');
      else if (a === 'examOff') askPassword('off');
    });
    docState();
  }
})();
