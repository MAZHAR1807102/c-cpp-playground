// Notebook kernel: CPython (Pyodide) in a worker that keeps its variables between cells, like a Jupyter kernel.
// Packages (numpy, pandas, scikit-learn, matplotlib…) are loaded when a cell imports them or asks with %pip install.
// Cell output (text, tables, plots) is streamed back to the page as it is produced.
const PYODIDE = 'https://cdn.jsdelivr.net/npm/pyodide@314.0.8/';
const PACKAGES = 'https://cdn.jsdelivr.net/pyodide/v314.0.8/full/';
// pure-Python packages that are not part of Pyodide: import name -> what micropip installs (a name or a list of wheels)
const EXTRA = { seaborn: 'seaborn==0.13.2', openpyxl: 'openpyxl' };
// the desktop app lists the packages it carries; null means every Pyodide package can be downloaded
const OFFLINE = null;
const LIMIT = 500000;   // characters of text output per cell before it is cut off

let muted = false;   // true while micropip installs: its progress lines are not the student's output
// nbRun / nbComplete / nbFiles: the kernel's Python functions, looked up once (each lookup makes a proxy that must be freed)
let nbRun = null, nbComplete = null, nbFiles = null;
let py = null, lock = {}, importToPkg = {}, cur = null, sent = 0, buf = [], last = 0, interrupt = null;

function flush() { if (buf.length) { postMessage({ type: 'out', id: cur, items: buf }); buf = []; } last = performance.now(); }
function push(kind, data) {
  if (kind === 'stdout' || kind === 'stderr') {
    if (!data || sent > LIMIT || (muted && kind === 'stdout')) return;
    sent += data.length;
    if (sent > LIMIT) data = data.slice(0, Math.max(0, data.length - (sent - LIMIT))) + '\n… output cut off after 500,000 characters …\n';
  }
  buf.push([kind, data]);
  // the cell runs synchronously, so timers cannot fire: send output as it comes, a few times a second
  if (performance.now() - last > 40) flush();
}
function sink(kind) {
  const dec = new TextDecoder();
  return { write: bytes => { push(kind, dec.decode(bytes, { stream: true })); return bytes.length; }, isatty: false };
}
const note = text => push('note', text);

// Python side: runs a cell in one shared namespace, shows the value of the last line, sends figures and rich output.
const NB = String.raw`
import sys, os, ast, io, base64, inspect, traceback, linecache, builtins, warnings
import pg_js
os.environ['MPLBACKEND'] = 'module://pg_inline'
# a warning from inside Pyodide's own glue (scikit-learn's thread check), not about the student's code
warnings.filterwarnings('ignore', message='.*JsProxy.as_object_map')

NS = {'__name__': '__main__', '__builtins__': builtins}

def _flush():
    try:
        sys.stdout.flush(); sys.stderr.flush()
    except Exception:
        pass

def emit(kind, data):
    _flush()
    pg_js.emit(kind, data)

def _png(fig):
    b = io.BytesIO()
    fig.savefig(b, format='png', bbox_inches='tight', dpi=100)
    return base64.b64encode(b.getvalue()).decode()

def _rich(obj):
    fig_mod = sys.modules.get('matplotlib.figure')
    if fig_mod is not None and isinstance(obj, fig_mod.Figure):
        return 'png', _png(obj)
    if not isinstance(obj, type):
        for meth, kind in (('_repr_html_', 'html'), ('_repr_svg_', 'svg'), ('_repr_png_', 'png'), ('_repr_markdown_', 'markdown')):
            f = getattr(obj, meth, None)
            if callable(f):
                try:
                    r = f()
                except Exception:
                    r = None
                if isinstance(r, tuple):
                    r = r[0]
                if r is not None:
                    if kind == 'png' and isinstance(r, (bytes, bytearray)):
                        r = base64.b64encode(r).decode()
                    return kind, r
    return 'text', repr(obj)

def display(*objs):
    """Show each object below the cell: tables as tables, figures as pictures, anything else as text."""
    for o in objs:
        k, d = _rich(o)
        emit(k, d)

def flush_figures():
    plt = sys.modules.get('matplotlib.pyplot')
    if plt is None:
        return
    for num in plt.get_fignums():
        emit('png', _png(plt.figure(num)))
    plt.close('all')

def _no_input(prompt=''):
    raise RuntimeError("input() cannot be used in the notebook. Put the value in a variable instead, for example: n = 5")

NS['display'] = display
NS['input'] = _no_input

def _short_tb(e, fname):
    tb = e.__traceback__
    # drop the notebook's own frames at the top
    while tb is not None and not tb.tb_frame.f_code.co_filename.startswith('<cell'):
        tb = tb.tb_next
    if tb is None and not isinstance(e, SyntaxError):
        tb = e.__traceback__
    return tb

async def run(src, fname):
    linecache.cache[fname] = (len(src), None, src.splitlines(True), fname)
    try:
        flags = ast.PyCF_ALLOW_TOP_LEVEL_AWAIT
        tree = ast.parse(src, fname)
        last = None
        if tree.body and isinstance(tree.body[-1], ast.Expr) and not src.rstrip().endswith(';'):
            last = ast.Expression(tree.body.pop().value)
        r = eval(compile(tree, fname, 'exec', flags=flags), NS)
        if inspect.iscoroutine(r):
            await r
        if last is not None:
            v = eval(compile(last, fname, 'eval', flags=flags), NS)
            if inspect.iscoroutine(v):
                v = await v
            if v is not None:
                NS['_'] = v
                k, d = _rich(v)
                emit('result:' + k, d)
        flush_figures()
        return (True, 0, '', '')
    except BaseException as e:
        plt = sys.modules.get('matplotlib.pyplot')
        if plt is not None:
            plt.close('all')
        tb = _short_tb(e, fname)
        text = ''.join(traceback.format_exception(type(e), e, tb))
        emit('error', text)
        line = 0
        if isinstance(e, SyntaxError) and e.filename == fname:
            line = e.lineno or 0
        t = tb
        while t is not None:
            if t.tb_frame.f_code.co_filename == fname:
                line = t.tb_lineno
            t = t.tb_next
        missing = e.name if isinstance(e, ModuleNotFoundError) and e.name else ''
        return (False, line, (text.strip().splitlines() or [type(e).__name__])[-1].strip(), missing or '')
    finally:
        _flush()

def complete(text):
    """Names that could follow text, e.g. 'np.ar' -> ['np.arange', 'np.array', ...], from the live variables."""
    import rlcompleter, keyword
    c = rlcompleter.Completer(NS)
    out = []
    for i in range(400):
        try:
            s = c.complete(text, i)
        except Exception:
            break
        if s is None:
            break
        out.append(s)
    return out

def files():
    out = []
    for n in sorted(os.listdir('.')):
        if os.path.isfile(n) and not n.startswith('.'):
            out.append((n, os.path.getsize(n)))
    return out
`;

// a matplotlib backend whose plt.show() sends the figures to the page
const INLINE = String.raw`
from matplotlib.backends.backend_agg import FigureCanvasAgg as FigureCanvas
from matplotlib.backend_bases import FigureManagerBase as FigureManager

def show(*args, **kwargs):
    import pg_nb
    pg_nb.flush_figures()
`;

const norm = n => n.toLowerCase().replace(/_/g, '-');
function installedNames() { return Object.keys(py.loadedPackages || {}).map(norm); }
function available(name) { return !OFFLINE || OFFLINE.includes(name); }

// load Pyodide packages, reporting progress in the cell output
async function loadPkgs(names, main) {
  names = names.filter(n => !installedNames().includes(n));
  if (!names.length) return true;
  const missing = names.filter(n => !available(n));
  if (missing.length) { push('stderr', `${missing.join(', ')} is not included in the offline app.\n`); return false; }
  postMessage({ type: 'status', text: 'Loading ' + names.join(', ') + '…' });
  let ok = true;
  const t0 = performance.now();
  await py.loadPackage(names, { messageCallback: () => {}, errorCallback: m => { ok = false; push('stderr', m + '\n'); } });
  let shown = main ? names.filter(n => main.includes(n)) : names;
  if (!shown.length) shown = names;
  const rest = names.length - shown.length;
  if (ok) note(`Loaded ${shown.join(', ')}${rest ? ` and ${rest} helper librar${rest === 1 ? 'y' : 'ies'}` : ''} in ${((performance.now() - t0) / 1000).toFixed(1)} s (only the first time after Python starts).`);
  flush();
  return ok;
}

async function micropipInstall(spec) {
  if (!(await loadPkgs(['micropip']))) return false;
  const label = Array.isArray(spec) ? spec.map(s => s.split('/').pop().split('-')[0]).join(', ') : spec;
  postMessage({ type: 'status', text: 'Installing ' + label + '…' });
  flush();
  try {
    let list = Array.isArray(spec) ? spec : null;
    if (list && list.some(u => !/^https?:/.test(u))) {
      // micropip only downloads from http(s); copy bundled wheels into Python's file system and install from there
      py.FS.mkdirTree('/tmp/wheels');
      list = await Promise.all(list.map(async u => {
        const name = '/tmp/wheels/' + u.split('/').pop();
        py.FS.writeFile(name, new Uint8Array(await (await fetch(u)).arrayBuffer()));
        return 'emfs:' + name;
      }));
    }
    const arg = list ? py.toPy(list) : spec;
    muted = true;
    const mp = py.pyimport('micropip');
    try { await mp.install(arg); } finally { muted = false; mp.destroy(); }
    if (arg.destroy) arg.destroy();
    return true;
  } catch (e) {
    const msg = String(e && e.message || e).trim().split('\n').pop();
    push('stderr', `Could not install ${label}: ${msg}\n` + (OFFLINE ? 'The offline app can only use the packages it carries.\n' : 'Packages that are not part of Pyodide must be pure Python (a "py3-none-any" wheel on PyPI).\n'));
    return false;
  }
}

// %pip install names
async function install(names) {
  for (const raw of names) {
    const name = norm(raw.split(/[=<>~!\[;]/)[0]);
    if (!name) continue;
    if (installedNames().includes(name)) { note(`${name} is already installed.`); continue; }
    if (lock[name]) { if (await loadPkgs([name])) note(`Installed ${name} ${lock[name].version}.`); continue; }
    const extra = EXTRA[name] || (OFFLINE ? null : raw);
    if (!extra) { push('stderr', `${name} is not included in the offline app.\n`); continue; }
    if (await micropipInstall(extra)) note(`Installed ${name}.`);
  }
  flush();
}

// packages for the cell's import lines, loaded before it runs
async function autoload(src) {
  const mods = new Set();
  for (const m of src.matchAll(/^[ \t]*(?:import[ \t]+([\w.]+(?:[ \t]*,[ \t]*[\w.]+)*)|from[ \t]+([\w.]+)[ \t]+import)/gm)) {
    (m[1] ? m[1].split(',') : [m[2]]).forEach(x => mods.add(x.trim().split('.')[0]));
  }
  const want = new Set(), extra = [], direct = [];
  for (const mod of mods) {
    const pkg = importToPkg[mod];
    if (pkg) {
      want.add(pkg); direct.push(pkg);
      for (const d of deps(pkg)) want.add(d);
    } else if (EXTRA[mod] && !installedNames().includes(mod)) extra.push(mod);
  }
  const need = [...want].filter(n => !installedNames().includes(n));
  if (need.length) await loadPkgs(need, direct);
  for (const x of extra) await micropipInstall(EXTRA[x]);
}
function deps(pkg, seen = new Set()) {
  for (const d of (lock[pkg] && lock[pkg].depends) || []) if (!seen.has(d)) { seen.add(d); deps(d, seen); }
  return seen;
}

let counter = 0;
onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try {
      interrupt = data.interrupt || null;
      const { loadPyodide } = await import(PYODIDE + 'pyodide.mjs');
      py = await loadPyodide({ indexURL: PYODIDE, packageBaseUrl: PACKAGES });
      try { lock = (await (await fetch(PYODIDE + 'pyodide-lock.json')).json()).packages; } catch (_) { lock = {}; }
      for (const [name, p] of Object.entries(lock)) {
        if (p.package_type !== 'package' || !available(name)) continue;
        for (const i of p.imports || []) if (!importToPkg[i]) importToPkg[i] = name;
      }
      py.setStdout(sink('stdout'));
      py.setStderr(sink('stderr'));
      py.setStdin({ error: true });
      if (interrupt) py.setInterruptBuffer(interrupt);
      py.registerJsModule('pg_js', { emit: (k, d) => push(k, d) });
      py.FS.mkdirTree('/lib/pg');
      py.FS.writeFile('/lib/pg/pg_nb.py', NB);
      py.FS.writeFile('/lib/pg/pg_inline.py', INLINE);
      py.runPython("import sys; sys.path.insert(0, '/lib/pg'); import pg_nb");
      { const nb = py.pyimport('pg_nb'); nbRun = nb.run; nbComplete = nb.complete; nbFiles = nb.files; }   // kept for the kernel's lifetime
      const pkgs = OFFLINE || Object.keys(lock).filter(n => lock[n].package_type === 'package');
      postMessage({ type: 'ready', version: py.runPython('import sys; sys.version.split()[0]'), packages: pkgs.map(n => [n, lock[n] ? lock[n].version : '']), extra: Object.keys(EXTRA), offline: !!OFFLINE, interrupt: !!interrupt });
    } catch (e) { postMessage({ type: 'fatal', message: String(e && e.message || e) }); }
    return;
  }

  if (data.type === 'run') {
    cur = data.id; sent = 0; buf = []; last = performance.now();
    if (interrupt) interrupt[0] = 0;
    const t0 = performance.now();
    let res = [false, 0, '', ''];
    try {
      // %pip install … lines; other magics and shell commands are not available
      const lines = data.source.split('\n'), pip = [];
      lines.forEach((l, i) => {
        const m = l.match(/^\s*[%!]\s*pip3?\s+install\s+(.*)$/);
        if (m) { pip.push(...m[1].split(/\s+/).filter(x => x && !x.startsWith('-'))); lines[i] = ''; }
        else if (/^\s*%(matplotlib|config)\b/.test(l)) lines[i] = '';
        else if (/^\s*[%!]/.test(l)) { note(`${l.trim()}: shell commands and magics are not available here (only %pip install is).`); lines[i] = ''; }
      });
      const src = lines.join('\n');
      if (pip.length) await install(pip);
      await autoload(src);
      postMessage({ type: 'status', text: 'Running…' });
      if (!src.trim()) res = [true, 0, '', ''];
      else {
        const r = await nbRun(src, `<cell ${++counter}>`);
        res = r.toJs(); r.destroy();
      }
    } catch (e) { push('error', String(e && e.message || e)); }
    flush();
    postMessage({ type: 'done', id: data.id, ok: res[0], line: res[1], msg: res[2], missing: res[3], ms: performance.now() - t0, packages: installedNames() });
    cur = null;
    return;
  }

  if (data.type === 'install') {
    cur = data.id; sent = 0; buf = [];
    await install(data.names);
    flush();
    postMessage({ type: 'installed', id: data.id, packages: installedNames() });
    cur = null;
    return;
  }

  if (data.type === 'complete') {
    let list = [];
    try { const r = nbComplete(data.text); list = r.toJs(); r.destroy(); } catch (_) {}
    postMessage({ type: 'completions', id: data.id, list });
    return;
  }

  if (data.type === 'putFile') {
    try { py.FS.writeFile(data.name, new Uint8Array(data.bytes)); } catch (e) { postMessage({ type: 'fileError', message: String(e.message || e) }); }
    postMessage({ type: 'files', list: listFiles() });
    return;
  }
  if (data.type === 'getFile') {
    try { const b = py.FS.readFile(data.name); postMessage({ type: 'file', name: data.name, bytes: b.buffer }, [b.buffer]); }
    catch (e) { postMessage({ type: 'fileError', message: String(e.message || e) }); }
    return;
  }
  if (data.type === 'deleteFile') {
    try { py.FS.unlink(data.name); } catch (_) {}
    postMessage({ type: 'files', list: listFiles() });
    return;
  }
  if (data.type === 'files') postMessage({ type: 'files', list: listFiles() });
};

function listFiles() {
  try { const r = nbFiles(); const l = r.toJs(); r.destroy(); return l; } catch (_) { return []; }
}
