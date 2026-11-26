// Runner worker: runs one compiled WASI program with the given stdin and streams its output back.
// The page creates a fresh runner for every run and terminates it if the program runs too long.
import { WASI, File, OpenFile, ConsoleStdout, PreopenDirectory, WASIProcExit } from 'https://cdn.jsdelivr.net/npm/@bjorn3/browser_wasi_shim@0.4.2/dist/index.js';

let LIMIT = 200000;   // characters of output before it is cut off (the step-through asks for more)
let sent = 0, buf = [], timer = null;
function flush() { if (buf.length) { postMessage({ type: 'out', chunks: buf }); buf = []; } timer = null; }
function emit(stream, text) {
  if (sent > LIMIT) return;
  sent += text.length;
  if (sent > LIMIT) text = text.slice(0, Math.max(0, text.length - (sent - LIMIT))) + '\n… output cut off after 200,000 characters …\n';
  buf.push([stream, text]);
  if (!timer) timer = setTimeout(flush, 30);
}
// stream raw bytes, decoding UTF-8 across chunk boundaries
function sink(stream) {
  const dec = new TextDecoder();
  return new ConsoleStdout(bytes => emit(stream, dec.decode(bytes, { stream: true })));
}

onmessage = async ({ data }) => {
  const { wasm, stdin } = data;
  if (data.limit) LIMIT = data.limit;
  const fds = [new OpenFile(new File(new TextEncoder().encode(stdin))), sink(1), sink(2), new PreopenDirectory('.', [])];
  const wasi = new WASI(['main'], [], fds);
  const t0 = performance.now();
  let code = 0, trap = null;
  try {
    const inst = await WebAssembly.instantiate(await WebAssembly.compile(wasm), { wasi_snapshot_preview1: wasi.wasiImport });
    code = wasi.start(inst);
  } catch (e) {
    if (e instanceof WASIProcExit) code = e.code;
    else trap = String(e && e.message || e);
  }
  flush();
  postMessage({ type: 'done', code, trap, ms: performance.now() - t0 });
};
