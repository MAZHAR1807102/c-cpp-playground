// The Verilog page: a workspace of projects and files, and results that follow the code as it is typed —
// a waveform (timing diagram), the truth table and logic equations, the circuit, and the console. There is no
// run button: a moment after typing stops the design is compiled and simulated again (verilog-worker.js).
// If the project has a testbench (a module without ports) it drives the simulation; otherwise one is written
// automatically for the module being edited: every input combination, or a clock, a reset and changing inputs.
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const store = { get(k) { try { return localStorage.getItem('ccp.' + k); } catch (_) { return null; } }, set(k, v) { try { localStorage.setItem('ccp.' + k, v); } catch (_) {} } };

  /* ---------- theme ---------- */
  $('theme').value = store.get('theme') || 'system';
  $('theme').onchange = () => {
    const t = $('theme').value;
    store.set('theme', t);
    if (t === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    wave.draw(); wave.names_(); renderCircuit();
  };

  /* ---------- projects ---------- */
  const EXAMPLES = window.VERILOG_EXAMPLES || [];
  let projects = [];
  try { projects = JSON.parse(store.get('vl.projects') || '[]'); } catch (_) {}
  if (!Array.isArray(projects) || !projects.length) projects = [mkProject(EXAMPLES[0].name, EXAMPLES[0].files)];
  let cur = projects.find(p => p.id === store.get('vl.current')) || projects[0];
  function mkProject(name, files) { return { id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, files: files.map(([n, t]) => ({ name: n, text: t })), active: files[0][0] }; }
  let saveTimer = 0;
  function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { store.set('vl.projects', JSON.stringify(projects)); store.set('vl.current', cur.id); }, 300); }

  /* ---------- editor: one document per file, so each keeps its own undo history ---------- */
  const cm = CodeMirror($('editor'), { lineNumbers: true, indentUnit: 4, tabSize: 4, matchBrackets: true, mode: 'text/x-verilog', extraKeys: { Tab: c => c.somethingSelected() ? c.indentSelection('add') : c.replaceSelection('    ') } });
  const docs = new Map();
  function docFor(f) {
    const key = cur.id + '/' + f.name;
    if (!docs.has(key)) docs.set(key, CodeMirror.Doc(f.text, 'text/x-verilog'));
    return docs.get(key);
  }
  function activeFile() { return cur.files.find(f => f.name === cur.active) || cur.files[0]; }
  function openFile(name) {
    cur.active = name;
    const f = activeFile();
    if (!f) { cm.swapDoc(CodeMirror.Doc('', 'text/x-verilog')); $('fname').textContent = '(no file)'; return; }
    cm.swapDoc(docFor(f));
    $('fname').textContent = f.name;
    renderFiles(); markErrors(); save();
  }
  cm.on('changes', () => { const f = activeFile(); if (f) { f.text = cm.getValue(); save(); schedule(400); } });
  cm.on('cursorActivity', () => { const p = cm.getCursor(); $('pos').textContent = `line ${p.line + 1}, column ${p.ch + 1}`; const m = moduleAtCursor(); if (m && m.name !== focus) { focus = m.name; schedule(250); } });

  function renderProjects() {
    $('proj').innerHTML = projects.map(p => `<option value="${p.id}"${p === cur ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  }
  function renderFiles() {
    $('files').innerHTML = cur.files.map(f => `<li data-f="${esc(f.name)}"${f.name === cur.active ? ' aria-current="true"' : ''}><span>${esc(f.name)}</span>${errFiles.has(f.name) ? '<span class="err" title="Has errors">●</span>' : ''}<span class="x"><button type="button" data-act="ren" title="Rename">✎</button><button type="button" data-act="del" title="Delete">✕</button></span></li>`).join('') || '<li class="note">No files</li>';
  }
  $('files').onclick = e => {
    const li = e.target.closest('li[data-f]'); if (!li) return;
    const name = li.dataset.f, act = e.target.closest('button') && e.target.closest('button').dataset.act;
    if (act === 'del') {
      if (!confirm(`Delete ${name}?`)) return;
      cur.files = cur.files.filter(f => f.name !== name); docs.delete(cur.id + '/' + name);
      if (cur.active === name) cur.active = cur.files[0] ? cur.files[0].name : '';
      openFile(cur.active); schedule(0);
    } else if (act === 'ren') {
      const nn = (prompt('New name for ' + name, name) || '').trim();
      if (!nn || nn === name) return;
      if (cur.files.some(f => f.name === nn)) return alert('There is already a file called ' + nn);
      const f = cur.files.find(f => f.name === name), d = docs.get(cur.id + '/' + name);
      f.name = nn; docs.delete(cur.id + '/' + name); if (d) docs.set(cur.id + '/' + nn, d);
      if (cur.active === name) cur.active = nn;
      openFile(cur.active); schedule(0);
    } else if (name !== cur.active) openFile(name);
  };
  function addFile(name, text, open = true) {
    let n = name, i = 2;
    while (cur.files.some(f => f.name === n)) n = name.replace(/(\.\w+)?$/, `_${i++}$1`);
    cur.files.push({ name: n, text });
    if (open) openFile(n); else renderFiles();
    save(); schedule(0);
    return n;
  }
  $('fileNew').onclick = () => {
    const n = (prompt('File name', 'module' + (cur.files.length + 1) + '.v') || '').trim();
    if (!n) return;
    const mod = n.replace(/\.\w+$/, '').replace(/\W/g, '_');
    addFile(/\.\w+$/.test(n) ? n : n + '.v', `module ${mod} (\n    input  wire a,\n    output wire y\n);\n    assign y = ~a;\nendmodule\n`);
  };
  $('proj').onchange = () => { cur = projects.find(p => p.id === $('proj').value) || cur; openFile(cur.active); schedule(0); save(); };
  $('projRen').onclick = () => { const n = (prompt('Project name', cur.name) || '').trim(); if (n) { cur.name = n; renderProjects(); save(); } };
  $('projDel').onclick = () => {
    if (!confirm(`Delete the project "${cur.name}" and its files?`)) return;
    projects = projects.filter(p => p !== cur);
    if (!projects.length) projects.push(mkProject(EXAMPLES[EXAMPLES.length - 1].name, EXAMPLES[EXAMPLES.length - 1].files));
    cur = projects[0]; renderProjects(); openFile(cur.active); schedule(0); save();
  };
  $('newFrom').innerHTML = EXAMPLES.map((e, i) => `<option value="${i}">${esc(e.name)}</option>`).join('');
  $('newFrom').value = String(EXAMPLES.length - 1);
  $('newFrom').onchange = () => { $('newName').value = EXAMPLES[+$('newFrom').value].name; };
  $('projNew').onclick = () => { $('newName').value = 'My circuit'; $('newDlg').showModal(); };
  $('newDlg').addEventListener('close', () => {
    if ($('newDlg').returnValue !== 'ok') return;
    const ex = EXAMPLES[+$('newFrom').value];
    const p = mkProject(($('newName').value || ex.name).trim(), ex.files);
    projects.push(p); cur = p; renderProjects(); openFile(cur.active); schedule(0); save();
  });
  $('fileOpen').onclick = () => $('fileInput').click();
  $('fileInput').onchange = async () => {
    for (const file of $('fileInput').files) {
      if (/\.zip$/i.test(file.name)) {
        const JSZip = await loadZip();
        const z = await JSZip.loadAsync(file);
        for (const [path, entry] of Object.entries(z.files)) if (!entry.dir && /\.(s?v|vh|svh)$/i.test(path)) addFile(path.split('/').pop(), await entry.async('string'), false);
      } else addFile(file.name, await file.text(), false);
    }
    $('fileInput').value = '';
    openFile(cur.files[cur.files.length - 1].name);
  };
  function download(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  $('fileSave').onclick = () => { const f = activeFile(); if (f) download(f.name, new Blob([f.text], { type: 'text/plain' })); };
  const ZIP = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
  function loadZip() { return window.JSZip ? Promise.resolve(window.JSZip) : new Promise((ok, no) => { const s = document.createElement('script'); s.src = ZIP; s.onload = () => ok(window.JSZip); s.onerror = () => no(new Error('could not load JSZip')); document.head.appendChild(s); }); }
  $('projZip').onclick = async () => {
    try { const JSZip = await loadZip(); const z = new JSZip(); for (const f of cur.files) z.file(f.name, f.text); download(cur.name.replace(/[^\w.-]+/g, '_') + '.zip', await z.generateAsync({ type: 'blob' })); }
    catch (e) { alert(e.message); }
  };

  /* ---------- reading the modules: names, ports and widths, parameters, instances ---------- */
  function stripComments(s) {
    return s.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"/g, m => m[0] === '"' ? m : m.replace(/[^\n]/g, ' '));
  }
  function balanced(s, i) {   // s[i] === '(' -> index after the matching ')'
    let d = 0;
    for (let k = i; k < s.length; k++) { if (s[k] === '(') d++; else if (s[k] === ')' && --d === 0) return k + 1; }
    return s.length;
  }
  function splitTop(s) {
    const out = []; let d = 0, last = 0;
    for (let k = 0; k < s.length; k++) { const c = s[k]; if ('([{'.includes(c)) d++; else if (')]}'.includes(c)) d--; else if (c === ',' && !d) { out.push(s.slice(last, k)); last = k + 1; } }
    out.push(s.slice(last));
    return out.map(x => x.trim()).filter(Boolean);
  }
  function evalExpr(e, params, depth = 0) {
    let s = String(e).trim().replace(/(\d+)?'[sS]?([bdhoBDHO])([0-9a-fA-F_xzXZ]+)/g, (_, w, b, v) => String(parseInt(v.replace(/_/g, '').replace(/[xzXZ]/g, '0'), { b: 2, d: 10, h: 16, o: 8 }[b.toLowerCase()])));
    s = s.replace(/\$clog2\s*\(([^()]*)\)/g, (_, x) => String(Math.ceil(Math.log2(Math.max(1, evalExpr(x, params, depth + 1))))));
    s = s.replace(/[A-Za-z_]\w*/g, id => params[id] != null && depth < 8 ? '(' + evalExpr(params[id], params, depth + 1) + ')' : id);
    if (!/^[\d\s+\-*/%()<>=!?:&|^~]*$/.test(s)) return NaN;
    try { return Number(Function('"use strict";return (' + s.replace(/\/(?!\/)/g, '/') + ')')()); } catch (_) { return NaN; }
  }
  const width = (range, params) => {
    if (!range) return 1;
    const m = /\[\s*([^:\]]+)\s*:\s*([^\]]+)\]/.exec(range);
    if (!m) return 1;
    const a = Math.trunc(evalExpr(m[1], params)), b = Math.trunc(evalExpr(m[2], params));
    return Number.isFinite(a) && Number.isFinite(b) ? Math.abs(a - b) + 1 : 1;
  };
  function parseModules(files) {
    const mods = [];
    for (const f of files) {
      const s = stripComments(f.text);
      const re = /\bmodule\s+([A-Za-z_]\w*)/g;
      let m;
      while ((m = re.exec(s))) {
        const name = m[1], start = m.index;
        let i = re.lastIndex;
        const params = {}, ports = [], order = [];
        while (/\s/.test(s[i])) i++;
        if (s[i] === '#') { i++; while (/\s/.test(s[i])) i++; const e = balanced(s, i); for (const p of splitTop(s.slice(i + 1, e - 1))) { const pm = /([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(p.replace(/\b(parameter|localparam|integer|signed|unsigned|real)\b|\[[^\]]*\]/g, ' ')); if (pm) params[pm[1]] = pm[2].trim(); } i = e; while (/\s/.test(s[i])) i++; }
        let header = '';
        if (s[i] === '(') { const e = balanced(s, i); header = s.slice(i + 1, e - 1); i = e; }
        const endM = /\bendmodule\b/g; endM.lastIndex = i;
        const em = endM.exec(s);
        const bodyEnd = em ? em.index : s.length;
        const body = s.slice(i, bodyEnd);
        for (const pm of body.matchAll(/\b(?:parameter|localparam)\b([^;]*);/g)) for (const p of splitTop(pm[1].replace(/\b(integer|signed|unsigned|real)\b|\[[^\]]*\]/g, ' '))) { const x = /([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/.exec(p); if (x) params[x[1]] = x[2].trim(); }
        const ansi = /\b(input|output|inout)\b/.test(header);
        if (ansi) {
          let dir = 'input', range = '';
          for (const item of splitTop(header)) {
            const im = /^(?:(input|output|inout)\b)?\s*(?:(wire|reg|logic|var|tri|integer|signed|unsigned)\b\s*)*(\[[^\]]*\])?\s*([A-Za-z_]\w*)/.exec(item.replace(/\s+/g, ' ').trim());
            if (!im) continue;
            if (im[1]) { dir = im[1]; range = im[3] || ''; } else if (im[3]) range = im[3];
            ports.push({ name: im[4], dir, range, reg: /\breg\b/.test(item) });
          }
        } else {
          for (const n of splitTop(header)) if (/^[A-Za-z_]\w*$/.test(n)) order.push(n);
          for (const dm of body.matchAll(/\b(input|output|inout)\b\s*((?:wire|reg|logic|signed|unsigned)\s+)*(\[[^\]]*\])?\s*([^;]+);/g))
            for (const n of splitTop(dm[4])) { const nm = /^([A-Za-z_]\w*)/.exec(n); if (nm) ports.push({ name: nm[1], dir: dm[1], range: dm[3] || '', reg: /\breg\b/.test(dm[0]) }); }
          ports.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
        }
        for (const p of ports) p.width = width(p.range, params);
        const line = s.slice(0, start).split('\n').length, endLine = s.slice(0, bodyEnd).split('\n').length;
        mods.push({ name, file: f.name, line, endLine, ports, params, body, clocked: /@\s*\(\s*(posedge|negedge)\b/.test(body), insts: [] });
        re.lastIndex = bodyEnd;
      }
    }
    const names = new Set(mods.map(m => m.name));
    for (const m of mods) for (const im of m.body.matchAll(/\b([A-Za-z_]\w*)\s*(?:#\s*\([^;]*?\)\s*)?([A-Za-z_]\w*)\s*\(/g)) if (names.has(im[1]) && im[1] !== m.name) m.insts.push({ type: im[1], name: im[2] });
    return mods;
  }

  /* ---------- what to simulate ---------- */
  let mods = [], focus = null;
  function moduleAtCursor() {
    const f = activeFile(); if (!f) return null;
    const line = cm.getCursor().line + 1;
    return mods.find(m => m.file === f.name && line >= m.line && line <= m.endLine) || mods.find(m => m.file === f.name) || null;
  }
  const isClock = p => p.width === 1 && /^(i_)?(clk|clock|clk_?i|sys_?clk)$/i.test(p.name);
  const isReset = p => p.width === 1 && /^(i_)?(n?rst|reset|n?reset|rst_?n|reset_?n|rstn|areset_?n?|clr|clear)$/i.test(p.name);
  const activeLow = p => /(_n|n)$/i.test(p.name) && !/^(clr|clear)$/i.test(p.name) || /^n/i.test(p.name);
  const inBits = m => m.ports.filter(p => p.dir === 'input').reduce((s, p) => s + p.width, 0);
  const combinational = m => !m.clocked && !m.ports.some(isClock) && !m.insts.some(i => { const t = mods.find(x => x.name === i.type); return t && (t.clocked || t.ports.some(isClock)); });

  // a testbench for a module with ports: every combination (combinational, up to 10 input bits), else a clock,
  // a reset and inputs that change every cycle. Truth-table rows are printed as "\x1eTT <inputs> <outputs>".
  function autoTestbench(m) {
    const ins = m.ports.filter(p => p.dir === 'input'), outs = m.ports.filter(p => p.dir !== 'input');
    const decl = (p, kind) => `    ${kind} ${p.width > 1 ? `[${p.width - 1}:0] ` : ''}${p.name};`;
    const conn = m.ports.map(p => `.${p.name}(${p.name})`).join(', ');
    const L = ['`timescale 1ns/1ps', 'module __pg_tb;'];
    ins.forEach(p => L.push(decl(p, 'reg')));
    outs.forEach(p => L.push(decl(p, 'wire')));
    L.push(`    ${m.name} dut (${conn});`);
    const fmtAll = ins.concat(outs).map(p => `${p.name}=%${p.width > 4 ? 'h' : 'b'}`).join(' ');
    const argsAll = ins.concat(outs).map(p => p.name).join(', ');
    let desc;
    if (combinational(m) && inBits(m) <= 10 && ins.length) {
      const n = inBits(m), rows = 1 << n;
      L.push(`    reg [${n}:0] __i;`);
      L.push('    initial begin');
      L.push('        $dumpfile("wave.vcd"); $dumpvars(0, __pg_tb);');
      L.push(`        for (__i = 0; __i < ${rows}; __i = __i + 1) begin`);
      L.push(`            {${ins.map(p => p.name).join(', ')}} = __i[${n - 1}:0];`);
      L.push('            #10;');
      L.push(`            $display("%cTT %b %b", 8'd30, {${ins.map(p => p.name).join(', ')}}, {${outs.map(p => p.name).join(', ') || "1'b0"}});`);
      if (rows <= 64) L.push(`            $display("${fmtAll}", ${argsAll});`);
      L.push('        end');
      L.push('        $finish;');
      L.push('    end');
      desc = `automatic inputs for ${m.name}: all ${rows} combinations`;
      return { code: L.join('\n') + '\nendmodule\n', desc, truth: true };
    }
    const clk = ins.find(isClock), rst = ins.find(isReset);
    const data = ins.filter(p => p !== clk && p !== rst);
    const cycles = 32;
    if (clk) L.push(`    initial ${clk.name} = 0;`, `    always #5 ${clk.name} = ~${clk.name};`);
    L.push('    integer __c;');
    L.push('    initial begin');
    L.push('        $dumpfile("wave.vcd"); $dumpvars(0, __pg_tb);');
    if (rst) L.push(`        ${rst.name} = ${activeLow(rst) ? 0 : 1};`);
    data.forEach(p => L.push(/^(en|enable|ce|start|go|load|valid)$/i.test(p.name) ? `        ${p.name} = 1;` : `        ${p.name} = 0;`));
    if (rst) L.push(`        #17 ${rst.name} = ${activeLow(rst) ? 1 : 0};`);
    L.push(`        for (__c = 0; __c < ${cycles}; __c = __c + 1) begin`);
    data.filter(p => !/^(en|enable|ce)$/i.test(p.name)).forEach(p => L.push(`            ${p.name} = $random;`));
    L.push(clk ? `            @(negedge ${clk.name});` : '            #10;');
    L.push(`            $display("t=%0t  ${fmtAll}", $time, ${argsAll});`);
    L.push('        end');
    L.push('        $finish;');
    L.push('    end');
    desc = clk ? `automatic inputs for ${m.name}: clock${rst ? ', reset' : ''}${data.length ? ' and random inputs' : ''} for ${cycles} cycles` : `automatic inputs for ${m.name}: ${cycles} random input values`;
    return { code: L.join('\n') + '\nendmodule\n', desc, truth: false };
  }

  /* ---------- simulation (verilog-worker.js) ---------- */
  let worker = null, ready = null, busy = false, pending = false, timer = 0, killer = 0, runId = 0;
  function startWorker() {
    worker = new Worker('verilog-worker.js');
    ready = new Promise((res, rej) => {
      worker.onmessage = ({ data }) => { if (data.type === 'ready') res(); else if (data.type === 'fatal') rej(new Error(data.message)); };
      worker.onerror = e => rej(new Error(e.message || 'the simulator failed to start'));
    });
    worker.postMessage({ type: 'load' });
    return ready;
  }
  function simulate(files, roots, vcd) {
    return new Promise(async res => {
      try { await (ready || startWorker()); } catch (e) { ready = null; return res({ ok: false, stage: 'load', out: [[2, 'Icarus Verilog could not be loaded: ' + e.message + '\n']] }); }
      const w = worker;
      clearTimeout(killer);
      killer = setTimeout(() => { w.terminate(); worker = null; ready = null; res({ ok: false, stage: 'timeout', out: [[2, 'The simulation was stopped after 6 seconds. Does the testbench call $finish? (A clock that runs forever needs one.)\n']] }); }, 6000);
      w.onmessage = ({ data }) => { if (data.type === 'done') { clearTimeout(killer); res(data); } };
      w.postMessage({ type: 'run', files, roots, vcd });
    });
  }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(run, ms); }
  const LIMIT_V = 'module __pg_limit;\n  initial begin #1000000; $display("(stopped at time 1000000: the testbench never calls $finish)"); $finish; end\nendmodule\n';

  let last = null;   // the last results, for the tabs
  async function run() {
    if (busy) { pending = true; return; }
    busy = true; pending = false;
    const id = ++runId;
    setStatus('busy', 'Simulating…');
    mods = parseModules(cur.files);
    renderModules();
    const here = moduleAtCursor();
    focus = here ? here.name : focus;
    const files = cur.files.filter(f => /\.(s?v|vh|svh)$/i.test(f.name)).map(f => ({ path: f.name, data: f.text, include: /\.(vh|svh)$/i.test(f.name) }));
    // the testbench: the project's own (a module without ports), preferring one that uses the module being edited
    const tbs = mods.filter(m => !m.ports.length && m.name !== '__pg_tb');
    const target = mods.find(m => m.name === focus) || mods.find(m => m.ports.length && !mods.some(x => x.insts.some(i => i.type === m.name))) || mods[0];
    let tb = null;
    if (here && !here.ports.length) tb = here;
    else if (tbs.length) tb = tbs.find(t => target && (t.insts.some(i => i.type === target.name) || uses(t, target.name))) || tbs[0];
    let sim, desc, truthRun = null;
    if (tb) {
      const dump = /\$dumpvars/.test(tb.body) ? '' : `module __pg_dump;\n  initial begin $dumpfile("wave.vcd"); $dumpvars(0, ${tb.name}); end\nendmodule\n`;
      const vcdName = (/\$dumpfile\s*\(\s*"([^"]+)"/.exec(tb.body) || [])[1] || 'wave.vcd';
      sim = await simulate([...files, { path: '__pg_extra.v', data: LIMIT_V + dump }], [tb.name, '__pg_limit', ...(dump ? ['__pg_dump'] : [])], vcdName);
      desc = 'testbench ' + tb.name;
      // the truth table of the module being edited still comes from its own run
      if (target && target.ports.length && combinational(target) && inBits(target) <= 10 && inBits(target) > 0 && sim.ok) {
        const t = autoTestbench(target);
        truthRun = await simulate([...files, { path: '__pg_tb.v', data: t.code }], ['__pg_tb'], 'wave.vcd');
      }
    } else if (target && target.ports.length) {
      const t = autoTestbench(target);
      sim = await simulate([...files, { path: '__pg_tb.v', data: t.code }, { path: '__pg_extra.v', data: LIMIT_V }], ['__pg_tb', '__pg_limit'], 'wave.vcd');
      desc = t.desc;
      if (t.truth) truthRun = sim;
    } else {
      sim = files.length ? await simulate(files, null, 'wave.vcd') : { ok: true, out: [], vcd: '' };
      desc = 'the whole project';
    }
    busy = false;
    if (id !== runId) return;
    last = { sim, desc, target, tb, truthRun, mods };
    show();
    if (pending) run();
  }
  const uses = (m, name, seen = new Set()) => { if (seen.has(m.name)) return false; seen.add(m.name); return m.insts.some(i => i.type === name || (mods.find(x => x.name === i.type) && uses(mods.find(x => x.name === i.type), name, seen))); };

  /* ---------- results ---------- */
  function setStatus(kind, text) { $('status').textContent = text; for (const d of ['dotWave', 'dotConsole']) $(d).className = 'dot ' + kind; }
  let errFiles = new Set(), errMarks = [];
  function markErrors() {
    for (const [h, c] of errMarks) cm.removeLineClass(h, 'background', c);
    errMarks = [];
    if (!last) return;
    const f = activeFile(); if (!f) return;
    for (const e of last.errors || []) if (e.file === f.name && e.line >= 1 && e.line <= cm.lineCount()) errMarks.push([cm.addLineClass(e.line - 1, 'background', 'errline'), 'errline']);
  }
  function show() {
    const { sim, desc } = last;
    const text = sim.out.map(([s, t]) => t).join('');
    // errors: "file.v:12: error: ..." / "file.v:12: syntax error"
    last.errors = [];
    for (const m of text.matchAll(/^([^\s:]+\.\w+):(\d+): (.*)$/gm)) if (/error/i.test(m[3]) && !m[1].startsWith('__pg')) last.errors.push({ file: m[1], line: +m[2], msg: m[3] });
    errFiles = new Set(last.errors.map(e => e.file));
    renderFiles(); markErrors();
    // console
    const lines = text.split('\n').filter(l => !l.startsWith('\x1eTT ') && !/^VCD info: dumpfile/.test(l) && !/^__pg_|\$finish called at/.test(l));
    $('console').innerHTML = (sim.ok ? `<span class="m">${esc(desc)} · simulated in ${Math.round(sim.ms || 0)} ms</span>\n` : '') +
      lines.map(l => { const m = /^([^\s:]+\.\w+):(\d+): (.*)$/.exec(l); return m && !m[1].startsWith('__pg') ? `<span class="${/error/i.test(m[3]) ? 'e' : ''}"><span class="ln" data-f="${esc(m[1])}" data-l="${m[2]}">${esc(m[1])}:${m[2]}</span>: ${esc(m[3])}</span>` : (/^(The simulation was stopped|Icarus|\(stopped)/.test(l) ? `<span class="e">${esc(l)}</span>` : esc(l)); }).join('\n');
    // waveform
    const vcd = sim.vcd ? Wave.parseVCD(sim.vcd) : null;
    if (vcd) {
      // the testbench's own signals first; the automatic testbench's loop counter is hidden
      vcd.signals = vcd.signals.filter(s => !/^__/.test(s.name) && !/^__pg_(limit|dump)/.test(s.scope));
      wave.show(vcd, { animate: true, keepView: true });
      $('waveSrc').textContent = desc;
    }
    if (!sim.ok) {
      const stage = sim.stage === 'compile' || sim.stage === 'preprocess' ? 'Errors in the code' : sim.stage === 'timeout' ? 'Stopped: too long' : 'The simulation failed';
      setStatus('err', stage + (last.errors[0] ? ` · ${last.errors[0].file}:${last.errors[0].line}` : ''));
      if (!vcd) { $('wave').classList.add('stale'); }
      if (!vcd && !wave.data) $('waveSrc').textContent = '—';
    } else setStatus('ok', `${desc} · ${Math.round(sim.ms || 0)} ms`);
    renderLogic();
    renderCircuit();
  }
  $('console').onclick = e => {
    const l = e.target.closest('.ln'); if (!l) return;
    if (l.dataset.f !== cur.active && cur.files.some(f => f.name === l.dataset.f)) openFile(l.dataset.f);
    cm.setCursor({ line: +l.dataset.l - 1, ch: 0 }); cm.focus();
  };
  function renderModules() {
    if (!mods.length) { $('mods').innerHTML = ''; return; }
    const top = mods.filter(m => !mods.some(x => x.insts.some(i => i.type === m.name)));
    $('mods').innerHTML = '<b>Modules</b>' + mods.map(m => `<span title="${esc(m.file)}:${m.line}">${esc(m.name)} ${!m.ports.length ? '<i>testbench</i>' : top.includes(m) && m.insts.length ? '<i>top</i>' : ''}${m.ports.length ? ` <i>${m.ports.filter(p => p.dir === 'input').length} in · ${m.ports.filter(p => p.dir !== 'input').length} out</i>` : ''}</span>`).join('');
  }

  /* ---------- waveform ---------- */
  const wave = new Wave.View($('wave'));
  window.VL_WAVE = wave;
  $('wave').insertAdjacentHTML('afterbegin', '');
  $('radix').value = store.get('vl.radix') || 'hex';
  wave.setRadix($('radix').value);
  $('radix').onchange = () => { store.set('vl.radix', $('radix').value); wave.setRadix($('radix').value); };
  $('wReplay').onclick = () => wave.replay();
  $('wFit').onclick = () => wave.fit();
  $('wIn').onclick = () => wave.zoom(0.6);
  $('wOut').onclick = () => wave.zoom(1 / 0.6);
  $('wAll').onclick = () => wave.showAll();
  $('wPng').onclick = () => { const a = document.createElement('a'); a.href = wave.png(); a.download = 'timing-diagram.png'; a.click(); };

  /* ---------- logic: the truth table of the module being edited, its equations, and a designer ---------- */
  function truthOf(run, m) {
    if (!run || !run.ok) return null;
    const ins = m.ports.filter(p => p.dir === 'input'), outs = m.ports.filter(p => p.dir !== 'input');
    const inNames = [], outNames = [];
    for (const p of ins) for (let b = p.width - 1; b >= 0; b--) inNames.push(p.width > 1 ? `${p.name}[${b}]` : p.name);
    for (const p of outs) for (let b = p.width - 1; b >= 0; b--) outNames.push(p.width > 1 ? `${p.name}[${b}]` : p.name);
    const rows = [];
    for (const [, t] of run.out) for (const line of t.split('\n')) { const mm = /^\x1eTT ([01xz]+) ([01xz]+)/.exec(line); if (mm) rows.push([mm[1], mm[2]]); }
    if (!rows.length) return null;
    return { inNames, outNames, rows };
  }
  let designer = null;
  try { designer = JSON.parse(store.get('vl.designer') || 'null'); } catch (_) {}
  if (!designer || !Array.isArray(designer.inputs)) designer = { inputs: ['A', 'B', 'C'], outputs: [{ name: 'Y', values: [0, 1, 1, 0, 1, 0, 0, 1] }], form: 'sop', name: 'my_logic' };
  function kmap(names, values) {
    const n = names.length;
    if (n < 2 || n > 4) return '';
    const gray = k => k ^ (k >> 1);
    const rb = n === 2 ? 1 : n === 3 ? 1 : 2, cb = n - rb;
    const R = 1 << rb, C = 1 << cb;
    const lbl = (k, bits) => gray(k).toString(2).padStart(bits, '0');
    let h = `<div class="kmap" style="grid-template-columns:auto repeat(${C},34px)"><span class="h">${esc(names.slice(0, rb).join(''))}\\${esc(names.slice(rb).join(''))}</span>`;
    for (let c = 0; c < C; c++) h += `<span class="h">${lbl(c, cb)}</span>`;
    for (let r = 0; r < R; r++) {
      h += `<span class="h">${lbl(r, rb)}</span>`;
      for (let c = 0; c < C; c++) { const idx = (gray(r) << cb) | gray(c), v = values[idx]; h += `<span class="${v === 1 || v === '1' ? 'one' : v === 0 || v === '0' ? '' : 'x'}" title="row ${idx}">${v === 1 || v === '1' ? 1 : v === 0 || v === '0' ? 0 : 'X'}</span>`; }
    }
    return h + '</div>';
  }
  function eqBlock(name, names, values) {
    const r = Logic.minimize(names, values);
    return `<div class="eq"><span class="nm">${esc(name)}</span>
      <div class="f"><small>SOP</small> ${esc(name)} = ${esc(r.sop.math)}</div>
      <div class="f"><small>POS</small> ${esc(name)} = ${esc(r.pos.math)}</div>
      <div class="f"><small>Σ / Π</small> ${esc(r.canonSop)} &nbsp; ${esc(r.canonPos)}</div>
      <div class="f"><small>Verilog</small> assign ${esc(name.replace(/\[(\d+)\]/, '_$1'))} = ${esc(r.sop.v)};</div>
      ${kmap(names, values)}</div>`;
  }
  function renderLogic() {
    const el = $('logic');
    let html = '';
    const m = last && last.target;
    const t = m && last.truthRun ? truthOf(last.truthRun, m) : null;
    if (m && t) {
      const n = t.inNames.length, shown = t.rows.slice(0, 256);
      html += `<div><h3>Truth table of ${esc(m.name)}</h3><p class="sub">Found by simulating every combination of the ${n} input bit${n > 1 ? 's' : ''}${t.rows.length > 256 ? ` (the first 256 of ${t.rows.length} rows are shown)` : ''}.</p></div>`;
      html += `<div style="overflow:auto"><table class="tt"><tr>${t.inNames.map(x => `<th>${esc(x)}</th>`).join('')}${t.outNames.map(x => `<th class="o">${esc(x)}</th>`).join('')}</tr>` +
        shown.map(([a, b], i) => `<tr${i && i % 8 === 0 && n > 3 ? ' class="sep"' : ''}>${[...a].map(c => `<td>${c}</td>`).join('')}${[...b].map(c => `<td class="o ${c === '1' ? 'one' : c === '0' ? '' : 'x'}">${c}</td>`).join('')}</tr>`).join('') + '</table></div>';
      if (n <= 8) {
        html += '<div><h3>Logic equations</h3><p class="sub">Minimised with the Quine–McCluskey method: sum of products (SOP), product of sums (POS), the canonical forms, and a Karnaugh map for up to 4 inputs.</p></div>';
        t.outNames.forEach((o, k) => {
          const vals = Array(1 << n).fill('x');
          for (const [a, b] of t.rows) vals[parseInt(a.replace(/[xz]/g, '0'), 2)] = b[k] === '1' ? 1 : b[k] === '0' ? 0 : 'x';
          html += eqBlock(o, t.inNames, vals);
        });
      } else html += `<p class="note">With ${n} input bits the equations would be very long; they are worked out for up to 8 input bits.</p>`;
    } else if (m && m.ports.length && !combinational(m)) {
      html += `<div><h3>${esc(m.name)} has a clock</h3><p class="sub">A truth table describes combinational logic (outputs that depend only on the inputs at that moment). This module stores state, so its behaviour is shown in the Waveform tab. Put the cursor in a combinational module (one with <code>assign</code> or <code>always @(*)</code>) to see its truth table.</p></div>`;
    } else if (m && m.ports.length && inBits(m) > 10) {
      html += `<div><h3>${esc(m.name)}</h3><p class="sub">${inBits(m)} input bits would make a truth table of ${2 ** inBits(m)} rows; truth tables are made for up to 10 input bits.</p></div>`;
    } else if (last && last.sim && !last.sim.ok) {
      html += '<p class="note err">Fix the errors (see the Console tab) to see the truth table.</p>';
    } else html += '<p class="note">Put the cursor in a module with inputs and outputs to see its truth table and logic equations.</p>';
    html += designerHtml();
    el.innerHTML = html;
    wireDesigner();
    $('dotLogic').className = 'dot ' + (t ? 'ok' : '');
  }
  function designerHtml() {
    const d = designer, n = d.inputs.length, rows = 1 << n;
    let h = `<div class="designer"><div><h3>Design from a truth table</h3><p class="sub">Type the inputs and outputs, click the output cells (0 → 1 → X don't-care), or type a formula such as <code>A'B + AC</code>. The equations and the Verilog module update as you go.</p></div>
      <div class="row"><label class="f">Inputs <input type="text" id="dIn" value="${esc(d.inputs.join(', '))}" style="width:150px"></label>
      <label class="f">Outputs <input type="text" id="dOut" value="${esc(d.outputs.map(o => o.name).join(', '))}" style="width:110px"></label>
      <label class="f">Module <input type="text" id="dName" value="${esc(d.name)}" style="width:110px"></label>
      <label class="f">Form <select id="dForm"><option value="sop">sum of products</option><option value="pos">product of sums</option></select></label></div>
      <div class="row"><label class="f">Formula for ${esc(d.outputs[0].name)} <input type="text" id="dExpr" placeholder="e.g. A'B + AC  or  A ^ B ^ C" style="width:220px"></label><span class="note" id="dExprMsg"></span></div>
      <div style="overflow:auto"><table class="tt"><tr><th>#</th>${d.inputs.map(x => `<th>${esc(x)}</th>`).join('')}${d.outputs.map(o => `<th class="o">${esc(o.name)}</th>`).join('')}</tr>`;
    for (let r = 0; r < rows; r++) {
      h += `<tr><td class="note">${r}</td>${d.inputs.map((_, k) => `<td>${(r >> (n - 1 - k)) & 1}</td>`).join('')}`;
      d.outputs.forEach((o, k) => { const v = o.values[r]; h += `<td class="o click ${v === 1 ? 'one' : v === 0 ? '' : 'x'}" data-o="${k}" data-r="${r}">${v === 1 ? 1 : v === 0 ? 0 : 'X'}</td>`; });
      h += '</tr>';
    }
    h += '</table></div>';
    h += d.outputs.map(o => eqBlock(o.name, d.inputs, o.values)).join('');
    const gen = Logic.toVerilog(d.name, d.inputs, d.outputs, d.form);
    h += `<div class="row"><b>Verilog</b><button class="btn small primary" type="button" id="dAdd">Add to the project</button><span class="note">adds ${esc(d.name)}.v and a testbench that checks every row</span></div><pre class="code">${esc(gen.code)}</pre></div>`;
    return h;
  }
  function saveDesigner() { store.set('vl.designer', JSON.stringify(designer)); }
  function wireDesigner() {
    if (!$('dIn')) return;
    $('dForm').value = designer.form;
    const names = s => s.split(/[\s,]+/).map(x => x.trim()).filter(Boolean);
    const refresh = (focusId) => { saveDesigner(); const sel = focusId && $(focusId) ? [$(focusId).selectionStart] : null; renderLogic(); if (focusId && $(focusId)) { $(focusId).focus(); if (sel) $(focusId).setSelectionRange(sel[0], sel[0]); } };
    $('dIn').onchange = () => {
      const ins = names($('dIn').value).filter(Logic.ident).slice(0, 6);
      if (!ins.length) return;
      const rows = 1 << ins.length;
      designer.inputs = ins;
      designer.outputs.forEach(o => { o.values = Array.from({ length: rows }, (_, i) => o.values[i] ?? 0); });
      refresh();
    };
    $('dOut').onchange = () => {
      const outs = names($('dOut').value).filter(Logic.ident).slice(0, 6);
      if (!outs.length) return;
      const rows = 1 << designer.inputs.length;
      designer.outputs = outs.map((n, i) => designer.outputs[i] ? { name: n, values: designer.outputs[i].values } : { name: n, values: Array(rows).fill(0) });
      refresh();
    };
    $('dName').onchange = () => { const v = $('dName').value.trim(); if (Logic.ident(v)) { designer.name = v; refresh(); } };
    $('dForm').onchange = () => { designer.form = $('dForm').value; refresh(); };
    $('dExpr').onkeydown = e => {
      if (e.key !== 'Enter') return;
      try { designer.outputs[0].values = Logic.tableFromExpression($('dExpr').value, designer.inputs); const v = $('dExpr').value; refresh(); $('dExpr').value = v; $('dExprMsg').textContent = 'Filled from the formula.'; }
      catch (err) { $('dExprMsg').textContent = err.message; $('dExprMsg').className = 'note err'; }
    };
    $('dExpr').placeholder += ' — press Enter';
    $('logic').querySelectorAll('td.click').forEach(td => td.onclick = () => {
      const o = designer.outputs[+td.dataset.o], r = +td.dataset.r, v = o.values[r];
      o.values[r] = v === 0 ? 1 : v === 1 ? 'x' : 0;
      const top = $('logic').scrollTop; refresh(); $('logic').scrollTop = top;
    });
    $('dAdd').onclick = () => {
      const gen = Logic.toVerilog(designer.name, designer.inputs, designer.outputs, designer.form);
      addFile(designer.name + '.v', gen.code, true);
      addFile(designer.name + '_tb.v', Logic.testbench(designer.name, designer.inputs, designer.outputs), false);
      selectTab('wave');
    };
  }

  /* ---------- circuit (filled in by verilog-circuit.js when it is loaded) ---------- */
  function renderCircuit() { if (window.VerilogCircuit) window.VerilogCircuit.update(last, cur); }

  /* ---------- tabs ---------- */
  function selectTab(t) {
    document.querySelectorAll('.tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
    document.querySelectorAll('.panel').forEach(p => p.classList.toggle('on', p.id === 'p-' + t));
    store.set('vl.tab', t);
    if (t === 'wave') requestAnimationFrame(() => wave.draw());
    if (t === 'circuit') renderCircuit();
  }
  document.querySelector('.tabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) selectTab(b.dataset.tab); };
  selectTab(store.get('vl.tab') || 'wave');

  window.VL = { cm, get last() { return last; }, get project() { return cur; }, parseModules, setCircuitDot: k => { $('dotCircuit').className = 'dot ' + k; } };
  renderProjects();
  openFile(cur.active);
  run();
})();
