// Draw a circuit, get Verilog: a canvas of logic gates (AND, OR, NOT, NAND, NOR, XOR, XNOR, buffer), a 2:1 multiplexer,
// a D flip-flop, inputs, a clock, constants and outputs. Wires are drawn by dragging from an output (●) to an input.
// The circuit runs as it is drawn: click an input to switch it, "Tick" pulses the clock, wires show 1 (green) and 0.
// The Verilog module is written live (gate primitives or assign statements), with the truth table and the simplest
// equations (logic.js), and "Add to project" puts it into the Verilog workspace, where it is simulated, drawn as
// waves and synthesised like any other file (verilog.js exposes VL.putFile).
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const KEY = 'ccp.vl.designs';
  const G = 10, snap = v => Math.round(v / G) * G;
  const GATES = ['and', 'or', 'nand', 'nor', 'xor', 'xnor'];
  const KW = new Set('always and assign begin buf bufif0 bufif1 case casex casez cmos deassign default defparam disable edge else end endcase endfunction endmodule endprimitive endspecify endtable endtask event for force forever fork function highz0 highz1 if ifnone initial inout input integer join large macromodule medium module nand negedge nmos nor not notif0 notif1 or output parameter pmos posedge primitive pull0 pull1 pulldown pullup rcmos real realtime reg release repeat rnmos rpmos rtran rtranif0 rtranif1 scalared small specify specparam strong0 strong1 supply0 supply1 table task time tran tranif0 tranif1 tri tri0 tri1 triand trior trireg vectored wait wand weak0 weak1 while wire wor xnor xor logic bit byte int'.split(' '));
  const ident = s => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s) && !KW.has(s);

  /* ---------------- the parts: size, ports (x, y inside the part), how they look ---------------- */
  const LABEL = { in: 'Input', clk: 'Clock', out: 'Output', c0: 'Constant 0', c1: 'Constant 1', not: 'NOT', buf: 'Buffer', and: 'AND', or: 'OR', nand: 'NAND', nor: 'NOR', xor: 'XOR', xnor: 'XNOR', mux: '2:1 MUX', dff: 'D flip-flop' };
  const HELP = {
    in: 'A switch: click it to change between 0 and 1', clk: 'A clock input: "Tick" sends one pulse', out: 'An output (lights up when 1)',
    c0: 'Always 0', c1: 'Always 1', not: 'Output is the opposite of the input', buf: 'Output equals the input',
    and: '1 only when every input is 1', or: '1 when any input is 1', nand: 'NOT AND: 0 only when every input is 1', nor: 'NOT OR: 1 only when every input is 0',
    xor: '1 when an odd number of inputs are 1', xnor: '1 when an even number of inputs are 1', mux: 'y = s ? 1-input : 0-input', dff: 'Q takes the value of D at each rising clock edge'
  };
  function size(p) {
    if (GATES.includes(p.t)) return [60, Math.max(40, (p.n || 2) * 20)];
    return { in: [60, 40], clk: [60, 40], out: [60, 40], c0: [40, 40], c1: [40, 40], not: [60, 40], buf: [60, 40], mux: [50, 60], dff: [70, 60] }[p.t];
  }
  function ports(p) {   // { ins: [[name, x, y]], outs: [[name, x, y]] }
    const [w, h] = size(p);
    if (GATES.includes(p.t)) return { ins: Array.from({ length: p.n || 2 }, (_, i) => ['i' + i, 0, 10 + i * 20]), outs: [['y', w, h / 2]] };
    switch (p.t) {
      case 'in': case 'clk': case 'c0': case 'c1': return { ins: [], outs: [['y', w, 20]] };
      case 'out': return { ins: [['a', 0, 20]], outs: [] };
      case 'not': case 'buf': return { ins: [['a', 0, 20]], outs: [['y', w, 20]] };
      case 'mux': return { ins: [['a', 0, 20], ['b', 0, 40], ['s', 20, 60]], outs: [['y', w, 30]] };
      case 'dff': return { ins: [['d', 0, 20], ['clk', 0, 40]], outs: [['q', w, 20], ['qn', w, 40]] };
    }
    return { ins: [], outs: [] };
  }
  const orBackX = (y, h, x0) => x0 + 24 * (y / h) * (1 - y / h);
  function shape(p, val) {   // SVG for the part's body, in its own coordinates
    const [w, h] = size(p), t = p.t;
    let s = '';
    const stub = (x1, y, x2) => `<line class="st" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/>`;
    const bubble = x => `<circle class="bd" cx="${x}" cy="${h / 2}" r="4"/>`;
    if (t === 'and' || t === 'nand') {
      const e = t === 'and' ? 52 : 44;
      s += `<path class="bd" d="M8 0 H${e - 22} A22 ${h / 2} 0 0 1 ${e - 22} ${h} H8 Z"/>`;
      if (t === 'nand') s += bubble(e + 4);
      for (const [, , y] of ports(p).ins) s += stub(0, y, 8);
      s += stub(t === 'and' ? 52 : 52, h / 2, w);
    } else if (t === 'or' || t === 'nor' || t === 'xor' || t === 'xnor') {
      const x0 = t === 'xor' || t === 'xnor' ? 10 : 6, e = t === 'or' || t === 'xor' ? 52 : 44;
      s += `<path class="bd" d="M${x0} 0 Q${e - 14} 0 ${e} ${h / 2} Q${e - 14} ${h} ${x0} ${h} Q${x0 + 12} ${h / 2} ${x0} 0 Z"/>`;
      if (t === 'xor' || t === 'xnor') s += `<path class="ln" d="M${x0 - 6} 0 Q${x0 + 6} ${h / 2} ${x0 - 6} ${h}"/>`;
      if (t === 'nor' || t === 'xnor') s += bubble(e + 4);
      for (const [, , y] of ports(p).ins) s += stub(0, y, orBackX(y, h, x0) + (t === 'xor' || t === 'xnor' ? -6 : 0));
      s += stub(52, h / 2, w);
    } else if (t === 'not' || t === 'buf') {
      s += `<path class="bd" d="M10 4 L${t === 'not' ? 44 : 50} 20 L10 36 Z"/>` + (t === 'not' ? '<circle class="bd" cx="48" cy="20" r="4"/>' : '');
      s += stub(0, 20, 10) + stub(t === 'not' ? 52 : 50, 20, w);
    } else if (t === 'mux') {
      s += `<path class="bd" d="M8 0 L42 12 L42 48 L8 60 Z"/><text class="pl" x="13" y="24">0</text><text class="pl" x="13" y="44">1</text><text class="pl" x="22" y="55">s</text>`;
      s += stub(0, 20, 8) + stub(0, 40, 8) + stub(42, 30, w) + `<line class="st" x1="20" y1="54" x2="20" y2="60"/>`;
    } else if (t === 'dff') {
      s += `<rect class="bd" x="8" y="0" width="54" height="60" rx="3"/><text class="pl" x="13" y="24">D</text><path class="ln" d="M8 34 L15 40 L8 46"/><text class="pl" x="44" y="24">Q</text><text class="pl" x="44" y="44">Q̅</text>`;
      s += stub(0, 20, 8) + stub(0, 40, 8) + stub(62, 20, w) + stub(62, 40, w);
      s += `<text class="pv" x="35" y="74" text-anchor="middle">${val && val.q != null ? 'Q=' + val.q : ''}</text>`;
    } else if (t === 'in' || t === 'clk') {
      const v = p.v ? 1 : 0;
      s += `<rect class="sw ${v ? 'on' : ''}" x="0" y="4" width="42" height="32" rx="7"/>`;
      s += t === 'clk' ? `<path class="ck ${v ? 'on' : ''}" d="M7 27 H14 V13 H21 V27 H28 V13 H35"/>` : `<text class="sv ${v ? 'on' : ''}" x="21" y="26" text-anchor="middle">${v}</text>`;
      s += stub(42, 20, w) + `<text class="nm" x="21" y="-4" text-anchor="middle">${esc(p.name || '')}</text>`;
    } else if (t === 'out') {
      const v = val && val.a;
      s += stub(0, 20, 22) + `<circle class="led ${v === 1 ? 'on' : v === 'x' ? 'x' : ''}" cx="36" cy="20" r="14"/><text class="sv ${v === 1 ? 'on' : ''}" x="36" y="26" text-anchor="middle">${v === 'x' || v == null ? '?' : v}</text>`;
      s += `<text class="nm" x="36" y="-4" text-anchor="middle">${esc(p.name || '')}</text>`;
    } else if (t === 'c0' || t === 'c1') {
      s += `<rect class="bd" x="2" y="6" width="26" height="28" rx="4"/><text class="sv" x="15" y="26" text-anchor="middle">${t === 'c1' ? 1 : 0}</text>` + stub(28, 20, w);
    }
    if (GATES.includes(t) || t === 'not' || t === 'buf') s += `<text class="gl" x="${w / 2}" y="${h + 12}" text-anchor="middle">${LABEL[t]}</text>`;
    return s;
  }
  function icon(t) {   // the palette picture
    const p = { t, n: 2, v: 0, name: '' };
    const [w, h] = size(p);
    return `<svg viewBox="-4 -6 ${w + 8} ${h + 12}" aria-hidden="true">${shape(p, null).replace(/<text class="(gl|nm|pv)"[^>]*>[^<]*<\/text>/g, '')}</svg>`;
  }

  /* ---------------- designs (saved in localStorage) ---------------- */
  let db = { list: [], current: '' };
  try { db = JSON.parse(localStorage.getItem(KEY) || 'null') || db; } catch (_) {}
  if (!Array.isArray(db.list)) db.list = [];
  const uid = () => Math.random().toString(36).slice(2, 8);
  const newDesign = (name, parts = [], wires = []) => ({ id: 'd' + Date.now().toString(36) + uid(), name, parts, wires, style: 'prim' });
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (_) {} }
  let saveT = 0;
  const saveSoon = () => { clearTimeout(saveT); saveT = setTimeout(persist, 250); };

  /* ---------------- examples ---------------- */
  function ex(name, parts, wires) {
    return () => {
      const ids = {};
      const ps = parts.map(([k, t, x, y, o]) => { const p = Object.assign({ id: uid(), t, x, y }, o || {}); ids[k] = p.id; return p; });
      const ws = wires.map(([a, ap, b, bp]) => ({ id: uid(), from: { p: ids[a], port: ap }, to: { p: ids[b], port: bp } }));
      return newDesign(name, ps, ws);
    };
  }
  const EXAMPLES = [
    ['Empty', () => newDesign('my_circuit')],
    ['Half adder', ex('half_adder',
      [['a', 'in', 40, 40, { name: 'a' }], ['b', 'in', 40, 130, { name: 'b' }], ['x', 'xor', 200, 40, { n: 2 }], ['n', 'and', 200, 130, { n: 2 }], ['s', 'out', 360, 50, { name: 'sum' }], ['c', 'out', 360, 140, { name: 'carry' }]],
      [['a', 'y', 'x', 'i0'], ['b', 'y', 'x', 'i1'], ['a', 'y', 'n', 'i0'], ['b', 'y', 'n', 'i1'], ['x', 'y', 's', 'a'], ['n', 'y', 'c', 'a']])],
    ['Full adder', ex('full_adder',
      [['a', 'in', 30, 40, { name: 'a' }], ['b', 'in', 30, 120, { name: 'b' }], ['ci', 'in', 30, 230, { name: 'cin' }],
        ['x1', 'xor', 180, 50, { n: 2 }], ['x2', 'xor', 340, 100, { n: 2 }], ['a1', 'and', 180, 160, { n: 2 }], ['a2', 'and', 340, 210, { n: 2 }], ['o', 'or', 490, 180, { n: 2 }],
        ['s', 'out', 500, 90, { name: 'sum' }], ['co', 'out', 620, 180, { name: 'cout' }]],
      [['a', 'y', 'x1', 'i0'], ['b', 'y', 'x1', 'i1'], ['x1', 'y', 'x2', 'i0'], ['ci', 'y', 'x2', 'i1'], ['a', 'y', 'a1', 'i0'], ['b', 'y', 'a1', 'i1'],
        ['x1', 'y', 'a2', 'i0'], ['ci', 'y', 'a2', 'i1'], ['a1', 'y', 'o', 'i0'], ['a2', 'y', 'o', 'i1'], ['x2', 'y', 's', 'a'], ['o', 'y', 'co', 'a']])],
    ['2:1 multiplexer from gates', ex('mux2',
      [['d0', 'in', 30, 40, { name: 'd0' }], ['d1', 'in', 30, 140, { name: 'd1' }], ['s', 'in', 30, 240, { name: 's' }], ['n', 'not', 160, 240],
        ['g0', 'and', 300, 50, { n: 2 }], ['g1', 'and', 300, 150, { n: 2 }], ['o', 'or', 440, 100, { n: 2 }], ['y', 'out', 580, 100, { name: 'y' }]],
      [['d0', 'y', 'g0', 'i0'], ['n', 'y', 'g0', 'i1'], ['d1', 'y', 'g1', 'i0'], ['s', 'y', 'g1', 'i1'], ['s', 'y', 'n', 'a'], ['g0', 'y', 'o', 'i0'], ['g1', 'y', 'o', 'i1'], ['o', 'y', 'y', 'a']])],
    ['Majority of three', ex('majority3',
      [['a', 'in', 30, 40, { name: 'a' }], ['b', 'in', 30, 130, { name: 'b' }], ['c', 'in', 30, 220, { name: 'c' }],
        ['g0', 'and', 200, 40, { n: 2 }], ['g1', 'and', 200, 120, { n: 2 }], ['g2', 'and', 200, 200, { n: 2 }], ['o', 'or', 360, 110, { n: 3 }], ['y', 'out', 500, 120, { name: 'y' }]],
      [['a', 'y', 'g0', 'i0'], ['b', 'y', 'g0', 'i1'], ['b', 'y', 'g1', 'i0'], ['c', 'y', 'g1', 'i1'], ['a', 'y', 'g2', 'i0'], ['c', 'y', 'g2', 'i1'],
        ['g0', 'y', 'o', 'i0'], ['g1', 'y', 'o', 'i1'], ['g2', 'y', 'o', 'i2'], ['o', 'y', 'y', 'a']])],
    ['SR latch (two NOR gates)', ex('sr_latch',
      [['r', 'in', 30, 40, { name: 'r' }], ['s', 'in', 30, 180, { name: 's' }], ['n1', 'nor', 200, 50, { n: 2 }], ['n2', 'nor', 200, 160, { n: 2 }], ['q', 'out', 360, 60, { name: 'q' }], ['qn', 'out', 360, 170, { name: 'q_n' }]],
      [['r', 'y', 'n1', 'i0'], ['n2', 'y', 'n1', 'i1'], ['n1', 'y', 'n2', 'i0'], ['s', 'y', 'n2', 'i1'], ['n1', 'y', 'q', 'a'], ['n2', 'y', 'qn', 'a']])],
    ['2-bit counter (flip-flops)', ex('counter2',
      [['clk', 'clk', 30, 150, { name: 'clk' }], ['f0', 'dff', 200, 40], ['f1', 'dff', 200, 160], ['x', 'xor', 60, 230, { n: 2 }], ['q0', 'out', 380, 40, { name: 'q0' }], ['q1', 'out', 380, 160, { name: 'q1' }]],
      [['clk', 'y', 'f0', 'clk'], ['clk', 'y', 'f1', 'clk'], ['f0', 'qn', 'f0', 'd'], ['f0', 'q', 'x', 'i0'], ['f1', 'q', 'x', 'i1'], ['x', 'y', 'f1', 'd'], ['f0', 'q', 'q0', 'a'], ['f1', 'q', 'q1', 'a']])]
  ];
  if (!db.list.length) { const d = EXAMPLES[1][1](); db.list.push(d); db.current = d.id; }
  let D = db.list.find(d => d.id === db.current) || db.list[0];

  /* ---------------- simulation (0, 1 or 'x' for unknown) ---------------- */
  let vals = new Map();   // 'partId.port' (outputs) -> value; kept between runs, so latches remember
  const AND = a => a.includes(0) ? 0 : a.includes('x') ? 'x' : 1;
  const OR = a => a.includes(1) ? 1 : a.includes('x') ? 'x' : 0;
  const XOR = a => a.includes('x') ? 'x' : a.reduce((s, v) => s ^ v, 0);
  const NOT = v => v === 'x' ? 'x' : 1 - v;
  function drivers(d) { const m = new Map(); for (const w of d.wires) m.set(w.to.p + '.' + w.to.port, w.from.p + '.' + w.from.port); return m; }
  function settle(d, vm, drv) {
    const byId = new Map(d.parts.map(p => [p.id, p]));
    const inV = (p, port) => { const k = drv.get(p.id + '.' + port); return k && byId.has(k.split('.')[0]) ? (vm.has(k) ? vm.get(k) : 'x') : 'x'; };
    let stable = false;
    for (let pass = 0; pass < d.parts.length * 2 + 8 && !stable; pass++) {
      stable = true;
      for (const p of d.parts) {
        const set = (port, v) => { const k = p.id + '.' + port; if (vm.get(k) !== v) { vm.set(k, v); stable = false; } };
        const ins = () => ports(p).ins.map(([n]) => inV(p, n));
        switch (p.t) {
          case 'in': case 'clk': set('y', p.v ? 1 : 0); break;
          case 'c0': set('y', 0); break; case 'c1': set('y', 1); break;
          case 'not': set('y', NOT(inV(p, 'a'))); break;
          case 'buf': set('y', inV(p, 'a')); break;
          case 'and': set('y', AND(ins())); break; case 'nand': set('y', NOT(AND(ins()))); break;
          case 'or': set('y', OR(ins())); break; case 'nor': set('y', NOT(OR(ins()))); break;
          case 'xor': set('y', XOR(ins())); break; case 'xnor': set('y', NOT(XOR(ins()))); break;
          case 'mux': { const s = inV(p, 's'), a = inV(p, 'a'), b = inV(p, 'b'); set('y', s === 0 ? a : s === 1 ? b : a === b ? a : 'x'); break; }
          case 'dff': { const q = p.q == null ? 0 : p.q; set('q', q); set('qn', NOT(q)); break; }
        }
      }
    }
    return { stable, inV };
  }
  function simulate() {
    const drv = drivers(D);
    const ids = new Set(D.parts.map(p => p.id));
    for (const k of [...vals.keys()]) if (!ids.has(k.split('.')[0])) vals.delete(k);
    let r = settle(D, vals, drv);
    // flip-flops: a rising edge on the clock input copies D to Q (all at once), then the logic settles again
    for (let round = 0; round < 4; round++) {
      const edges = D.parts.filter(p => p.t === 'dff').map(p => { const c = r.inV(p, 'clk'); const e = p.lc === 0 && c === 1; p.lc = c; return e ? [p, r.inV(p, 'd')] : null; }).filter(Boolean);
      if (!edges.length) break;
      for (const [p, dv] of edges) p.q = dv;
      r = settle(D, vals, drv);
    }
    return r;
  }
  function truthTable(d) {   // combinational circuits only
    const ins = d.parts.filter(p => p.t === 'in').sort((a, b) => a.y - b.y || a.x - b.x);
    const outs = d.parts.filter(p => p.t === 'out').sort((a, b) => a.y - b.y || a.x - b.x);
    if (d.parts.some(p => p.t === 'dff' || p.t === 'clk')) return { memory: true, ins, outs };
    if (!ins.length || !outs.length || ins.length > 10) return { ins, outs, rows: [] };
    const drv = drivers(d), saved = ins.map(p => p.v), rows = [];
    let loop = false;
    for (let r = 0; r < (1 << ins.length); r++) {
      ins.forEach((p, i) => { p.v = (r >> (ins.length - 1 - i)) & 1; });
      const vm = new Map(), res = settle(d, vm, drv);
      if (!res.stable) loop = true;
      rows.push(outs.map(o => res.inV(o, 'a')));
    }
    ins.forEach((p, i) => { p.v = saved[i]; });
    return { ins, outs, rows, loop };
  }

  /* ---------------- Verilog ---------------- */
  function verilog(d) {
    const warn = [];
    const byId = new Map(d.parts.map(p => [p.id, p]));
    const drv = drivers(d);
    const modName = ident(d.name) ? d.name : (d.name.replace(/\W+/g, '_').replace(/^(\d)/, '_$1') || 'circuit');
    const ins = d.parts.filter(p => p.t === 'in' || p.t === 'clk').sort((a, b) => a.y - b.y || a.x - b.x);
    const outs = d.parts.filter(p => p.t === 'out').sort((a, b) => a.y - b.y || a.x - b.x);
    // gates in the order signals flow (inputs first); loops keep their left-to-right order
    const logic = d.parts.filter(p => !['in', 'clk', 'out', 'c0', 'c1'].includes(p.t));
    const order = [], done = new Set(), deps = p => ports(p).ins.map(([n]) => (drv.get(p.id + '.' + n) || '').split('.')[0]).filter(id => byId.has(id) && !['in', 'clk', 'c0', 'c1'].includes(byId.get(id).t));
    const pending = logic.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    while (pending.length) {
      const i = pending.findIndex(p => p.t === 'dff' || deps(p).every(id => done.has(id) || byId.get(id).t === 'dff'));
      const p = pending.splice(i < 0 ? 0 : i, 1)[0];
      order.push(p); done.add(p.id);
    }
    // a name for every output pin: input names, constants, an output's own name when it drives one, else w1, w2…
    const net = new Map(), used = new Set([...ins, ...outs].map(p => p.name)), regs = new Set(), made = [];
    let wn = 0;
    const fresh = base => { let n; do n = base + (++wn); while (used.has(n)); used.add(n); made.push(n); return n; };
    for (const p of ins) net.set(p.id + '.y', p.name);
    for (const p of d.parts) if (p.t === 'c0' || p.t === 'c1') net.set(p.id + '.y', p.t === 'c1' ? "1'b1" : "1'b0");
    const namedOuts = new Set();
    for (const p of order) for (const [port] of ports(p).outs) {
      const k = p.id + '.' + port;
      const o = outs.find(o => drv.get(o.id + '.a') === k && !namedOuts.has(o.id));
      if (o) { net.set(k, o.name); namedOuts.add(o.id); } else if (d.wires.some(w => w.from.p === p.id && w.from.port === port) || port === 'q') net.set(k, p.t === 'dff' ? fresh(port === 'q' ? 'q' : 'qn') : fresh('w'));
      if (p.t === 'dff' && port === 'q') regs.add(net.get(k));
    }
    const src = (p, port) => {
      const k = drv.get(p.id + '.' + port);
      if (!k || !net.has(k)) { warn.push(`${LABEL[p.t]}${p.t === 'out' ? ' ' + p.name : ''}: input ${port === 'a' ? '' : port + ' '}is not connected (0 is used)`); return "1'b0"; }
      return net.get(k);
    };
    const L = [];
    L.push('// Drawn in the Playground circuit designer — edit the drawing, not this file, to keep them in step');
    L.push(`module ${modName} (`);
    const decl = [...ins.map(p => `    input  wire ${p.name}`), ...outs.map(p => `    output ${regs.has(p.name) ? 'reg ' : 'wire'} ${p.name}`)];
    L.push(decl.join(',\n'));
    L.push(');');
    const wireOnly = made.filter(n => !regs.has(n)), regOnly = made.filter(n => regs.has(n));
    if (wireOnly.length) L.push(`    wire ${wireOnly.join(', ')};`);
    if (regOnly.length) L.push(`    reg  ${regOnly.join(', ')};`);
    if (wireOnly.length || regOnly.length) L.push('');
    const OP = { and: ' & ', or: ' | ', xor: ' ^ ', nand: ' & ', nor: ' | ', xnor: ' ^ ' };
    let g = 0;
    for (const p of order) {
      const y = net.get(p.id + '.y');
      if (p.t === 'dff') {
        const q = net.get(p.id + '.q'), qn = net.get(p.id + '.qn');
        const clk = src(p, 'clk'), dd = src(p, 'd');
        L.push(`    initial ${q} = 1'b0;`);
        L.push(`    always @(posedge ${clk}) ${q} <= ${dd};`);
        if (qn) L.push(`    assign ${qn} = ~${q};`);
        continue;
      }
      if (!y) continue;   // drives nothing
      const ins_ = ports(p).ins.map(([n]) => src(p, n));
      if (p.t === 'mux') { L.push(`    assign ${y} = ${ins_[2]} ? ${ins_[1]} : ${ins_[0]};`); continue; }
      if (d.style === 'prim') L.push(`    ${(p.t + '  ').slice(0, 4)} g${++g} (${[y, ...ins_].join(', ')});`);
      else if (p.t === 'not') L.push(`    assign ${y} = ~${ins_[0]};`);
      else if (p.t === 'buf') L.push(`    assign ${y} = ${ins_[0]};`);
      else { const e = ins_.join(OP[p.t]); L.push(`    assign ${y} = ${/^n|xn/.test(p.t) ? `~(${e})` : e};`); }
    }
    for (const o of outs) if (!namedOuts.has(o.id)) {
      if (regs.has(o.name)) continue;
      L.push(`    assign ${o.name} = ${src(o, 'a')};`);
    }
    L.push('endmodule');
    return { code: L.join('\n') + '\n', warn: [...new Set(warn)], modName };
  }

  /* ---------------- page ---------------- */
  const css = document.createElement('style');
  css.textContent = `
.vmode{display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; background:var(--surface)}
.vmode button{font:700 .85rem "Atkinson Hyperlegible",sans-serif; border:0; background:none; color:var(--muted); padding:6px 12px; cursor:pointer}
.vmode button[aria-pressed="true"]{background:var(--accent); color:var(--accent-ink)}
body.drawing .main{display:none}
.dz{flex:1; min-height:0; display:grid; grid-template-columns:150px minmax(0,1fr) minmax(300px,var(--dzr,380px)); gap:10px}
.dz[hidden]{display:none}
.dz .pal{padding:8px; overflow:auto; display:flex; flex-direction:column; gap:4px}
.dz .pal b{font:700 .66rem "JetBrains Mono",monospace; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); margin:6px 0 2px}
.dz .pi{display:flex; align-items:center; gap:8px; border:1px solid var(--line); background:var(--surface); color:var(--ink); border-radius:7px; padding:3px 6px; cursor:grab; font:700 .8rem "Atkinson Hyperlegible",sans-serif; text-align:left; touch-action:none; user-select:none}
.dz .pi:hover{border-color:var(--accent)}
.dz .pi svg{width:36px; height:24px; flex:none}
.dz .cv{flex:1; min-height:0; position:relative; overflow:hidden; background:var(--code-bg); touch-action:none}
.dz .cv svg.board{position:absolute; inset:0; width:100%; height:100%; display:block; user-select:none}
.dz .dtb{display:flex; flex-wrap:wrap; gap:6px; align-items:center; padding:6px 10px; border-bottom:1px solid var(--line); font-size:.82rem; color:var(--muted)}
.dz .dtb select,.dz .dtb input{max-width:200px}
.dz .hint{position:absolute; left:10px; bottom:8px; right:10px; font-size:.78rem; color:var(--muted); pointer-events:none}
.dz .bd{fill:var(--surface); stroke:var(--ink); stroke-width:2; stroke-linejoin:round}
.dz .ln,.dz .st{fill:none; stroke:var(--ink); stroke-width:2}
.dz .pl{font:700 11px "JetBrains Mono",monospace; fill:var(--muted)}
.dz .pv{font:700 10px "JetBrains Mono",monospace; fill:var(--accent)}
.dz .gl{font:700 9px "JetBrains Mono",monospace; fill:var(--muted); letter-spacing:.05em}
.dz .nm{font:700 12px "JetBrains Mono",monospace; fill:var(--ink)}
.dz .sw{fill:var(--bg); stroke:var(--ink); stroke-width:2; cursor:pointer}
.dz .sw.on{fill:color-mix(in oklab,var(--ok) 30%,var(--surface)); stroke:var(--ok)}
.dz .sv{font:800 15px "JetBrains Mono",monospace; fill:var(--muted); pointer-events:none}
.dz .sv.on{fill:var(--ink)}
.dz .ck{fill:none; stroke:var(--muted); stroke-width:2; pointer-events:none} .dz .ck.on{stroke:var(--ok)}
.dz .led{fill:var(--bg); stroke:var(--ink); stroke-width:2} .dz .led.on{fill:color-mix(in oklab,var(--ok) 55%,var(--surface)); stroke:var(--ok)} .dz .led.x{stroke:var(--warn); stroke-dasharray:3 3}
.dz .part{cursor:move}
.dz .part.sel .bd,.dz .part.sel .sw,.dz .part.sel .led{stroke:var(--accent); stroke-width:3}
.dz .part .hit{fill:transparent}
.dz .port{fill:var(--surface); stroke:var(--muted); stroke-width:1.5; cursor:crosshair}
.dz .port.o{fill:var(--muted)}
.dz .port:hover,.dz .port.hot{stroke:var(--accent); fill:var(--accent); r:6}
.dz .wire{fill:none; stroke-width:2.5; stroke-linejoin:round; stroke-linecap:round}
.dz .wire.v0{stroke:color-mix(in oklab,var(--ink) 55%,transparent)} .dz .wire.v1{stroke:var(--ok)} .dz .wire.vx{stroke:var(--warn); stroke-dasharray:5 4}
.dz .wire.sel{stroke-width:4.5}
.dz .jn{stroke:none} .dz .jn.v0{fill:color-mix(in oklab,var(--ink) 55%,transparent)} .dz .jn.v1{fill:var(--ok)} .dz .jn.vx{fill:var(--warn)}
.dz .whit{fill:none; stroke:transparent; stroke-width:12; cursor:pointer}
.dz .tmp{fill:none; stroke:var(--accent); stroke-width:2; stroke-dasharray:6 4; pointer-events:none}
.dz .band{fill:color-mix(in oklab,var(--accent) 10%,transparent); stroke:var(--accent); stroke-dasharray:4 3}
.dz .side{display:flex; flex-direction:column; min-height:0}
.dz .insp{padding:8px 10px; border-bottom:1px solid var(--line); display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; font-size:.85rem; min-height:44px}
.dz .insp b{font:800 .95rem "Bricolage Grotesque",sans-serif}
.dz .insp .bad{outline:2px solid var(--err)}
.dz .dtabs{display:flex; gap:2px; padding:6px 8px 0; border-bottom:1px solid var(--line)}
.dz .dtabs button{font:700 .85rem "Atkinson Hyperlegible",sans-serif; border:1px solid transparent; border-bottom:0; background:none; color:var(--muted); padding:6px 12px; border-radius:7px 7px 0 0; cursor:pointer}
.dz .dtabs button[aria-selected="true"]{background:var(--surface); color:var(--ink); border-color:var(--line); margin-bottom:-1px}
.dz .dpanel{flex:1; min-height:0; overflow:auto; padding:10px; display:none; flex-direction:column; gap:10px}
.dz .dpanel.on{display:flex}
.dz .dpanel>*{flex-shrink:0}
.dz pre.vcode{margin:0; padding:10px 12px; border:1px solid var(--line); border-radius:8px; background:var(--code-bg); font:12.5px/1.5 "JetBrains Mono",monospace; overflow:auto; white-space:pre}
.dz .warn{color:var(--warn); font-size:.82rem; margin:0; padding-left:18px}
.dz .tt tr.cur td{outline:2px solid var(--accent); outline-offset:-2px}
.dz .tt tbody tr{cursor:pointer}
@media (max-width:1100px){ .dz{grid-template-columns:120px minmax(0,1fr)} .dz .side{grid-column:1/-1; min-height:420px} }
@media (max-width:700px){ .dz{grid-template-columns:minmax(0,1fr)} .dz .pal{flex-direction:row; flex-wrap:wrap} .dz .cv{min-height:420px} }`;
  document.head.appendChild(css);

  const host = document.createElement('div');
  host.className = 'dz'; host.id = 'designer'; host.hidden = true;
  const PAL = [['Inputs and outputs', ['in', 'clk', 'out', 'c0', 'c1']], ['Gates', ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor', 'buf']], ['Blocks', ['mux', 'dff']]];
  host.innerHTML = `
    <section class="pane pal" aria-label="Parts">${PAL.map(([g, ts]) => `<b>${g}</b>` + ts.map(t => `<button type="button" class="pi" data-t="${t}" title="${esc(HELP[t])} — drag onto the board, or click">${icon(t)}<span>${LABEL[t]}</span></button>`).join('')).join('')}</section>
    <section class="pane" aria-label="Board" style="min-width:0">
      <div class="dtb">
        <select id="dzSel" aria-label="Drawing"></select>
        <button class="btn small" type="button" id="dzNew" title="A new drawing, empty or from an example">New…</button>
        <button class="btn small" type="button" id="dzDel" title="Delete this drawing">Delete</button>
        <span class="grow" style="flex:1"></span>
        <button class="btn small" type="button" id="dzUndo" title="Undo (Ctrl + Z)">↶</button><button class="btn small" type="button" id="dzRedo" title="Redo (Ctrl + Y)">↷</button>
        <button class="btn small" type="button" id="dzTick" title="One clock pulse: every Clock input goes 0 → 1 → 0">⏱ Tick</button>
        <button class="btn small" type="button" id="dzOut" title="Zoom out">−</button><button class="btn small" type="button" id="dzFit" title="Fit the drawing">Fit</button><button class="btn small" type="button" id="dzIn" title="Zoom in">+</button>
        <button class="btn small" type="button" id="dzSvg" title="Save the drawing as an SVG picture">SVG</button>
      </div>
      <div class="cv" id="dzCv"><svg class="board" id="dzSvgEl" tabindex="0" aria-label="Circuit board"><defs><pattern id="dzGrid" width="${G}" height="${G}" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.8" fill="var(--line)"/></pattern></defs><rect id="dzBg" x="-5000" y="-5000" width="10000" height="10000" fill="url(#dzGrid)"/><g id="dzVp"></g></svg>
        <div class="hint" id="dzHint">Drag parts from the left. Drag from a ● output to an input to connect them. Click an input switch to change it. Wheel zooms, drag the empty board to move it, Delete removes.</div></div>
    </section>
    <section class="pane side" aria-label="Verilog and truth table">
      <div class="insp" id="dzInsp"></div>
      <div class="dtabs" role="tablist"><button type="button" data-p="code" aria-selected="true">Verilog</button><button type="button" data-p="tt" aria-selected="false">Truth table</button></div>
      <div class="dpanel on" id="dzP-code">
        <div class="row" style="display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center">
          <label class="f">Module <input type="text" id="dzName" spellcheck="false" style="width:10em"></label>
          <label class="f">Write as <select id="dzStyle"><option value="prim">gate primitives</option><option value="assign">assign statements</option></select></label>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap"><button class="btn primary small" type="button" id="dzAdd" title="Put this module into the current Verilog project and open it: waveform, logic and circuit follow">Add to project ↗</button><button class="btn small" type="button" id="dzCopy">Copy</button><button class="btn small" type="button" id="dzDl">Download .v</button></div>
        <ul class="warn" id="dzWarn"></ul>
        <pre class="vcode cm-s-default" id="dzCode"></pre>
      </div>
      <div class="dpanel" id="dzP-tt"></div>
    </section>`;
  document.querySelector('.wrap').appendChild(host);
  // the Code | Draw switch in the header
  const sw = document.createElement('div');
  sw.className = 'vmode'; sw.setAttribute('role', 'group'); sw.setAttribute('aria-label', 'Write code or draw');
  sw.innerHTML = '<button type="button" data-m="code" title="Write Verilog">Code</button><button type="button" data-m="draw" title="Draw a circuit with gates and get the Verilog">Draw circuit</button>';
  document.querySelector('.hright').prepend(sw);
  let mode = 'code';
  try { mode = localStorage.getItem('ccp.vl.mode') === 'draw' ? 'draw' : 'code'; } catch (_) {}
  function setMode(m) {
    mode = m;
    try { localStorage.setItem('ccp.vl.mode', m); } catch (_) {}
    sw.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === m)));
    document.body.classList.toggle('drawing', m === 'draw');
    host.hidden = m !== 'draw';
    if (m === 'draw') { render(); if (!fitted) { fitted = true; fit(); } }
    else if (window.VL) setTimeout(() => window.VL.cm.refresh(), 0);
  }
  sw.onclick = e => { const b = e.target.closest('button[data-m]'); if (b) setMode(b.dataset.m); };

  /* ---------------- view: pan and zoom ---------------- */
  const svg = $('dzSvgEl'), vp = $('dzVp');
  let view = { x: 20, y: 30, z: 1 }, fitted = false;
  const applyView = () => { vp.setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.z})`); $('dzBg').setAttribute('transform', `translate(${view.x} ${view.y}) scale(${view.z})`); };
  const toBoard = (cx, cy) => { const r = svg.getBoundingClientRect(); return [(cx - r.left - view.x) / view.z, (cy - r.top - view.y) / view.z]; };
  function zoomAt(f, cx, cy) {
    const r = svg.getBoundingClientRect();
    if (cx == null) { cx = r.left + r.width / 2; cy = r.top + r.height / 2; }
    const z = Math.min(3, Math.max(0.25, view.z * f)), k = z / view.z;
    view.x = cx - r.left - (cx - r.left - view.x) * k; view.y = cy - r.top - (cy - r.top - view.y) * k; view.z = z;
    applyView();
  }
  function bounds() {
    if (!D.parts.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const p of D.parts) { const [w, h] = size(p); x1 = Math.min(x1, p.x); y1 = Math.min(y1, p.y - 16); x2 = Math.max(x2, p.x + w); y2 = Math.max(y2, p.y + h + 16); }
    return [x1, y1, x2, y2];
  }
  function fit() {
    const b = bounds(), r = svg.getBoundingClientRect();
    if (!b || !r.width) { view = { x: 20, y: 30, z: 1 }; applyView(); return; }
    const z = Math.min(1.6, Math.max(0.3, Math.min((r.width - 60) / (b[2] - b[0]), (r.height - 80) / (b[3] - b[1]))));
    view = { z, x: (r.width - (b[2] - b[0]) * z) / 2 - b[0] * z, y: (r.height - 30 - (b[3] - b[1]) * z) / 2 - b[1] * z };
    applyView();
  }
  $('dzIn').onclick = () => zoomAt(1.2); $('dzOut').onclick = () => zoomAt(1 / 1.2); $('dzFit').onclick = fit;
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });

  /* ---------------- drawing ---------------- */
  let sel = null;   // { kind: 'part' | 'wire', id }
  let lastSim = null;
  const portAbs = (p, name, out) => { const q = (out ? ports(p).outs : ports(p).ins).find(x => x[0] === name); return q ? [p.x + q[1], p.y + q[2]] : null; };
  // wires: every source (an output pin) gets its own vertical column just right of it, shared by all its wires, so
  // a branch is a T with a dot and wires from different sources never run on top of each other
  function route(a, b, k, col) {
    const [x1, y1] = a, [x2, y2] = b;
    if (col != null && col <= x2 - 10) return [`M${x1} ${y1} H${col} V${y2} H${x2}`, col];
    if (x2 >= x1 + 20) { const mx = snap((x1 + x2) / 2); return [`M${x1} ${y1} H${mx} V${y2} H${x2}`, null]; }
    const ox = x1 + 10 + (k % 3) * 4, ix = x2 - 10 - (k % 3) * 4, my = y1 === y2 ? y1 + 40 : snap((y1 + y2) / 2);
    return [`M${x1} ${y1} H${ox} V${my} H${ix} V${y2} H${x2}`, null];
  }
  function columns(byId) {   // source key -> x of its column
    const src = new Map();
    for (const w of D.wires) {
      const a = byId.get(w.from.p); if (!a) continue;
      const k = w.from.p + '.' + w.from.port;
      if (!src.has(k)) { const pa = portAbs(a, w.from.port, true); if (pa) src.set(k, pa); }
    }
    const groups = new Map();
    for (const [k, [x, y]] of src) { if (!groups.has(x)) groups.set(x, []); groups.get(x).push([k, y]); }
    const col = new Map();
    for (const [x, list] of groups) list.sort((p, q) => p[1] - q[1]).forEach(([k], i) => col.set(k, x + 10 + (i % 6) * 10));
    return col;
  }
  function render() {
    if (mode !== 'draw') return;
    const sim = simulate();
    lastSim = sim;
    const byId = new Map(D.parts.map(p => [p.id, p]));
    let h = '';
    const cols = columns(byId), trunks = new Map();   // source -> {x, ys: [], y1, v}
    D.wires.forEach((w, k) => {
      const a = byId.get(w.from.p), b = byId.get(w.to.p);
      if (!a || !b) return;
      const pa = portAbs(a, w.from.port, true), pb = portAbs(b, w.to.port, false);
      if (!pa || !pb) return;
      const sk = w.from.p + '.' + w.from.port, v = vals.get(sk), [d, cx] = route(pa, pb, k, cols.get(sk));
      const cls = v === 1 ? 1 : v === 0 ? 0 : 'x';
      if (cx != null) { if (!trunks.has(sk)) trunks.set(sk, { x: cx, y1: pa[1], ys: [], cls }); trunks.get(sk).ys.push(pb[1]); }
      h += `<g data-w="${w.id}"><path class="whit" d="${d}"/><path class="wire v${cls}${sel && sel.kind === 'wire' && sel.id === w.id ? ' sel' : ''}" d="${d}"/></g>`;
    });
    for (const t of trunks.values()) {   // a dot wherever a wire leaves the trunk in the middle (a real connection)
      if (t.ys.length < 2 && t.ys[0] !== t.y1) continue;
      const all = [t.y1, ...t.ys], lo = Math.min(...all), hi = Math.max(...all);
      for (const y of new Set(all)) if ((y > lo && y < hi) || (all.filter(v => v === y).length > 1 && y !== t.y1)) h += `<circle class="jn v${t.cls}" cx="${t.x}" cy="${y}" r="3.5"/>`;
    }
    for (const p of D.parts) {
      const [w, hh] = size(p), pr = ports(p);
      const val = p.t === 'out' ? { a: sim.inV(p, 'a') } : p.t === 'dff' ? { q: p.q == null ? 0 : p.q } : null;
      h += `<g class="part${sel && sel.kind === 'part' && sel.id === p.id ? ' sel' : ''}" data-p="${p.id}" transform="translate(${p.x} ${p.y})"><title>${esc(LABEL[p.t] + (p.name ? ' ' + p.name : '') + ' — ' + HELP[p.t])}</title><rect class="hit" x="-2" y="-2" width="${w + 4}" height="${hh + 4}"/>${shape(p, val)}`;
      for (const [n, x, y] of pr.ins) h += `<circle class="port" data-port="${n}" data-dir="in" cx="${x}" cy="${y}" r="4"><title>input ${n}</title></circle>`;
      for (const [n, x, y] of pr.outs) h += `<circle class="port o" data-port="${n}" data-dir="out" cx="${x}" cy="${y}" r="4"><title>output ${n} — drag to an input</title></circle>`;
      h += '</g>';
    }
    vp.innerHTML = h;
    applyView();
    $('dzTick').hidden = !D.parts.some(p => p.t === 'clk');
    $('dzUndo').disabled = !undo.length; $('dzRedo').disabled = !redo.length;
    renderSide();
  }
  let sideT = 0;
  function renderSide() {
    renderInspector();
    clearTimeout(sideT);
    sideT = setTimeout(() => { renderCode(); renderTT(); }, 60);
  }
  function renderCode() {
    $('dzName').value = D.name; $('dzStyle').value = D.style || 'prim';
    $('dzName').classList.toggle('bad', !ident(D.name));
    const v = verilog(D);
    $('dzWarn').innerHTML = v.warn.map(w => `<li>${esc(w)}</li>`).join('') + (!ident(D.name) ? '<li>The module name must be letters, digits and _, and not a Verilog word</li>' : '');
    const pre = $('dzCode');
    pre.textContent = '';
    if (window.CodeMirror && CodeMirror.runMode) CodeMirror.runMode(v.code, 'text/x-verilog', pre); else pre.textContent = v.code;
    $('dzAdd').textContent = `Add to project as ${v.modName}.v ↗`;
  }
  function renderTT() {
    const t = truthTable(D), el = $('dzP-tt');
    if (t.memory) { el.innerHTML = '<p class="note">This circuit has flip-flops or a clock, so its outputs depend on what happened before: there is no single truth table. Use ⏱ Tick on the board, or "Add to project" to see the waveform.</p>'; return; }
    if (!t.ins.length || !t.outs.length) { el.innerHTML = '<p class="note">Add at least one Input and one Output to see the truth table.</p>'; return; }
    if (t.ins.length > 10) { el.innerHTML = '<p class="note">More than 10 inputs: the table would be too long.</p>'; return; }
    const curRow = t.ins.reduce((r, p) => r * 2 + (p.v ? 1 : 0), 0);
    let h = t.loop ? '<p class="note" style="color:var(--warn)">The circuit has a loop that does not settle for some inputs (shown as ?).</p>' : '';
    if (t.ins.length <= 6) {
      h += `<table class="tt"><thead><tr>${t.ins.map(p => `<th>${esc(p.name)}</th>`).join('')}${t.outs.map(p => `<th class="o">${esc(p.name)}</th>`).join('')}</tr></thead><tbody>`;
      t.rows.forEach((r, i) => {
        h += `<tr data-r="${i}"${i === curRow ? ' class="cur"' : ''}>${t.ins.map((_, k) => `<td>${(i >> (t.ins.length - 1 - k)) & 1}</td>`).join('')}${r.map(v => `<td class="o${v === 1 ? ' one' : v === 'x' ? ' x' : ''}">${v === 'x' ? '?' : v}</td>`).join('')}</tr>`;
      });
      h += '</tbody></table><p class="note">Click a row to set the switches on the board.</p>';
    }
    if (window.Logic && !t.loop) {
      const names = t.ins.map(p => p.name);
      h += t.outs.map((o, j) => {
        const m = Logic.minimize(names, t.rows.map(r => r[j]));
        return `<div class="eq"><div class="nm">${esc(o.name)}</div><div class="f"><small>simplest</small> ${esc(o.name)} = ${esc(m.sop.math)}</div><div class="f"><small>product</small> ${esc(o.name)} = ${esc(m.pos.math)}</div><div class="f"><small>minterms</small> ${esc(m.canonSop)}</div></div>`;
      }).join('');
    }
    el.innerHTML = h;
  }
  $('dzP-tt').onclick = e => {
    const tr = e.target.closest('tr[data-r]'); if (!tr) return;
    const ins = D.parts.filter(p => p.t === 'in').sort((a, b) => a.y - b.y || a.x - b.x), r = +tr.dataset.r;
    ins.forEach((p, i) => { p.v = (r >> (ins.length - 1 - i)) & 1; });
    saveSoon(); render();
  };
  document.querySelector('#designer .dtabs').onclick = e => {
    const b = e.target.closest('button[data-p]'); if (!b) return;
    host.querySelectorAll('.dtabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    host.querySelectorAll('.dpanel').forEach(p => p.classList.toggle('on', p.id === 'dzP-' + b.dataset.p));
  };
  function renderInspector() {
    const el = $('dzInsp');
    const p = sel && sel.kind === 'part' && D.parts.find(x => x.id === sel.id);
    const w = sel && sel.kind === 'wire' && D.wires.find(x => x.id === sel.id);
    if (p) {
      const named = ['in', 'clk', 'out'].includes(p.t);
      if (el.dataset.for === p.id + ':' + (p.n || '') && document.activeElement && el.contains(document.activeElement)) return;
      el.dataset.for = p.id + ':' + (p.n || '');
      el.innerHTML = `<b>${LABEL[p.t]}</b>${named ? `<label class="f">Name <input type="text" id="dzPName" value="${esc(p.name || '')}" spellcheck="false" style="width:8em"></label>` : ''}${GATES.includes(p.t) ? `<label class="f">Inputs <select id="dzPN">${[2, 3, 4, 5, 6, 7, 8].map(n => `<option${n === (p.n || 2) ? ' selected' : ''}>${n}</option>`).join('')}</select></label>` : ''}<span style="flex:1"></span><button class="btn small" type="button" id="dzPDup" title="Ctrl + D">Duplicate</button><button class="btn small" type="button" id="dzPDel" title="Delete">Delete</button>`;
      if (named) $('dzPName').oninput = () => {
        const v = $('dzPName').value.trim();
        const clash = D.parts.some(q => q !== p && q.name === v);
        $('dzPName').classList.toggle('bad', !ident(v) || clash);
        $('dzPName').title = !ident(v) ? 'Letters, digits and _, starting with a letter; not a Verilog word' : clash ? 'Another pin has this name' : '';
        if (ident(v) && !clash) { change(() => { p.name = v; }, 'name:' + p.id); }
      };
      if ($('dzPN')) $('dzPN').onchange = () => change(() => { const n = +$('dzPN').value; p.n = n; D.wires = D.wires.filter(w => !(w.to.p === p.id && +w.to.port.slice(1) >= n)); });
      $('dzPDel').onclick = deleteSel; $('dzPDup').onclick = duplicate;
    } else if (w) {
      el.dataset.for = '';
      el.innerHTML = `<b>Wire</b><span class="note">carries ${(v => v === 'x' ? 'an unknown value' : v)(vals.get(w.from.p + '.' + w.from.port))}</span><span style="flex:1"></span><button class="btn small" type="button" id="dzPDel">Delete</button>`;
      $('dzPDel').onclick = deleteSel;
    } else {
      el.dataset.for = '';
      const c = D.parts.length, n = D.wires.length;
      el.innerHTML = `<span class="note">${c ? `${c} part${c === 1 ? '' : 's'}, ${n} wire${n === 1 ? '' : 's'}. Click a part to rename it or change its inputs.` : 'Start by dragging an Input, a gate and an Output onto the board.'}</span>`;
    }
  }

  /* ---------------- editing, with undo ---------------- */
  let undo = [], redo = [], lastTag = '';
  const snapshot = () => JSON.stringify({ parts: D.parts, wires: D.wires, name: D.name, style: D.style });
  function change(fn, tag) {
    if (!tag || tag !== lastTag) { undo.push(snapshot()); if (undo.length > 150) undo.shift(); redo = []; }
    lastTag = tag || '';
    fn(); saveSoon(); render();
  }
  function restore(s) { const o = JSON.parse(s); D.parts = o.parts; D.wires = o.wires; D.name = o.name; D.style = o.style; sel = null; lastTag = ''; saveSoon(); render(); }
  $('dzUndo').onclick = () => { if (undo.length) { redo.push(snapshot()); restore(undo.pop()); } };
  $('dzRedo').onclick = () => { if (redo.length) { undo.push(snapshot()); restore(redo.pop()); } };
  function deleteSel() {
    if (!sel) return;
    change(() => {
      if (sel.kind === 'part') { D.parts = D.parts.filter(p => p.id !== sel.id); D.wires = D.wires.filter(w => w.from.p !== sel.id && w.to.p !== sel.id); }
      else D.wires = D.wires.filter(w => w.id !== sel.id);
      sel = null;
    });
  }
  function nextName(t) {
    const taken = new Set(D.parts.map(p => p.name));
    const seq = t === 'out' ? ['y', 'z', 'f', 'g', 'out'] : t === 'clk' ? ['clk', 'clk2'] : 'abcdefghijklmnopqrstuv'.split('').filter(c => !['y', 'z', 'f', 'g'].includes(c));
    for (const n of seq) if (!taken.has(n)) return n;
    let i = 1; while (taken.has((t === 'out' ? 'y' : 'in') + i)) i++; return (t === 'out' ? 'y' : 'in') + i;
  }
  function addPart(t, x, y) {
    const p = { id: uid(), t, x: snap(x), y: snap(y) };
    if (GATES.includes(t)) p.n = 2;
    if (['in', 'clk', 'out'].includes(t)) { p.name = nextName(t); p.v = 0; }
    change(() => { D.parts.push(p); sel = { kind: 'part', id: p.id }; });
    return p;
  }
  function duplicate() {
    const p = sel && sel.kind === 'part' && D.parts.find(x => x.id === sel.id); if (!p) return;
    const q = Object.assign({}, p, { id: uid(), x: p.x + 20, y: p.y + 20 });
    if (q.name) q.name = nextName(q.t);
    change(() => { D.parts.push(q); sel = { kind: 'part', id: q.id }; });
  }
  function connect(a, b) {   // a, b: {p, port, dir}
    if (a.dir === b.dir || a.p === b.p && a.port === b.port) return;
    const out = a.dir === 'out' ? a : b, inp = a.dir === 'out' ? b : a;
    change(() => {
      D.wires = D.wires.filter(w => !(w.to.p === inp.p && w.to.port === inp.port));   // one driver per input
      D.wires.push({ id: uid(), from: { p: out.p, port: out.port }, to: { p: inp.p, port: inp.port } });
    });
  }
  $('dzTick').onclick = () => {
    const clks = D.parts.filter(p => p.t === 'clk');
    clks.forEach(p => { p.v = 0; }); render();
    clks.forEach(p => { p.v = 1; }); render();
    setTimeout(() => { clks.forEach(p => { p.v = 0; }); saveSoon(); render(); }, 250);
  };

  /* ---------------- pointer: drag parts, draw wires, pan, palette ---------------- */
  let drag = null;
  svg.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    svg.focus({ preventScroll: true });
    const port = e.target.closest('.port'), part = e.target.closest('.part'), wire = e.target.closest('[data-w]');
    const [bx, by] = toBoard(e.clientX, e.clientY);
    if (port && part) {
      const p = D.parts.find(x => x.id === part.dataset.p);
      const start = portAbs(p, port.dataset.port, port.dataset.dir === 'out');
      drag = { kind: 'wire', from: { p: p.id, port: port.dataset.port, dir: port.dataset.dir }, start };
      const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path'); tmp.setAttribute('class', 'tmp'); vp.appendChild(tmp); drag.tmp = tmp;
    } else if (part) {
      const p = D.parts.find(x => x.id === part.dataset.p);
      sel = { kind: 'part', id: p.id };
      drag = { kind: 'move', p, dx: bx - p.x, dy: by - p.y, x0: p.x, y0: p.y, moved: false, snap: snapshot(), onSwitch: !!e.target.closest('.sw') };
      renderInspector();
      vp.querySelectorAll('.part').forEach(g => g.classList.toggle('sel', g === part));
    } else if (wire) {
      sel = { kind: 'wire', id: wire.dataset.w }; render();
      drag = null;
    } else {
      sel = null; render();
      drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, x: view.x, y: view.y };
    }
    if (drag) svg.setPointerCapture(e.pointerId);
  });
  svg.addEventListener('pointermove', e => {
    if (!drag) return;
    const [bx, by] = toBoard(e.clientX, e.clientY);
    if (drag.kind === 'pan') { view.x = drag.x + e.clientX - drag.cx; view.y = drag.y + e.clientY - drag.cy; applyView(); }
    else if (drag.kind === 'move') {
      const nx = snap(bx - drag.dx), ny = snap(by - drag.dy);
      if (nx !== drag.p.x || ny !== drag.p.y) { drag.p.x = nx; drag.p.y = ny; drag.moved = true; render(); }
    } else if (drag.kind === 'wire') {
      const [x1, y1] = drag.start;
      drag.tmp.setAttribute('d', `M${x1} ${y1} L${bx} ${by}`);
      const t = document.elementFromPoint(e.clientX, e.clientY);
      vp.querySelectorAll('.port.hot').forEach(c => c.classList.remove('hot'));
      if (t && t.classList && t.classList.contains('port')) t.classList.add('hot');
    }
  });
  function endDrag(e) {
    if (!drag) return;
    const d = drag; drag = null;
    if (d.kind === 'move') {
      if (d.moved) { undo.push(d.snap); if (undo.length > 150) undo.shift(); redo = []; lastTag = ''; saveSoon(); render(); }
      else if (d.onSwitch && (d.p.t === 'in' || d.p.t === 'clk')) { d.p.v = d.p.v ? 0 : 1; saveSoon(); render(); }
    } else if (d.kind === 'wire') {
      d.tmp.remove();
      const t = e && document.elementFromPoint(e.clientX, e.clientY);
      let target = t && t.closest && t.closest('.port');
      if (!target && e) {   // dropped near a port: take the closest within 14 px
        const [bx, by] = toBoard(e.clientX, e.clientY);
        let best = null, bd = (14 / view.z) ** 2;
        for (const p of D.parts) for (const dir of ['in', 'out']) for (const [n, x, y] of ports(p)[dir === 'in' ? 'ins' : 'outs']) {
          const dd = (p.x + x - bx) ** 2 + (p.y + y - by) ** 2;
          if (dd < bd) { bd = dd; best = { p: p.id, port: n, dir }; }
        }
        if (best) connect(d.from, best); else render();
        return;
      }
      if (target) { const g = target.closest('.part'); connect(d.from, { p: g.dataset.p, port: target.dataset.port, dir: target.dataset.dir }); }
      else render();
    }
  }
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', () => { if (drag && drag.tmp) drag.tmp.remove(); drag = null; render(); });
  svg.addEventListener('dblclick', e => {
    const part = e.target.closest('.part'); if (!part) return;
    const p = D.parts.find(x => x.id === part.dataset.p);
    if (p && ['in', 'clk', 'out'].includes(p.t) && $('dzPName')) { $('dzPName').focus(); $('dzPName').select(); }
  });
  // palette: click adds near the middle of the view; drag drops where released
  let pdrag = null;
  host.querySelector('.pal').addEventListener('pointerdown', e => {
    const b = e.target.closest('.pi'); if (!b || e.button !== 0) return;
    e.preventDefault();
    pdrag = { t: b.dataset.t, x: e.clientX, y: e.clientY, ghost: null };
  });
  window.addEventListener('pointermove', e => {
    if (!pdrag) return;
    if (!pdrag.ghost && Math.hypot(e.clientX - pdrag.x, e.clientY - pdrag.y) > 6) {
      pdrag.ghost = document.createElement('div');
      pdrag.ghost.style.cssText = 'position:fixed; pointer-events:none; z-index:80; opacity:.85; width:60px; height:44px';
      pdrag.ghost.innerHTML = icon(pdrag.t);
      document.body.appendChild(pdrag.ghost);
    }
    if (pdrag.ghost) { pdrag.ghost.style.left = e.clientX - 20 + 'px'; pdrag.ghost.style.top = e.clientY - 20 + 'px'; }
  });
  window.addEventListener('pointerup', e => {
    if (!pdrag) return;
    const d = pdrag; pdrag = null;
    if (d.ghost) {
      d.ghost.remove();
      const r = svg.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
        const [bx, by] = toBoard(e.clientX, e.clientY), [w, h] = size({ t: d.t, n: 2 });
        addPart(d.t, bx - w / 2, by - h / 2);
      }
    } else {
      const r = svg.getBoundingClientRect(), [cx, cy] = toBoard(r.left + r.width / 2, r.top + r.height / 2);
      const k = D.parts.length % 6;
      addPart(d.t, cx - 30 + k * 20, cy - 20 + k * 20);
    }
  });
  document.addEventListener('keydown', e => {
    if (mode !== 'draw' || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement && document.activeElement.tagName) || document.querySelector('dialog[open]')) return;
    const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if ((e.key === 'Delete' || e.key === 'Backspace') && sel) { e.preventDefault(); deleteSel(); }
    else if (mod && k === 'z' && !e.shiftKey) { e.preventDefault(); $('dzUndo').click(); }
    else if (mod && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); $('dzRedo').click(); }
    else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
    else if (e.key === 'Escape') { sel = null; render(); }
    else if (sel && sel.kind === 'part' && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const p = D.parts.find(x => x.id === sel.id), dx = e.key === 'ArrowLeft' ? -G : e.key === 'ArrowRight' ? G : 0, dy = e.key === 'ArrowUp' ? -G : e.key === 'ArrowDown' ? G : 0;
      if (p) change(() => { p.x += dx; p.y += dy; }, 'nudge:' + p.id);
    }
  });

  /* ---------------- drawings list, name, style, export ---------------- */
  function renderList() {
    $('dzSel').innerHTML = db.list.map(d => `<option value="${d.id}"${d === D ? ' selected' : ''}>${esc(d.name)}</option>`).join('');
  }
  function openDesign(d) { D = d; db.current = d.id; sel = null; undo = []; redo = []; lastTag = ''; vals = new Map(); persist(); renderList(); render(); fit(); }
  $('dzSel').onchange = () => openDesign(db.list.find(d => d.id === $('dzSel').value) || D);
  // the New… menu: a small popover listing the examples
  $('dzNew').onclick = () => {
    let m = $('dzNewMenu');
    if (m) { m.remove(); return; }
    m = document.createElement('div'); m.id = 'dzNewMenu';
    const r = $('dzNew').getBoundingClientRect();
    m.style.cssText = `position:fixed; left:${r.left}px; top:${r.bottom + 4}px; z-index:60; background:var(--surface); border:1px solid var(--line); border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.2); padding:4px; display:flex; flex-direction:column; min-width:220px`;
    m.innerHTML = EXAMPLES.map(([n], i) => `<button type="button" class="btn small" data-i="${i}" style="text-align:left; border:0">${i ? '' : '＋ '}${esc(n)}</button>`).join('');
    m.onclick = e => {
      const b = e.target.closest('[data-i]'); if (!b) return;
      const d = EXAMPLES[+b.dataset.i][1]();
      let base = d.name, n = d.name, i = 2; while (db.list.some(x => x.name === n)) n = base + '_' + i++;
      d.name = n; db.list.push(d); m.remove(); openDesign(d);
    };
    document.body.appendChild(m);
    setTimeout(() => document.addEventListener('pointerdown', function off(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('pointerdown', off); } }), 0);
  };
  $('dzDel').onclick = () => {
    if (!confirm(`Delete the drawing "${D.name}"?`)) return;
    db.list = db.list.filter(d => d !== D);
    if (!db.list.length) db.list.push(EXAMPLES[0][1]());
    openDesign(db.list[0]);
  };
  $('dzName').oninput = () => { const v = $('dzName').value.trim(); if (v) change(() => { D.name = v; }, 'dname'); renderList(); };
  $('dzStyle').onchange = () => change(() => { D.style = $('dzStyle').value; });
  $('dzCopy').onclick = async () => {
    const code = verilog(D).code;
    try { if (window.desktop && window.desktop.copy) await window.desktop.copy(code); else await navigator.clipboard.writeText(code); $('dzCopy').textContent = 'Copied'; }
    catch (_) { $('dzCopy').textContent = 'Could not copy'; }
    setTimeout(() => { $('dzCopy').textContent = 'Copy'; }, 1500);
  };
  const download = (name, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  $('dzDl').onclick = () => { const v = verilog(D); download(v.modName + '.v', new Blob([v.code], { type: 'text/plain' })); };
  $('dzSvg').onclick = () => {
    const b = bounds(); if (!b) return;
    const cs = getComputedStyle(document.documentElement), c = n => cs.getPropertyValue(n).trim();
    const pad = 20, w = b[2] - b[0] + pad * 2, h = b[3] - b[1] + pad * 2;
    let inner = vp.innerHTML.replace(/<title>[^<]*<\/title>/g, '').replace(/<path class="whit"[^>]*\/>/g, '').replace(/<rect class="hit"[^>]*\/>/g, '');
    const style = `.bd{fill:${c('--surface')};stroke:${c('--ink')};stroke-width:2}.ln,.st{fill:none;stroke:${c('--ink')};stroke-width:2}.pl,.gl,.pv{font:700 10px monospace;fill:${c('--muted')}}.nm{font:700 12px monospace;fill:${c('--ink')}}.sw{fill:${c('--bg')};stroke:${c('--ink')};stroke-width:2}.sw.on{stroke:${c('--ok')}}.sv{font:800 15px monospace;fill:${c('--ink')}}.ck{fill:none;stroke:${c('--muted')};stroke-width:2}.led{fill:${c('--bg')};stroke:${c('--ink')};stroke-width:2}.led.on{fill:${c('--ok')}}.port{display:none}.wire{fill:none;stroke-width:2.5}.wire.v0{stroke:${c('--muted')}}.wire.v1{stroke:${c('--ok')}}.wire.vx{stroke:${c('--warn')};stroke-dasharray:5 4}.jn.v0{fill:${c('--muted')}}.jn.v1{fill:${c('--ok')}}.jn.vx{fill:${c('--warn')}}`;
    const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${b[0] - pad} ${b[1] - pad} ${w} ${h}"><style>${style}</style><rect x="${b[0] - pad}" y="${b[1] - pad}" width="${w}" height="${h}" fill="${c('--code-bg')}"/>${inner}</svg>`;
    download(verilog(D).modName + '.svg', new Blob([out], { type: 'image/svg+xml' }));
  };
  $('dzAdd').onclick = () => {
    const v = verilog(D);
    if (!ident(D.name)) { $('dzName').focus(); return; }
    if (!window.VL || !window.VL.putFile) { alert('The Verilog workspace is not ready yet.'); return; }
    const name = v.modName + '.v', p = window.VL.project;
    if (p && p.files.some(f => f.name === name) && !/^\/\/ Drawn in the Playground circuit designer/.test(p.files.find(f => f.name === name).text) && !confirm(`${name} already exists in "${p.name}". Replace it?`)) return;
    window.VL.putFile(name, v.code);
    setMode('code');
  };

  renderList();
  setMode(mode);
  window.CircuitDesigner = { open: () => setMode('draw'), verilog: () => verilog(D), get design() { return D; }, addPart, connect: (a, ap, b, bp) => connect({ p: a, port: ap, dir: 'out' }, { p: b, port: bp, dir: 'in' }), render, truthTable: () => truthTable(D), tick: () => $('dzTick').click(), _examples: EXAMPLES, _new: i => { const d = EXAMPLES[i][1](); db.list.push(d); openDesign(d); return d; } };
})();
