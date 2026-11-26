// The Circuit tab: Yosys (circuit-worker.js) makes a netlist of the module being edited and netlistsvg draws it —
// as logic gates, or as blocks (sub-modules, adders, multiplexers, registers). The wires are then coloured with the
// simulation: a 1 glows, a 0 is dim, an unknown value is red. Play runs through the simulated time so the signals
// can be watched travelling through the circuit; clicking the waveform moves the circuit to that moment.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ELKJS = 'https://cdn.jsdelivr.net/npm/elkjs@0.9.3/lib/elk.bundled.js';   // netlistsvg expects ELK as a global
  const NETLISTSVG = 'https://cdn.jsdelivr.net/npm/netlistsvg@1.0.2/built/netlistsvg.bundle.js';
  const SKIN = 'https://cdn.jsdelivr.net/npm/netlistsvg@1.0.2/lib/default.svg';
  const box = $('circuit');
  let worker = null, ready = null, reqId = 0, timer = 0, cacheKey = '', netlist = null, svgText = '', state = null, zoom = 1, t = 0, playing = 0;
  let skin = null;

  box.innerHTML = `<div class="ctime" id="cTime" hidden><button class="btn small" type="button" id="cPlay">▶ Play</button><input type="range" id="cSlider" min="0" max="100" value="0" aria-label="Time"><span id="cNow">0</span><span class="clegend"><i class="l1"></i>1 <i class="l0"></i>0 <i class="lx"></i>unknown</span></div><div class="cvals" id="cVals"></div><div class="cview" id="cView"><p class="empty">Open this tab to draw the circuit.</p></div>`;
  const style = document.createElement('style');
  style.textContent = `
    .ctime{display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid var(--line); font:600 .8rem "JetBrains Mono",monospace; color:var(--muted)}
    .ctime[hidden]{display:none}
    .ctime input{flex:1; accent-color:var(--accent)}
    .clegend{display:flex; gap:5px; align-items:center; margin-left:6px}
    .clegend i{display:inline-block; width:16px; height:4px; border-radius:2px}
    .clegend .l1{background:#22c55e; box-shadow:0 0 6px #22c55e} .clegend .l0{background:var(--muted)} .clegend .lx{background:#e11d48}
    .cvals{display:flex; flex-wrap:wrap; gap:4px 12px; padding:4px 10px; font:12px "JetBrains Mono",monospace; color:var(--muted)}
    .cvals:empty{display:none}
    .cvals b{color:var(--ink)} .cvals .v1{color:#16a34a; font-weight:700} .cvals .vx{color:#e11d48}
    .cview{flex:1; overflow:auto; padding:10px; background:var(--code-bg)}
    .cview svg{display:block; margin:0 auto; transform-origin:0 0}
    .cview svg text{fill:var(--ink)!important; font-family:"JetBrains Mono",monospace!important}
    .cview svg line,.cview svg path,.cview svg rect,.cview svg circle,.cview svg polygon{stroke:var(--ink)}
    .cview svg path,.cview svg rect,.cview svg polygon,.cview svg circle{fill:var(--surface)}
    .cview svg circle[r="2"],.cview svg circle[r="3"]{fill:var(--ink)}
    .cview svg line.sig1,.cview svg path.sig1{stroke:#22c55e!important; stroke-width:2.6!important; filter:drop-shadow(0 0 3px #22c55e)}
    .cview svg line.sig0,.cview svg path.sig0{stroke:color-mix(in oklab,var(--muted) 70%,transparent)!important}
    .cview svg line.sigx,.cview svg path.sigx{stroke:#e11d48!important; stroke-dasharray:4 3}
    .cview .cmsg{color:var(--muted); padding:24px; text-align:center}
    .cview .cerr{color:var(--err); white-space:pre-wrap; font:12px "JetBrains Mono",monospace; text-align:left}`;
  document.head.appendChild(style);

  const visible = () => $('p-circuit').classList.contains('on');
  function loadScript(src, global) { return new Promise((ok, no) => { if (window[global]) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('could not load ' + src)); document.head.appendChild(s); }); }
  function startWorker() {
    worker = new Worker('circuit-worker.js', { type: 'module' });
    ready = new Promise((res, rej) => {
      worker.onmessage = ({ data }) => {
        if (data.type === 'progress' && data.total) msg(`Downloading the circuit tools (Yosys)… ${Math.round(100 * data.done / data.total)}% of ${Math.round(data.total / 1048576)} MB — only the first time`);
        else if (data.type === 'ready') res(); else if (data.type === 'fatal') rej(new Error(data.message));
      };
    });
    worker.postMessage({ type: 'load' });
    return ready;
  }
  const msg = (text, cls = 'cmsg') => { $('cView').innerHTML = `<p class="${cls}">${esc(text)}</p>`; };

  // which module to draw: the one being edited; for a testbench, the module it tests
  function topOf(last) {
    if (!last) return null;
    let m = last.target;
    if (m && !m.ports.length && m.insts.length) m = last.mods.find(x => x.name === m.insts[0].type) || m;
    if (!m || !m.ports.length) { const tb = last.tb; if (tb && tb.insts.length) m = last.mods.find(x => x.name === tb.insts[0].type); }
    return m && m.ports.length ? m : null;
  }
  // the files for Yosys: testbenches (modules without ports) are left out, line numbers kept
  function filesFor(last, project) {
    const tbs = last.mods.filter(m => !m.ports.length);
    return project.files.filter(f => /\.(s?v|vh|svh)$/i.test(f.name)).map(f => {
      const lines = f.text.split('\n');
      for (const tb of tbs) if (tb.file === f.name) for (let l = tb.line; l <= tb.endLine; l++) lines[l - 1] = '';
      return { path: f.name, data: lines.join('\n') };
    });
  }
  function update(last, project) {
    state = { last, project };
    const m = topOf(last);
    $('circSrc').textContent = m ? m.name : '—';
    if (!visible()) return;
    clearTimeout(timer);
    timer = setTimeout(build, 350);
  }
  async function build() {
    const { last, project } = state;
    const m = topOf(last);
    if (!m) { msg('Put the cursor in a module with inputs and outputs to see its circuit.'); return; }
    if (last.sim && !last.sim.ok && last.errors && last.errors.length) { msg('Fix the errors in the code (see the Console tab) to see the circuit.'); return; }
    const files = filesFor(last, project), view = $('circView').value;
    const key = JSON.stringify([files, m.name, view]);
    if (key === cacheKey && netlist) { paint(true); return; }
    const id = ++reqId;
    window.VL.setCircuitDot('busy');
    if (!svgText) msg('Drawing the circuit…');
    try { await (ready || startWorker()); } catch (e) { ready = null; msg('The circuit tools could not be loaded: ' + e.message); window.VL.setCircuitDot('err'); return; }
    const res = await new Promise(r => { worker.onmessage = ({ data }) => { if (data.type === 'netlist' && data.id === id) r(data); }; worker.postMessage({ type: 'netlist', id, files, top: m.name, view }); });
    if (id !== reqId) return;
    if (!res.ok) { $('cView').innerHTML = `<p class="cmsg">Yosys could not make a circuit from this module.</p><pre class="cerr">${esc(res.log.trim().split('\n').filter(l => /error|ERROR/.test(l)).slice(0, 6).join('\n') || res.log.slice(-600))}</pre>`; window.VL.setCircuitDot('err'); return; }
    try {
      await loadScript(ELKJS, 'ELK');
      await loadScript(NETLISTSVG, 'netlistsvg');
      if (!skin) skin = await (await fetch(SKIN)).text();
      netlist = JSON.parse(res.json);
      // only the module being drawn is shown
      for (const k of Object.keys(netlist.modules)) if (k !== m.name) netlist.modules[k].attributes = Object.assign({}, netlist.modules[k].attributes, { top: 0 });
      if (netlist.modules[m.name]) netlist.modules[m.name].attributes = Object.assign({}, netlist.modules[m.name].attributes, { top: 1 });
      svgText = await new Promise((ok, no) => { const p = netlistsvg.render(skin, netlist, (e, s) => e ? no(e) : ok(s)); if (p && p.then) p.then(ok, no); });
      cacheKey = key;
      $('cView').innerHTML = svgText;
      { const svg = $('cView').querySelector('svg'), w = svg && (+svg.getAttribute('width') || 600); if (w) zoom = Math.max(0.4, Math.min(2.2, ($('cView').clientWidth - 24) / w)); }
      applyZoom();
      window.VL.setCircuitDot('ok');
      paint(true);
    } catch (e) { msg('The circuit could not be drawn: ' + (e && e.message || e)); window.VL.setCircuitDot('err'); }
  }

  /* ---------- the simulation on the wires ---------- */
  function dutScope(last, m) {
    if (!last.tb) return '__pg_tb.dut';
    const inst = last.tb.insts.find(i => i.type === m.name);
    return inst ? last.tb.name + '.' + inst.name : null;
  }
  let bitInfo = null, vcd = null, scope = null;
  function prepare() {
    const { last } = state, m = topOf(last);
    vcd = window.VL_WAVE && window.VL_WAVE.data;
    scope = m ? dutScope(last, m) : null;
    bitInfo = new Map();
    const mod = netlist && m && netlist.modules[m.name];
    if (!mod || !vcd || !scope) return false;
    const byKey = new Map();
    for (const s of vcd.signals) byKey.set(s.scope + '.' + s.name.replace(/\[.*$/, ''), s);
    for (const [name, nn] of Object.entries(mod.netnames || {})) {
      const parts = name.replace(/^\\/, '').split('.');
      const sig = byKey.get(scope + (parts.length > 1 ? '.' + parts.slice(0, -1).join('.') : '') + '.' + parts[parts.length - 1]);
      if (!sig) continue;
      nn.bits.forEach((b, i) => { if (typeof b === 'number' && (!bitInfo.has(b) || !nn.hide_name)) bitInfo.set(b, { sig, i }); });
    }
    return bitInfo.size > 0;
  }
  function bitValue(b, time) {
    if (b === '0' || b === '1') return b;
    const info = bitInfo.get(b);
    if (!info) return null;
    const v = Wave.valueAt(info.sig, time);
    if (v == null) return 'x';
    return v.length === 1 ? v : v[v.length - 1 - info.i] || 'x';
  }
  function paint(fresh) {
    const svg = $('cView').querySelector('svg');
    if (!svg) return;
    if (fresh || !bitInfo) {
      const ok = prepare();
      $('cTime').hidden = !ok;
      if (ok) { $('cSlider').max = String(vcd.end); if (t > vcd.end) t = 0; }
    }
    if (!vcd || !bitInfo || !bitInfo.size) { $('cVals').innerHTML = ''; return; }
    $('cSlider').value = String(t);
    $('cNow').textContent = (window.VL_WAVE.tf ? window.VL_WAVE.tf.fmt(t) : t);
    for (const el of svg.querySelectorAll('[class^="net_"]')) {
      const ids = el.getAttribute('class').split(' ')[0].slice(4).split(',').map(x => /^\d+$/.test(x) ? +x : x);
      const vals = ids.map(b => bitValue(b, t)).filter(v => v != null);
      el.classList.remove('sig1', 'sig0', 'sigx');
      if (!vals.length) continue;
      el.classList.add(vals.some(v => v === 'x' || v === 'z') ? 'sigx' : vals.some(v => v === '1') ? 'sig1' : 'sig0');
    }
    // the ports' values in words
    const m = topOf(state.last);
    $('cVals').innerHTML = m.ports.map(p => {
      const s = vcd.signals.find(x => x.scope === scope && x.name.replace(/\[.*$/, '') === p.name);
      const v = s ? Wave.valueAt(s, t) : null;
      if (v == null) return '';
      const txt = Wave.fmt(v, s.width, 'hex');
      return `<span>${p.dir === 'input' ? '→' : '←'} <b>${esc(p.name)}</b>=<span class="${/[xz]/.test(v) ? 'vx' : /1/.test(v) ? 'v1' : ''}">${esc(s.width > 1 ? txt : v)}</span></span>`;
    }).join('');
  }
  function stop() { cancelAnimationFrame(playing); playing = 0; $('cPlay').textContent = '▶ Play'; }
  $('cPlay').onclick = () => {
    if (playing) return stop();
    if (!vcd) return;
    if (t >= vcd.end) t = 0;
    $('cPlay').textContent = '❚❚ Pause';
    const start = performance.now(), from = t, dur = Math.max(4000, Math.min(12000, (vcd.end - from) / Math.max(1, vcd.end) * 9000));
    const step = now => { t = Math.min(vcd.end, from + (vcd.end - from) * (now - start) / dur); paint(); if (t < vcd.end) playing = requestAnimationFrame(step); else stop(); };
    playing = requestAnimationFrame(step);
  };
  $('cSlider').oninput = () => { stop(); t = +$('cSlider').value; paint(); };
  function applyZoom() { const svg = $('cView').querySelector('svg'); if (!svg) return; const w = +svg.getAttribute('width') || svg.viewBox.baseVal.width; svg.style.width = (w * zoom) + 'px'; svg.style.height = 'auto'; }
  $('cIn').onclick = () => { zoom = Math.min(4, zoom * 1.25); applyZoom(); };
  $('cOut').onclick = () => { zoom = Math.max(0.25, zoom / 1.25); applyZoom(); };
  $('cFit').onclick = () => { const svg = $('cView').querySelector('svg'); if (!svg) return; const w = +svg.getAttribute('width') || 600; zoom = Math.min(2, ($('cView').clientWidth - 24) / w); applyZoom(); };
  $('cSvg').onclick = () => { if (!svgText) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml' })); a.download = ($('circSrc').textContent || 'circuit') + '.svg'; a.click(); };
  $('circView').onchange = () => { cacheKey = ''; if (state) build(); };
  // the waveform cursor moves the circuit to that time
  window.addEventListener('vl-cursor', e => { t = e.detail; stop(); paint(); });
  window.VerilogCircuit = { update, refresh: () => state && build() };
  new MutationObserver(() => { if (visible() && state) build(); }).observe($('p-circuit'), { attributes: true, attributeFilter: ['class'] });
})();
