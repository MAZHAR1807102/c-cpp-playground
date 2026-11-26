// Visualize panel: the flowchart of the code in the editor (C, C++, Java, Python) and, for Python, a step-by-step
// run that shows the line about to run, every variable, and the output so far, with the flowchart following along.
// The page (index.html) exposes window.PG = { cm, lang(), stdin(), onLang(fn), closeSim() }.
import { buildCharts, layoutChart, renderSVG } from './flowchart.js';

const TS = 'https://cdn.jsdelivr.net/npm/web-tree-sitter@0.25.10/';
const GRAMMARS = 'https://cdn.jsdelivr.net/npm/';
const GRAMMAR = { c: 'tree-sitter-c@0.24.1/tree-sitter-c.wasm', cpp: 'tree-sitter-cpp@0.23.4/tree-sitter-cpp.wasm', java: 'tree-sitter-java@0.23.5/tree-sitter-java.wasm', python: 'tree-sitter-python@0.25.0/tree-sitter-python.wasm' };
const MAX_STEPS = 1500, TRACE_TIMEOUT = 15000;

const $ = id => document.getElementById(id);
const PG = window.PG;
const cm = PG.cm;
const store = { get(k) { try { return localStorage.getItem('ccp.viz.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.viz.' + k, v); } catch (_) {} } };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------------- parser (tree-sitter, loaded on first use; one grammar per language) ---------------- */
let tsMod = null;
const langs = {};
async function parserFor(lang) {
  if (!tsMod) {
    tsMod = (async () => {
      const m = await import(TS + 'tree-sitter.js');
      await m.Parser.init({ locateFile: f => TS + f });
      return m;
    })();
  }
  const m = await tsMod;
  if (!langs[lang]) langs[lang] = m.Language.load(GRAMMARS + GRAMMAR[lang]).then(L => { const p = new m.Parser(); p.setLanguage(L); return p; });
  return langs[lang];
}

/* ---------------- state ---------------- */
let open = false, charts = [], curChart = null, lastLayout = null, zoom = 1, fitMode = true, parseTimer = 0, parseSeq = 0;
let pickedLines = null;

function setNote(text) { $('vizNote').textContent = text || ''; $('vizNote').hidden = !text; }

async function refresh() {
  if (!open) return;
  const lang = PG.lang(), code = cm.getValue(), seqNo = ++parseSeq;
  if (!charts.length) $('vizChart').innerHTML = '<p class="vizempty">Loading the code parser…</p>';
  let parser;
  try { parser = await parserFor(lang); } catch (e) { $('vizChart').innerHTML = `<p class="vizempty">The parser could not be loaded (${esc(e.message || e)}). Check the internet connection and try again.</p>`; return; }
  if (seqNo !== parseSeq) return;
  const tree = parser.parse(code);
  let res;
  try { res = buildCharts(tree.rootNode, lang); } catch (e) { console.error(e); res = { charts: [], hasError: true }; }
  tree.delete();
  charts = res.charts;
  setNote(res.hasError ? 'The code has a syntax error, so part of the chart may be missing or wrong.' : '');
  const sel = $('vizFn');
  sel.innerHTML = charts.map((c, i) => `<option value="${i}">${esc(c.top ? 'Main program' : c.title)}</option>`).join('');
  sel.hidden = charts.length < 2;
  if (!charts.length) { curChart = null; $('vizChart').innerHTML = '<p class="vizempty">Nothing to draw yet: write a function (for example <code>main</code>) or, in Python, some statements.</p>'; return; }
  const keep = curChart && charts.find(c => c.name === curChart.name);
  const def = charts.find(c => c.name === 'main') || charts.find(c => c.top) || charts[0];
  showChart(keep || def, true);
}

function showChart(chart, keepScroll) {
  curChart = chart;
  $('vizFn').value = String(charts.indexOf(chart));
  const box = $('vizChart');
  const sx = box.scrollLeft, sy = box.scrollTop;
  lastLayout = layoutChart(chart);
  box.innerHTML = renderSVG(lastLayout);
  applyZoom();
  if (keepScroll) { box.scrollLeft = sx; box.scrollTop = sy; }
  markNodes();
}

function applyZoom() {
  const svg = $('vizChart').querySelector('svg');
  if (!svg || !lastLayout) return;
  if (fitMode) {
    const avail = $('vizChart').clientWidth - 16;
    zoom = Math.max(0.35, Math.min(1.25, avail / lastLayout.w));
  }
  svg.setAttribute('width', Math.round(lastLayout.w * zoom));
  svg.setAttribute('height', Math.round(lastLayout.h * zoom));
  $('vizZoomFit').textContent = Math.round(zoom * 100) + '%';
}
function zoomBy(f) { fitMode = false; zoom = Math.max(0.3, Math.min(2.5, zoom * f)); applyZoom(); }

/* ---------------- flowchart <-> editor ---------------- */
// the node(s) for a line: the smallest range that contains it, in the given chart's layout
function nodesForLine(line, exact) {
  const nodes = [...$('vizChart').querySelectorAll('.fc-n')].filter(g => g.dataset.line > 0);
  let best = [], span = Infinity;
  for (const g of nodes) {
    const a = +g.dataset.line, b = +g.dataset.end;
    if (exact ? a !== line : (line < a || line > b)) continue;
    if (g.classList.contains('fc-conn')) continue;
    const s = b - a;
    if (s < span) { span = s; best = [g]; } else if (s === span) best.push(g);
  }
  return best;
}
function chartForLine(line) {
  let best = null;
  for (const c of charts) if (line >= c.line && line <= c.endLine && (!best || (c.endLine - c.line) < (best.endLine - best.line))) best = c;
  return best;
}
let nowLines = null, wasLine = 0;
function markNodes() {
  const svg = $('vizChart');
  svg.querySelectorAll('.fc-n.sel,.fc-n.now,.fc-n.was').forEach(g => g.classList.remove('sel', 'now', 'was'));
  if (stepping && trace && trace.steps.length) {
    const st = trace.steps[stepIdx];
    for (const g of nodesForLine(st.l, true).concat(nodesForLine(st.l, true).length ? [] : nodesForLine(st.l, false))) g.classList.add('now');
    if (stepIdx > 0) { const p = trace.steps[stepIdx - 1].l; if (p !== st.l) nodesForLine(p, true).forEach(g => g.classList.add('was')); }
    const n = svg.querySelector('.fc-n.now');
    if (n) scrollIntoViewIfNeeded(n);
    return;
  }
  const line = cm.getCursor().line + 1;
  const sel = nodesForLine(line, false);
  sel.forEach(g => g.classList.add('sel'));
}
function scrollIntoViewIfNeeded(el) {
  const box = $('vizChart'), r = el.getBoundingClientRect(), b = box.getBoundingClientRect();
  if (r.top < b.top + 10 || r.bottom > b.bottom - 10 || r.left < b.left || r.right > b.right) {
    box.scrollTo({ top: box.scrollTop + (r.top - b.top) - b.height / 2 + r.height / 2, left: box.scrollLeft + (r.left - b.left) - b.width / 2 + r.width / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}
// highlights keep CodeMirror line handles (not numbers), so they can be removed safely after the text changed
let pickHandles = [];
function clearPick() { for (const h of pickHandles) cm.removeLineClass(h, 'background', 'viz-pick'); pickHandles = []; pickedLines = null; }
function pickLines(a, b) {
  clearPick();
  b = Math.min(b, cm.lineCount());
  for (let l = Math.max(1, a); l <= b; l++) pickHandles.push(cm.addLineClass(l - 1, 'background', 'viz-pick'));
  pickedLines = [a, b];
}

/* ---------------- step through (Python) ---------------- */
let stepping = false, trace = null, stepIdx = 0, playing = 0, worker = null, workerReady = null, traceTimer = 0, traceSeq = 0, stale = false;
let marked = [];
function ensureWorker() {
  if (workerReady) return workerReady;
  worker = new Worker('python-tracer.js', { type: 'module' });
  workerReady = new Promise((res, rej) => {
    worker.onmessage = ({ data }) => { if (data.type === 'ready') res(); else if (data.type === 'fatal') rej(new Error(data.message)); };
    worker.onerror = e => rej(new Error(e.message || 'the Python worker failed'));
  });
  worker.postMessage({ type: 'load' });
  return workerReady;
}
function killWorker() { if (worker) worker.terminate(); worker = null; workerReady = null; }

async function runTrace() {
  if (!stepping) return;
  const seqNo = ++traceSeq;
  stopPlay();
  setMsg('Starting Python…');
  try { await ensureWorker(); } catch (e) { setMsg('Python could not start: ' + e.message, 'err'); return; }
  if (seqNo !== traceSeq) return;
  setMsg('Running the program step by step…');
  const result = await new Promise(res => {
    const t = setTimeout(() => { killWorker(); res({ steps: [], out: '', error: 'Stopped: the program ran for more than ' + TRACE_TIMEOUT / 1000 + ' seconds without reaching a new line (a very long calculation inside one line?).', errLine: 0, timeout: true }); }, TRACE_TIMEOUT);
    worker.onmessage = ({ data }) => { if (data.type === 'trace') { clearTimeout(t); res(data); } };
    worker.postMessage({ type: 'trace', source: cm.getValue(), stdin: PG.stdin(), maxSteps: MAX_STEPS });
  });
  if (seqNo !== traceSeq) return;
  // after an edit, stay at the same step number, so a change can be watched in place
  const keep = trace ? stepIdx : 0;
  trace = result; stale = false;
  stepIdx = Math.max(0, Math.min(keep, trace.steps.length - 1));
  $('vizRange').max = Math.max(0, trace.steps.length - 1);
  showStep();
}

function setMsg(text, cls) { const m = $('vizMsg'); m.textContent = text; m.className = 'vizmsg' + (cls ? ' ' + cls : ''); }
function clearMarks() { for (const [h, c] of marked) cm.removeLineClass(h, 'background', c); marked = []; }
function markLine(l, c) { if (l >= 1 && l <= cm.lineCount()) marked.push([cm.addLineClass(l - 1, 'background', c), c]); }

function showStep() {
  clearMarks();
  const n = trace ? trace.steps.length : 0;
  $('vizRange').value = stepIdx;
  $('vizCount').textContent = n ? `step ${stepIdx + 1} of ${n}${trace.truncated ? '+' : ''}` : 'no steps';
  if (!n) {
    $('vizFrames').innerHTML = '';
    $('vizOut').textContent = trace ? trace.out : '';
    if (trace && trace.error) { setMsg((trace.errLine ? 'Line ' + trace.errLine + ': ' : '') + trace.error, 'err'); if (trace.errLine) markLine(trace.errLine, 'viz-cur'); }
    else setMsg('The program has no steps to show.');
    markNodes();
    return;
  }
  const st = trace.steps[stepIdx], prev = stepIdx > 0 ? trace.steps[stepIdx - 1] : null;
  if (prev && prev.l !== st.l) markLine(prev.l, 'viz-prev');
  markLine(st.l, 'viz-cur');
  if (st.l >= 1 && st.l <= cm.lineCount()) cm.scrollIntoView({ line: st.l - 1, ch: 0 }, 60);
  const last = stepIdx === n - 1;
  const top = st.st[st.st.length - 1];
  if (st.ev === 'exception') setMsg(`Line ${st.l}: ${st.ex}`, 'err');
  else if (last && trace.error) setMsg(`Line ${trace.errLine || st.l}: ${trace.error}`, 'err');
  else if (last && trace.truncated) setMsg(`Stopped after ${n} steps (the step limit). Shorten the loop or the input to see the end.`, 'err');
  else if (last) setMsg('The program finished.', 'done');
  else {
    const limit = trace.truncated ? ` (only the first ${n} steps are recorded: the step limit)` : '';
    if (st.ev === 'call') setMsg(`Calling ${top ? top.n : ''}() — line ${st.l}${limit}`);
    else if (st.ev === 'return') setMsg(`${top && top.n !== 'Global' ? top.n + '() returns' : 'Finishing'} — line ${st.l}${limit}`);
    else setMsg(`Line ${st.l} runs next${limit}`);
  }
  // follow the code into the function the step is in
  const ch = chartForLine(st.l);
  if (ch && ch !== curChart) showChart(ch, false); else markNodes();
  $('vizFrames').innerHTML = renderFrames(st, prev);
  const curFrame = $('vizFrames').querySelector('.vframe.cur');
  if (curFrame && st.st.length > 1) $('vizFrames').scrollTop = curFrame.offsetTop - $('vizFrames').offsetTop - 8;
  $('vizOut').textContent = trace.out.slice(0, st.o) || '';
  $('vizOut').scrollTop = $('vizOut').scrollHeight;
  $('vizPrev').disabled = $('vizFirst').disabled = stepIdx === 0;
  $('vizNext').disabled = $('vizLast').disabled = last;
}

/* values */
function resolve(v, heap, seen = new Set()) {
  // a plain, comparable form (for "did it change?")
  if (v[0] !== 'r') return v[1];
  const o = heap[v[1]];
  if (!o || seen.has(v[1])) return '#' + v[1];
  seen.add(v[1]);
  const r = o[0] === 'list' || o[0] === 'tuple' || o[0] === 'set' ? o[1].map(x => resolve(x, heap, seen)) : o[0] === 'dict' ? o[1].map(([k, x]) => [resolve(k, heap, seen), resolve(x, heap, seen)]) : o[0] === 'obj' ? o[2].map(([k, x]) => [k, resolve(x, heap, seen)]) : o.slice(1);
  seen.delete(v[1]);
  return JSON.stringify([o[0], r]);
}
function countRefs(st) {
  const c = {};
  const walk = (v, seen) => {
    if (v[0] !== 'r') return;
    c[v[1]] = (c[v[1]] || 0) + 1;
    if (seen.has(v[1])) return; seen.add(v[1]);
    const o = st.h[v[1]]; if (!o) return;
    if (o[0] === 'list' || o[0] === 'tuple' || o[0] === 'set') o[1].forEach(x => walk(x, seen));
    else if (o[0] === 'dict') o[1].forEach(([k, x]) => { walk(k, seen); walk(x, seen); });
    else if (o[0] === 'obj') o[2].forEach(([, x]) => walk(x, seen));
  };
  const seen = new Set();
  for (const f of st.st) for (const [, v] of f.v) walk(v, seen);
  if (st.rv) walk(st.rv, seen);
  return c;
}
function prim(v) {
  const cls = { n: 'vv-n', s: 'vv-s', b: 'vv-b', x: 'vv-x' }[v[0]] || '';
  return `<span class="${cls}">${esc(v[1])}</span>`;
}
const isNum = v => v[0] === 'n' && /^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v[1]);
function val(v, st, prevV, prevHeap, refs, depth = 0, seen = new Set()) {
  if (v[0] !== 'r') return prim(v);
  const id = v[1], o = st.h[id];
  if (!o) return '<span class="vv-o">?</span>';
  const badge = refs[id] > 1 ? `<span class="vid" title="The same object is used in more than one place">#${id}</span>` : '';
  if (seen.has(id)) return `<span class="vv-o">↻ #${id}</span>`;
  if (depth > 3) return `<span class="vv-o">${esc(o[3] || o[0])}…</span>${badge}`;
  seen.add(id);
  const po = prevV && prevV[0] === 'r' ? prevHeap[prevV[1]] : null;
  let html;
  const kind = o[0];
  if (kind === 'list' || kind === 'tuple' || kind === 'set') {
    const items = o[1], more = o[2] > items.length ? `<span class="vmore">… ${o[2] - items.length} more</span>` : '';
    const pItems = po && po[0] === kind ? po[1] : null;
    const label = kind === 'list' ? '' : `<span class="vkind">${esc(o[3] || kind)}</span>`;
    const tn = o[3] && o[3] !== kind ? `<span class="vkind">${esc(o[3])}</span>` : label;
    // a list of lists of plain values: a grid (2D array, DP table)
    const rows = kind !== 'set' && items.length && items.every(x => x[0] === 'r' && st.h[x[1]] && (st.h[x[1]][0] === 'list' || st.h[x[1]][0] === 'tuple') && st.h[x[1]][1].every(y => y[0] !== 'r'));
    if (rows) {
      const width = Math.max(...items.map(x => st.h[x[1]][1].length));
      const pRows = pItems && pItems.map(x => x[0] === 'r' && prevHeap[x[1]] ? prevHeap[x[1]][1] : null);
      html = tn + `<table class="vgrid"><tr><th></th>${Array.from({ length: width }, (_, j) => `<th>${j}</th>`).join('')}</tr>` + items.map((x, i) => {
        const row = st.h[x[1]][1];
        return `<tr><th>${i}</th>` + row.map((y, j) => `<td class="${pRows && pRows[i] && pRows[i][j] && pRows[i][j][1] !== y[1] ? 'chg' : ''}">${prim(y)}</td>`).join('') + '</tr>';
      }).join('') + `</table>${more}`;
    } else {
      const nums = bars && items.length > 1 && items.every(isNum);
      const max = nums ? Math.max(...items.map(x => Math.abs(+x[1])), 1e-9) : 1;
      html = tn + `<span class="vlist">${kind === 'set' ? '<span class="vmore">{</span>' : ''}` + items.map((x, i) => {
        const ch = pItems && (pItems[i] === undefined || resolve(pItems[i], prevHeap) !== resolve(x, st.h));
        const bar = nums ? `<span class="bar${+x[1] < 0 ? ' neg' : ''}" style="height:${Math.max(2, Math.round(Math.abs(+x[1]) / max * 60))}px"></span>` : '';
        return `<span class="c${ch && po ? ' chg' : ''}">${bar}${kind === 'set' ? '' : `<span class="i">${i}</span>`}<span class="b">${val(x, st, pItems && pItems[i], prevHeap, refs, depth + 1, seen)}</span></span>`;
      }).join('') + `${kind === 'set' ? '<span class="vmore">}</span>' : ''}${!items.length ? `<span class="vmore">${kind === 'tuple' ? '()' : kind === 'set' ? 'empty' : '[ ]'}</span>` : ''}${more}</span>`;
    }
  } else if (kind === 'dict') {
    const more = o[2] > o[1].length ? `<span>…</span><span>${o[2] - o[1].length} more</span>` : '';
    html = (o[3] && o[3] !== 'dict' ? `<span class="vkind">${esc(o[3])}</span>` : '') + `<span class="vdict">${o[1].map(([k, x]) => `<span>${val(k, st, null, prevHeap, refs, depth + 1, seen)}</span><span>${val(x, st, null, prevHeap, refs, depth + 1, seen)}</span>`).join('') || '<span>empty</span><span></span>'}${more}</span>`;
  } else if (kind === 'obj') {
    html = `<span class="vobj"><b>${esc(o[1])}</b>${o[2].map(([k, x]) => `${esc(k)} = ${val(x, st, null, prevHeap, refs, depth + 1, seen)}`).join('<br>') || '<i class="vv-o">no attributes</i>'}</span>`;
  } else if (kind === 'fn') html = `<span class="vv-fn">function ${esc(o[1])}</span>`;
  else if (kind === 'cls') html = `<span class="vv-cls">class ${esc(o[1])}</span>`;
  else html = `<span class="vv-o">${esc(o[1])}</span> ${esc(o[2])}`;
  seen.delete(id);
  return html + badge;
}
let bars = store.get('bars') === '1';
function renderFrames(st, prev) {
  const refs = countRefs(st);
  const prevFrames = prev ? prev.st : [];
  return st.st.map((f, i) => {
    const pf = prevFrames.find(p => p.k === f.k);
    const rows = f.v.filter(([, v]) => !(v[0] === 'r' && st.h[v[1]] && (st.h[v[1]][0] === 'fn' || st.h[v[1]][0] === 'cls')) || f.n !== 'Global');
    const fnRows = f.v.length - rows.length;
    const body = rows.map(([k, v]) => {
      const pv = pf ? (pf.v.find(x => x[0] === k) || [])[1] : undefined;
      const changed = pf && (!pv || resolve(pv, prev.h) !== resolve(v, st.h));
      const c = changed ? ' chg' : '';
      return `<span class="nm${c}">${esc(k)}</span><span class="vl${c}">${val(v, st, pv, prev ? prev.h : {}, refs)}</span>`;
    }).join('');
    const rv = i === st.st.length - 1 && st.ev === 'return' && st.rv && f.n !== 'Global' ? `<span class="nm rv">returns</span><span class="vl">${val(st.rv, st, null, {}, refs)}</span>` : '';
    return `<div class="vframe${i === st.st.length - 1 ? ' cur' : ''}"><h4>${esc(f.n === 'Global' ? 'Global variables' : f.n + '()')}<i>line ${f.ln}</i></h4><div class="vvars">${body || rv ? body + rv : `<span class="none">${fnRows ? 'only function definitions so far' : 'no variables yet'}</span>`}</div></div>`;
  }).join('');
}

function go(i) { if (!trace) return; stepIdx = Math.max(0, Math.min(trace.steps.length - 1, i)); showStep(); }
const SPEEDS = { slow: 900, normal: 420, fast: 140 };
function stopPlay() { if (playing) { clearInterval(playing); playing = 0; } $('vizPlay').textContent = 'Play'; }
function togglePlay() {
  if (playing) return stopPlay();
  if (!trace || !trace.steps.length) return;
  if (stepIdx >= trace.steps.length - 1) go(0);
  $('vizPlay').textContent = 'Pause';
  playing = setInterval(() => { if (!trace || stepIdx >= trace.steps.length - 1) return stopPlay(); go(stepIdx + 1); }, SPEEDS[$('vizSpeed').value] || 420);
}
function setStepping(on) {
  stepping = on && PG.lang() === 'python';
  $('vizStepBtn').setAttribute('aria-pressed', stepping);
  $('vizStepper').hidden = !stepping;
  if (!stepping) { stopPlay(); clearMarks(); traceSeq++; }
  else { trace = null; stepIdx = 0; runTrace(); }
  requestAnimationFrame(() => { applyZoom(); markNodes(); });
}

/* ---------------- open / close ---------------- */
function openPanel() {
  PG.closeSim();
  open = true;
  $('vizPanel').hidden = false;
  document.body.classList.add('vizopen');
  $('vizBtn').setAttribute('aria-pressed', 'true');
  cm.refresh();
  updateLangUI();
  refresh();
  if (store.get('step') === '1' && PG.lang() === 'python') setStepping(true);
}
function closePanel() {
  if (!open) return;
  open = false;
  setStepping(false);
  clearPick();
  $('vizPanel').hidden = true;
  document.body.classList.remove('vizopen');
  $('vizBtn').setAttribute('aria-pressed', 'false');
  cm.refresh();
}
function updateLangUI() {
  const py = PG.lang() === 'python';
  $('vizStepBtn').hidden = !py;
  if (!py && stepping) setStepping(false);
}
window.Viz = { close: closePanel, isOpen: () => open };

/* ---------------- wiring ---------------- */
$('vizBtn').onclick = () => open ? closePanel() : openPanel();
$('vizClose').onclick = closePanel;
$('vizFn').onchange = () => { const c = charts[+$('vizFn').value]; if (c) { $('vizChart').scrollTo(0, 0); showChart(c, false); } };
$('vizZoomIn').onclick = () => zoomBy(1.2);
$('vizZoomOut').onclick = () => zoomBy(1 / 1.2);
$('vizZoomFit').onclick = () => { fitMode = true; applyZoom(); };
$('vizStepBtn').onclick = () => { const on = !stepping; store.set('step', on ? '1' : '0'); setStepping(on); };
$('vizFirst').onclick = () => { stopPlay(); go(0); };
$('vizPrev').onclick = () => { stopPlay(); go(stepIdx - 1); };
$('vizNext').onclick = () => { stopPlay(); go(stepIdx + 1); };
$('vizLast').onclick = () => { stopPlay(); go(Infinity); };
$('vizPlay').onclick = togglePlay;
$('vizSpeed').value = store.get('speed') || 'normal';
$('vizSpeed').onchange = () => { store.set('speed', $('vizSpeed').value); if (playing) { stopPlay(); togglePlay(); } };
$('vizRange').oninput = () => { stopPlay(); go(+$('vizRange').value); };
$('vizBars').checked = bars;
$('vizBars').onchange = () => { bars = $('vizBars').checked; store.set('bars', bars ? '1' : '0'); if (trace) showStep(); };
$('vizPanel').addEventListener('keydown', e => {
  if (!stepping || e.target.matches('select, input:not([type=range])')) return;
  if (e.key === 'ArrowRight') { e.preventDefault(); stopPlay(); go(stepIdx + 1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); stopPlay(); go(stepIdx - 1); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && open && !document.querySelector('dialog[open]')) closePanel(); });

// click a shape: put the cursor on its line(s); double-click a function call: open that function's chart
const chartBox = $('vizChart');
chartBox.addEventListener('click', e => {
  if (dragged) return;
  const g = e.target.closest('.fc-n, .fc-g, .fc-cl');
  if (!g) return;
  const a = +(g.dataset.line || 0), b = +(g.dataset.end || a);
  if (!a) return;
  cm.setCursor({ line: a - 1, ch: 0 });
  cm.scrollIntoView({ line: a - 1, ch: 0 }, 80);
  pickLines(a, b);
  markNodes();
});
chartBox.addEventListener('dblclick', e => {
  const g = e.target.closest('.fc-call');
  if (!g) return;
  const text = g.querySelector('title').textContent;
  const target = charts.find(c => !c.top && new RegExp('(^|[^\\w.])' + c.name.split(/::|\./).pop() + '\\s*\\(').test(text));
  if (target) { chartBox.scrollTo(0, 0); showChart(target, false); }
});
// connectors: hovering one shows its partner
chartBox.addEventListener('mouseover', e => {
  const g = e.target.closest('.fc-n');
  chartBox.querySelectorAll('.pair').forEach(x => x.classList.remove('pair'));
  if (!g) return;
  const k = g.dataset.conn || g.dataset.connTo;
  if (k) chartBox.querySelectorAll(`[data-conn="${CSS.escape(k)}"],[data-conn-to="${CSS.escape(k)}"]`).forEach(x => x.classList.add('pair'));
});
// drag to pan, Ctrl + wheel to zoom
let drag = null, dragged = false;
chartBox.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, sl: chartBox.scrollLeft, st: chartBox.scrollTop }; dragged = false; });
addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (!dragged && Math.abs(dx) + Math.abs(dy) < 5) return;
  dragged = true; chartBox.classList.add('drag');
  chartBox.scrollLeft = drag.sl - dx; chartBox.scrollTop = drag.st - dy;
});
addEventListener('pointerup', () => { drag = null; chartBox.classList.remove('drag'); setTimeout(() => { dragged = false; }, 0); });
chartBox.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 1 / 1.1); }, { passive: false });
new ResizeObserver(() => { if (open && fitMode) applyZoom(); }).observe(chartBox);

cm.on('changes', () => {
  if (!open) return;
  clearPick();
  clearTimeout(parseTimer); parseTimer = setTimeout(refresh, 300);
  if (stepping) { stale = true; clearTimeout(traceTimer); traceTimer = setTimeout(runTrace, 900); }
});
cm.on('cursorActivity', () => {
  if (!open || stepping) return;
  const line = cm.getCursor().line + 1;
  if (pickedLines && (line < pickedLines[0] || line > pickedLines[1])) clearPick();
  const ch = chartForLine(line);
  if (ch && curChart && ch !== curChart && !(curChart.top && ch.top)) showChart(ch, false); else markNodes();
});
$('stdin').addEventListener('input', () => { if (open && stepping) { clearTimeout(traceTimer); traceTimer = setTimeout(runTrace, 900); } });
PG.onLang(() => { charts = []; curChart = null; updateLangUI(); if (open) refresh(); });
// exam mode hides the panel
new MutationObserver(() => { if (document.documentElement.classList.contains('exam')) closePanel(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
