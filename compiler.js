// Compiler worker: loads Clang (LLVM, compiled to WebAssembly by the YoWASP project) once, then compiles
// C or C++ source to a WASI program (wasm32-wasip1) on request. Runs off the main thread so typing stays smooth.
const CLANG = 'https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20695-13/gen/bundle.js';
let clang = null;

async function load() {
  if (clang) return clang;
  const mod = await import(CLANG);
  // calling a command with no arguments only downloads and prepares the resources
  await mod.commands.clang(undefined, undefined, {
    fetchProgress: ({ done, total }) => postMessage({ type: 'progress', done, total })
  });
  clang = mod;
  return mod;
}

onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try { await load(); postMessage({ type: 'ready' }); }
    catch (e) { postMessage({ type: 'fatal', message: String(e && e.message || e) }); }
    return;
  }
  if (data.type !== 'compile') return;
  const { id, lang, source, std, opt } = data;
  const file = lang === 'c' ? 'main.c' : 'main.cpp';
  const args = [file, '-o', 'main.wasm', `-${opt}`, `-std=${std}`, '-Wall', '-Wextra', '-fno-color-diagnostics', '-fmessage-length=0'];
  if (lang === 'cpp') args.push('-fno-exceptions');   // the bundled libc++ is built without exception support
  if (lang === 'c') args.push('-lm');
  let diag = '';
  const stderr = bytes => { if (bytes) diag += new TextDecoder().decode(bytes); };
  const t0 = performance.now();
  try {
    const mod = await load();
    const out = await mod.commands[lang === 'c' ? 'clang' : 'clang++'](args, { [file]: source }, { stdout: stderr, stderr });
    const wasm = out['main.wasm'];
    postMessage({ type: 'compiled', id, ok: true, wasm, diag, ms: performance.now() - t0 }, [wasm.buffer]);
  } catch (e) {
    if (e && typeof e.code === 'number') postMessage({ type: 'compiled', id, ok: false, diag, ms: performance.now() - t0 });
    else postMessage({ type: 'compiled', id, ok: false, diag: diag + '\n' + String(e && e.message || e), ms: performance.now() - t0 });
  }
};
