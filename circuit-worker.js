// Circuit worker: Yosys (YoWASP build, WebAssembly) turns the Verilog into a netlist for the Circuit tab.
//   gates: flattened to logic gates (AND, OR, XOR, NOT, MUX, D flip-flops)
//   rtl:   kept as blocks: the module's own sub-modules, adders, comparators, multiplexers, registers
// The page draws the netlist with netlistsvg.
const YOSYS = 'https://cdn.jsdelivr.net/npm/@yowasp/yosys@0.70.1258/gen/bundle.js';
let yosys = null;
async function load() {
  if (yosys) return yosys;
  const mod = await import(YOSYS);
  await mod.runYosys(['-V'], {}, { fetchProgress: ({ totalLength, doneLength }) => postMessage({ type: 'progress', done: doneLength, total: totalLength }), stdout: () => {}, stderr: () => {} });
  yosys = mod;
  return mod;
}
onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try { await load(); postMessage({ type: 'ready' }); } catch (e) { postMessage({ type: 'fatal', message: String(e && e.message || e) }); }
    return;
  }
  if (data.type !== 'netlist') return;
  const t0 = performance.now();
  let log = '';
  const dec = new TextDecoder();
  const sink = b => { if (b) log += dec.decode(b); };
  const names = data.files.map(f => f.path);
  const read = `read_verilog -sv -nooverwrite ${names.map(n => '"' + n + '"').join(' ')}`;
  const steps = data.view === 'rtl'
    ? [read, `hierarchy -top ${data.top}`, 'proc', 'opt -nodffe -nosdff', 'opt_clean', 'write_json -compat-int out.json']
    : [read, `hierarchy -top ${data.top}`, 'proc', 'flatten', 'opt -nodffe -nosdff', 'techmap', 'opt -nodffe -nosdff', 'abc -g AND,NAND,OR,NOR,XOR,XNOR,MUX', 'opt_clean -purge', 'write_json -compat-int out.json'];
  try {
    const mod = await load();
    const files = {};
    for (const f of data.files) files[f.path] = f.data;
    const out = await mod.runYosys(['-q', '-p', steps.join('; ')], files, { stdout: sink, stderr: sink });
    const json = out['out.json'];
    postMessage({ type: 'netlist', id: data.id, ok: true, json: typeof json === 'string' ? json : dec.decode(json), log, ms: performance.now() - t0 });
  } catch (e) {
    postMessage({ type: 'netlist', id: data.id, ok: false, log: log + '\n' + String(e && e.message || e), ms: performance.now() - t0 });
  }
};
