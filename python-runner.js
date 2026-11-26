// Python worker: CPython compiled to WebAssembly (Pyodide). Loads once, then runs programs on request with the
// Input box as stdin, streaming output back. The page terminates the worker if a program runs too long.
const PYODIDE = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.8/';
const LIMIT = 200000;   // characters of output before it is cut off

let py = null, stdinText = '', stdinGiven = false, sent = 0, buf = [], last = 0;
function flush() { if (buf.length) { postMessage({ type: 'out', chunks: buf }); buf = []; } last = performance.now(); }
function emit(stream, text) {
  if (!text || sent > LIMIT) return;
  sent += text.length;
  if (sent > LIMIT) text = text.slice(0, Math.max(0, text.length - (sent - LIMIT))) + '\n… output cut off after 200,000 characters …\n';
  buf.push([stream, text]);
  // the program runs synchronously, so timers cannot fire: send output as it comes, a few times a second
  if (performance.now() - last > 40) flush();
}
function sink(stream) {
  const dec = new TextDecoder();
  return { write: bytes => { emit(stream, dec.decode(bytes, { stream: true })); return bytes.length; }, isatty: false };
}

// Runs the program as __main__ in a fresh namespace; prints a traceback without the harness's own frame.
// Returns (exit code, error line or 0, last line of the traceback).
const HARNESS = `
import sys, traceback, linecache
def __pg_run(src):
    g = {'__name__': '__main__'}
    # lets tracebacks show the lines of the program
    linecache.cache['main.py'] = (len(src), None, src.splitlines(True), 'main.py')
    try:
        exec(compile(src, 'main.py', 'exec'), g)
        return (0, 0, '')
    except SystemExit as e:
        c = e.code
        if c is None: return (0, 0, '')
        if isinstance(c, int): return (c, 0, '')
        print(c, file=sys.stderr)
        return (1, 0, '')
    except BaseException as e:
        tb = e.__traceback__
        if tb is not None and tb.tb_frame.f_code.co_filename != 'main.py':
            tb = tb.tb_next
        text = ''.join(traceback.format_exception(type(e), e, tb))
        sys.stderr.write(text)
        line = 0
        if isinstance(e, SyntaxError) and e.filename == 'main.py':
            line = e.lineno or 0
        t = tb
        while t is not None:
            if t.tb_frame.f_code.co_filename == 'main.py':
                line = t.tb_lineno
            t = t.tb_next
        lines = [l for l in text.strip().splitlines() if l.strip()]
        msg = lines[-1].strip() if lines else type(e).__name__
        return (1, line, msg)
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
`;


// the program's other .py files go next to main.py (the current directory), so "import shapes" finds them;
// modules imported before are forgotten, so edits to them take effect on the next run
let written = [];
function syncFiles(files) {
  const keep = (files || []).filter(f => f && /^[\w\-]+\.py$/.test(f.name) && f.name !== 'main.py');
  const names = keep.map(f => f.name);
  for (const old of written) if (!names.includes(old)) { try { py.FS.unlink(old); } catch (_) {} }
  for (const f of keep) py.FS.writeFile(f.name, f.text);
  const mods = [...new Set([...written, ...names])].map(n => n.replace(/\.py$/, ''));
  written = names;
  py.runPython(`import sys, os, importlib\nsys.dont_write_bytecode = True\nif os.getcwd() not in sys.path: sys.path.insert(0, os.getcwd())\nfor __m in ${JSON.stringify(mods)}:\n    sys.modules.pop(__m, None)\nimportlib.invalidate_caches()`);
}

onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try {
      const { loadPyodide } = await import(PYODIDE + 'pyodide.mjs');
      py = await loadPyodide({ indexURL: PYODIDE });
      py.setStdout(sink(1));
      py.setStderr(sink(2));
      py.setStdin({ stdin: () => { if (stdinGiven) return null; stdinGiven = true; return stdinText; }, isatty: false });
      py.runPython(HARNESS);
      postMessage({ type: 'ready', version: py.runPython('import sys; sys.version.split()[0]') });
    } catch (e) { postMessage({ type: 'fatal', message: String(e && e.message || e) }); }
    return;
  }
  if (data.type !== 'run') return;
  stdinText = data.stdin; stdinGiven = false; sent = 0; buf = []; last = performance.now();
  try { syncFiles(data.files); } catch (e) { emit(2, 'Could not write the program files: ' + e + '\n'); }
  postMessage({ type: 'started' });
  const t0 = performance.now();
  let code = 0, line = 0, msg = '';
  try {
    const r = py.globals.get('__pg_run')(data.source);
    [code, line, msg] = r.toJs(); r.destroy();
  } catch (e) { code = 1; msg = String(e && e.message || e); emit(2, msg + '\n'); }
  flush();
  postMessage({ type: 'done', code, line, msg, ms: performance.now() - t0 });
};
