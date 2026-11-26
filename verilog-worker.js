// Verilog worker: Icarus Verilog compiled to WebAssembly (@veriflow/iverilog-wasm, GPL-2.0-or-later; source:
// https://github.com/AlexMercer12138/iverilog). Its three stages run here, each in a fresh in-memory file system:
// ivlpp (preprocessor) -> ivl (compiler, writes a .vvp program) -> vvp (simulator, prints $display, writes the VCD).
// The package's JavaScript loaders are built for Node; every Node-only path in them is behind one constant,
// ENVIRONMENT_IS_NODE, so they are loaded with that switched off and the browser paths are used instead.
const IVERILOG = 'https://cdn.jsdelivr.net/npm/@veriflow/iverilog-wasm@0.1.4/dist/runtime/';
const STAGES = ['ivlpp', 'ivl', 'vvp'];
const factories = {}, modules = {};

async function loadStage(name) {
  if (factories[name]) return;
  const [js, wasm] = await Promise.all([
    fetch(IVERILOG + name + '.mjs').then(r => { if (!r.ok) throw new Error(`could not load ${name}.mjs (${r.status})`); return r.text(); }),
    fetch(IVERILOG + name + '.wasm').then(r => { if (!r.ok) throw new Error(`could not load ${name}.wasm (${r.status})`); return r.arrayBuffer(); })
  ]);
  const patched = js.replace(/ENVIRONMENT_IS_NODE\s*=\s*true/, 'ENVIRONMENT_IS_NODE=false');
  if (patched === js) throw new Error(`unexpected ${name}.mjs (the Node switch was not found)`);
  const url = URL.createObjectURL(new Blob([patched], { type: 'text/javascript' }));
  factories[name] = (await import(url)).default;
  modules[name] = await WebAssembly.compile(wasm);
}

// run one stage: a fresh instance, the given files, the given arguments
async function stage(name, files, args, out) {
  const mod = await factories[name]({
    noInitialRun: true,
    instantiateWasm(imports, done) { WebAssembly.instantiate(modules[name], imports).then(inst => done(inst, modules[name])); return {}; },
    print: t => out.push([1, t + '\n']),
    printErr: t => out.push([2, t + '\n'])
  });
  mod.FS.mkdirTree('/work'); mod.FS.mkdirTree('/.iverilog');
  for (const [path, data] of files) {
    const dest = path.startsWith('/') ? path : '/work/' + path;
    mod.FS.mkdirTree(dest.slice(0, dest.lastIndexOf('/')) || '/work');
    mod.FS.writeFile(dest, data);
  }
  mod.FS.chdir('/work');
  let code = 0;
  try { code = mod.callMain(args) ?? 0; } catch (e) { if (Number.isInteger(e && e.status)) code = e.status; else throw e; }
  return { code, mod };
}
const read = (mod, p) => { try { return mod.FS.readFile(p); } catch (_) { return null; } };

onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try { await Promise.all(STAGES.map(loadStage)); postMessage({ type: 'ready' }); }
    catch (e) { postMessage({ type: 'fatal', message: String(e && e.message || e) }); }
    return;
  }
  if (data.type !== 'run') return;
  const t0 = performance.now();
  const out = [];
  const files = data.files.map(f => [f.path, f.data]);
  const sources = data.files.filter(f => /\.(s?v|vh?)$/i.test(f.path) && !f.include).map(f => f.path);
  const done = (ok, stageName, extra = {}) => postMessage({ type: 'done', ok, stage: stageName, out, ms: performance.now() - t0, ...extra });
  try {
    // 1. preprocess (`include, `define)
    const flags = ['D:__ICARUS__=1', ...(data.defines || []).map(d => 'D:' + d)].join('\n') + '\n';
    const pp = await stage('ivlpp', [...files, ['/.iverilog/ivlpp.flags', flags]], ['-F', '/.iverilog/ivlpp.flags', '-L', '-o', '/.iverilog/pre.v', ...sources], out);
    if (pp.code !== 0) return done(false, 'preprocess');
    const pre = read(pp.mod, '/.iverilog/pre.v');
    // 2. compile to a vvp program
    const gen = data.generation || '2012';
    const conf = ['basedir:/work', 'module:system.vpi', 'module:v2005_math.vpi', 'module:v2009.vpi', '-t:dll', 'flag:DLL=vvp.tgt',
      `generation:${gen}`, 'generation:no-specify', 'out:/.iverilog/program.vvp', 'iwidth:32', 'widthcap:65536', 'functor:cprop', 'functor:nodangle',
      ...(data.roots || (data.top ? [data.top] : [])).map(r => `root:${r}`), ''].join('\n');
    const cc = await stage('ivl', [['/.iverilog/pre.v', pre], ['/.iverilog/ivl.conf', conf]], ['-C/.iverilog/ivl.conf', '--', '/.iverilog/pre.v'], out);
    if (cc.code !== 0) return done(false, 'compile');
    const prog = read(cc.mod, '/.iverilog/program.vvp');
    if (data.compileOnly) return done(true, 'compile');
    // 3. simulate
    postMessage({ type: 'simulating' });
    const sim = await stage('vvp', [...files, ['/.iverilog/program.vvp', prog]], ['/.iverilog/program.vvp'], out);
    const vcdPath = data.vcd || 'wave.vcd';
    const vcd = read(sim.mod, '/work/' + vcdPath);
    done(sim.code === 0, 'run', { code: sim.code, vcd: vcd ? new TextDecoder().decode(vcd) : '' });
  } catch (e) {
    out.push([2, String(e && e.message || e) + '\n']);
    done(false, 'internal');
  }
};
