// Compiler worker: loads Clang (LLVM, compiled to WebAssembly by the YoWASP project) once, then compiles
// C or C++ source to a WASI program (wasm32-wasip1) on request. Runs off the main thread so typing stays smooth.
const CLANG = 'https://cdn.jsdelivr.net/npm/@yowasp/clang@22.0.0-git20695-13/gen/bundle.js';
let clang = null;

// GCC's <bits/stdc++.h> does not exist in libc++, so we supply our own: every standard header that
// compiles here (csetjmp and csignal are left out because WebAssembly has no setjmp or signals).
const H = (std, list) => `#if __cplusplus >= ${std}\n` + list.split(' ').map(h => `#include <${h}>`).join('\n') + '\n#endif\n';
const STDCPP = '// bits/stdc++.h for the C/C++ playground (libc++ on WebAssembly)\n#ifndef PLAYGROUND_STDCPP_H\n#define PLAYGROUND_STDCPP_H\n'
  + H(0, 'cassert cctype cerrno cfloat ciso646 climits clocale cmath cstdarg cstddef cstdio cstdlib cstring ctime cwchar cwctype '
    + 'algorithm bitset complex deque exception fstream functional iomanip ios iosfwd iostream istream iterator limits list locale map memory new numeric ostream queue set sstream stack stdexcept streambuf string typeinfo utility valarray vector')
  + H(201103, 'array atomic chrono cfenv cinttypes cstdint cuchar condition_variable forward_list future initializer_list mutex random ratio regex scoped_allocator system_error thread tuple typeindex type_traits unordered_map unordered_set')
  + H(201402, 'shared_mutex')
  + H(201703, 'any charconv execution filesystem optional string_view variant memory_resource')
  + H(202002, 'barrier bit compare concepts coroutine latch numbers ranges semaphore source_location span stop_token syncstream version')
  + H(202302, 'expected print mdspan flat_map flat_set')
  // GCC library extensions that competitive-programming code often uses with this header
  + 'namespace std {\n'
  + 'template <class T> inline T __gcd(T a, T b) { while (b != 0) { T t = a % b; a = b; b = t; } return a; }\n'
  + 'inline int __lg(unsigned long long n) { return 63 - __builtin_clzll(n); }\n'
  + 'inline int __lg(long long n) { return __lg((unsigned long long)n); }\n'
  + 'inline int __lg(unsigned long n) { return __lg((unsigned long long)n); }\n'
  + 'inline int __lg(long n) { return __lg((unsigned long long)n); }\n'
  + 'inline int __lg(unsigned n) { return __lg((unsigned long long)n); }\n'
  + 'inline int __lg(int n) { return __lg((unsigned long long)n); }\n'
  + '}\n#endif\n';

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
  const args = [file, '-o', 'main.wasm', `-${opt}`, `-std=${std}`, '-Wall', '-Wextra', '-fno-color-diagnostics', '-fmessage-length=0', '-fdiagnostics-parseable-fixits'];
  if (lang === 'cpp') args.push('-fno-exceptions', '-isystem', 'extra');   // the bundled libc++ is built without exception support
  if (lang === 'c') args.push('-lm');
  let diag = '';
  const stderr = bytes => { if (bytes) diag += new TextDecoder().decode(bytes); };
  const t0 = performance.now();
  try {
    const mod = await load();
    const out = await mod.commands[lang === 'c' ? 'clang' : 'clang++'](args, lang === 'cpp' ? { [file]: source, extra: { bits: { 'stdc++.h': STDCPP } } } : { [file]: source }, { stdout: stderr, stderr });
    const wasm = out['main.wasm'];
    postMessage({ type: 'compiled', id, ok: true, wasm, diag, ms: performance.now() - t0 }, [wasm.buffer]);
  } catch (e) {
    if (e && typeof e.code === 'number') postMessage({ type: 'compiled', id, ok: false, diag, ms: performance.now() - t0 });
    else postMessage({ type: 'compiled', id, ok: false, diag: diag + '\n' + String(e && e.message || e), ms: performance.now() - t0 });
  }
};
