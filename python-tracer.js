// Python step-through worker (Pyodide). Runs the program under sys.settrace and records every step: the line about
// to run, the call stack with each frame's variables, the objects they refer to, and how much output there is so far.
// The page shows the steps (visualize.js). Its own Pyodide, so a traced run never disturbs the normal Run.
const PYODIDE = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.8/';

const HARNESS = String.raw`
import sys, io, json, builtins, types, traceback

class _PgStop(BaseException):
    pass

def __pg_trace(src, stdin, max_steps, max_items):
    out = io.StringIO()
    inp = io.StringIO(stdin)
    steps = []
    ids = {}
    keep = []          # keeps every object seen alive, so id() values are never reused during the run
    state = {'truncated': False}

    def ref(o):
        k = id(o)
        if k not in ids:
            ids[k] = len(ids) + 1
            keep.append(o)
        return ids[k]

    def short(s, n=160):
        return s if len(s) <= n else s[:n] + '…'

    def enc(v, heap, depth):
        if v is None:
            return ['x', 'None']
        if isinstance(v, bool):
            return ['b', repr(v)]
        if isinstance(v, (int, float, complex)):
            return ['n', short(repr(v), 60)]
        if isinstance(v, str):
            return ['s', short(repr(v), 120)]
        r = ref(v)
        if r in heap:
            return ['r', r]
        heap[r] = ['other', type(v).__name__, '…']
        if depth > 6:
            return ['r', r]
        tn = type(v).__name__
        try:
            if isinstance(v, (list, tuple)):
                heap[r] = ['list' if isinstance(v, list) else 'tuple', [enc(x, heap, depth + 1) for x in v[:max_items]], len(v), tn]
            elif isinstance(v, (set, frozenset)):
                items = list(v)
                try:
                    items.sort()
                except Exception:
                    pass
                heap[r] = ['set', [enc(x, heap, depth + 1) for x in items[:max_items]], len(v), tn]
            elif isinstance(v, dict):
                heap[r] = ['dict', [[enc(k, heap, depth + 1), enc(x, heap, depth + 1)] for k, x in list(v.items())[:max_items]], len(v), tn]
            elif isinstance(v, types.FunctionType):
                c = v.__code__
                heap[r] = ['fn', v.__name__ + '(' + ', '.join(c.co_varnames[:c.co_argcount]) + ')']
            elif isinstance(v, type):
                heap[r] = ['cls', v.__name__]
            elif hasattr(v, '__dict__') and type(v).__module__ == '__main__':
                heap[r] = ['obj', tn, [[k, enc(x, heap, depth + 1)] for k, x in list(vars(v).items())[:max_items]]]
            elif hasattr(v, '__iter__') and hasattr(v, '__len__') and tn in ('deque', 'array', 'range'):
                items = list(v)
                heap[r] = ['list', [enc(x, heap, depth + 1) for x in items[:max_items]], len(items), tn]
            else:
                heap[r] = ['other', tn, short(repr(v), 120)]
        except Exception as e:
            heap[r] = ['other', tn, '(could not show: ' + type(e).__name__ + ')']
        return ['r', r]

    def snapshot(frame, event, arg):
        chain = []
        f = frame
        while f is not None:
            if f.f_code.co_filename == '<main.py>' and (f.f_code.co_name == '<module>' or not f.f_code.co_name.startswith('<')):
                chain.append(f)
            f = f.f_back
        chain.reverse()
        heap = {}
        frames = []
        for fr in chain:
            top = fr.f_code.co_name == '<module>'
            loc = fr.f_globals if top else fr.f_locals
            items = []
            for k, v in list(loc.items()):
                if k.startswith('__') or isinstance(v, types.ModuleType):
                    continue
                items.append([k, enc(v, heap, 0)])
            frames.append({'n': 'Global' if top else fr.f_code.co_name, 'k': ref(fr), 'ln': fr.f_lineno, 'v': items})
        step = {'l': frame.f_lineno, 'ev': event, 'st': frames, 'h': heap, 'o': out.tell()}
        if event == 'return':
            step['rv'] = enc(arg, heap, 0)
        elif event == 'exception':
            step['ex'] = arg[0].__name__ + (': ' + str(arg[1]) if str(arg[1]) else '')
        steps.append(step)
        if len(steps) >= max_steps:
            state['truncated'] = True
            raise _PgStop()

    def tracer(frame, event, arg):
        code = frame.f_code
        if code.co_filename != '<main.py>':
            return None
        if code.co_name.startswith('<') and code.co_name != '<module>':
            return tracer          # comprehensions and lambdas: follow calls inside them, but record no steps of their own
        if event in ('call', 'line', 'return', 'exception'):
            snapshot(frame, event, arg)
        return tracer

    def _input(prompt=''):
        out.write(str(prompt))
        line = inp.readline()
        if not line:
            raise EOFError('EOF when reading a line (add more lines to the Input box)')
        return line[:-1] if line.endswith('\n') else line

    b = dict(builtins.__dict__)
    b['input'] = _input
    g = {'__name__': '__main__', '__builtins__': b}
    error, err_line = '', 0
    old = sys.stdout, sys.stderr, sys.stdin
    try:
        code = compile(src, '<main.py>', 'exec')
    except SyntaxError as e:
        return json.dumps({'steps': [], 'out': '', 'error': 'SyntaxError: ' + str(e.msg), 'errLine': e.lineno or 0, 'truncated': False})
    sys.stdout, sys.stderr, sys.stdin = out, out, inp
    sys.settrace(tracer)
    try:
        exec(code, g)
    except _PgStop:
        pass
    except SystemExit:
        pass
    except BaseException as e:
        error = type(e).__name__ + (': ' + str(e) if str(e) else '')
        t = e.__traceback__
        while t is not None:
            if t.tb_frame.f_code.co_filename == '<main.py>':
                err_line = t.tb_lineno
            t = t.tb_next
    finally:
        sys.settrace(None)
        sys.stdout, sys.stderr, sys.stdin = old
    return json.dumps({'steps': steps, 'out': out.getvalue(), 'error': error, 'errLine': err_line, 'truncated': state['truncated']})
`;

let py = null;
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
      py.runPython(HARNESS);
      postMessage({ type: 'ready' });
    } catch (e) { postMessage({ type: 'fatal', message: String(e && e.message || e) }); }
    return;
  }
  if (data.type !== 'trace') return;
  const t0 = performance.now();
  try { syncFiles(data.files); } catch (_) {}
  try {
    const json = py.globals.get('__pg_trace')(data.source, data.stdin, data.maxSteps || 1500, data.maxItems || 60);
    postMessage({ type: 'trace', ...JSON.parse(json), ms: performance.now() - t0 });
  } catch (e) {
    postMessage({ type: 'trace', steps: [], out: '', error: String(e && e.message || e), errLine: 0, truncated: false, ms: performance.now() - t0 });
  }
};
