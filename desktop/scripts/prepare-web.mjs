// Build desktop/web from the website in the repository root, with every CDN file replaced by a local copy
// from node_modules, so that the app works with no internet connection.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');            // the website
const desk = join(here, '..');
const nm = join(desk, 'node_modules');
const web = join(desk, 'web');
const vendor = join(web, 'vendor');

rmSync(web, { recursive: true, force: true });
mkdirSync(vendor, { recursive: true });

// Clang (YoWASP) and the WASI shim
cpSync(join(nm, '@yowasp/clang/gen'), join(vendor, 'yowasp'), { recursive: true });
cpSync(join(nm, '@bjorn3/browser_wasi_shim/dist'), join(vendor, 'wasi-shim'), { recursive: true, filter: f => !/\.(ts|tsbuildinfo|map)$/.test(f) });

// Python (Pyodide core: interpreter + standard library) and Java (javac + TeaVM)
mkdirSync(join(vendor, 'pyodide'), { recursive: true });
for (const f of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'])
  cpSync(join(nm, 'pyodide', f), join(vendor, 'pyodide', f));
cpSync(join(nm, '@live-codes/java-wasm/dist'), join(vendor, 'java-wasm'), { recursive: true, filter: f => !/\.d\.ts$/.test(f) });

// notebook libraries: Pyodide wheels (checked against the lock file's sha256), cached between builds,
// plus pure-Python wheels from PyPI that Pyodide does not carry
const NB_PACKAGES = ['numpy', 'pandas', 'scipy', 'scikit-learn', 'matplotlib', 'statsmodels', 'sympy', 'networkx', 'micropip'];
const PYPI = [['seaborn', '0.13.2'], ['openpyxl', '3.1.5'], ['et-xmlfile', '2.0.0']];
const lockPkgs = JSON.parse(readFileSync(join(nm, 'pyodide', 'pyodide-lock.json'), 'utf8')).packages;
const pyVersion = JSON.parse(readFileSync(join(nm, 'pyodide', 'package.json'), 'utf8')).version;
const want = new Set();
(function walk(list) { for (const n of list) if (!want.has(n)) { want.add(n); walk(lockPkgs[n].depends || []); } })(NB_PACKAGES);
const cache = join(desk, '.cache', 'wheels');
mkdirSync(cache, { recursive: true });
async function fetchChecked(url, file, sha) {
  const dest = join(cache, file);
  if (!existsSync(dest) || createHash('sha256').update(readFileSync(dest)).digest('hex') !== sha) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`download failed (${r.status}): ${url}`);
    const buf = Buffer.from(await r.arrayBuffer());
    if (createHash('sha256').update(buf).digest('hex') !== sha) throw new Error('checksum mismatch: ' + file);
    writeFileSync(dest, buf);
  }
  return dest;
}
let wheelBytes = 0;
for (const n of want) {
  const p = lockPkgs[n];
  const src = await fetchChecked(`https://cdn.jsdelivr.net/pyodide/v${pyVersion}/full/${p.file_name}`, p.file_name, p.sha256);
  cpSync(src, join(vendor, 'pyodide', p.file_name)); wheelBytes += statSync(src).size;
}
mkdirSync(join(vendor, 'wheels'), { recursive: true });
const extraWheels = {};
for (const [name, ver] of PYPI) {
  const meta = await (await fetch(`https://pypi.org/pypi/${name}/${ver}/json`)).json();
  const w = meta.urls.find(x => x.packagetype === 'bdist_wheel' && /py3-none-any\.whl$/.test(x.filename));
  const src = await fetchChecked(w.url, w.filename, w.digests.sha256);
  cpSync(src, join(vendor, 'wheels', w.filename)); wheelBytes += statSync(src).size;
  extraWheels[name] = w.filename;
}
console.log(`notebook libraries: ${want.size} Pyodide packages + ${PYPI.length} from PyPI, ${(wheelBytes / 1e6).toFixed(1)} MB`);
const wheelUrl = f => `new URL('./vendor/wheels/${f}', self.location.href).href`;
const EXTRA_JS = `const EXTRA = { seaborn: [${wheelUrl(extraWheels.seaborn)}], openpyxl: [${wheelUrl(extraWheels.openpyxl)}, ${wheelUrl(extraWheels['et-xmlfile'])}] };`;
const OFFLINE_JS = `const OFFLINE = ${JSON.stringify([...want].sort())};`;

// CodeMirror 5: only the parts the pages use
for (const d of ['lib', 'mode/clike', 'mode/python', 'mode/markdown', 'addon/edit', 'addon/hint', 'addon/runmode'])
  cpSync(join(nm, 'codemirror', d), join(vendor, 'codemirror', d), { recursive: true });

// fonts (Latin subsets), replacing the Google Fonts stylesheet
const fonts = [
  ['Atkinson Hyperlegible', '@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible', [400, 700]],
  ['Bricolage Grotesque', '@fontsource/bricolage-grotesque', 'bricolage-grotesque', [600, 800]],
  ['JetBrains Mono', '@fontsource/jetbrains-mono', 'jetbrains-mono', [400, 600, 700]]
];
mkdirSync(join(vendor, 'fonts'), { recursive: true });
let css = '';
for (const [family, pkg, stem, weights] of fonts) for (const w of weights) {
  const f = `${stem}-latin-${w}-normal.woff2`;
  cpSync(join(nm, pkg, 'files', f), join(vendor, 'fonts', f));
  css += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${f}) format("woff2")}\n`;
}
writeFileSync(join(vendor, 'fonts.css'), css);

// the pages and their scripts, with CDN addresses rewritten
const localPage = f => readFileSync(join(root, f), 'utf8')
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/, '<link rel="stylesheet" href="vendor/fonts.css">')
  .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/codemirror\/5\.65\.16\/([\w/-]+?)(?:\.min)?\.(js|css)/g,
    (_, p, ext) => `vendor/codemirror/${p === 'codemirror' ? 'lib/codemirror' : p}.${ext}`)
  .replace(/'https:\/\/cdn\.jsdelivr\.net\/npm\/@live-codes\/java-wasm@[^/]+\/dist\/'/, "'./vendor/java-wasm/'");
writeFileSync(join(web, 'index.html'), localPage('index.html'));
writeFileSync(join(web, 'notebook.html'), localPage('notebook.html'));
writeFileSync(join(web, 'stl.html'), localPage('stl.html'));
writeFileSync(join(web, 'algorithms.html'), localPage('algorithms.html'));
for (const f of ['algorithms.js', 'examples-algo.js']) cpSync(join(root, f), join(web, f));
// the animated simulations (sims/, copied from the algorithm-simulations project by tools/sync-sims.mjs), with local fonts
cpSync(join(root, 'sims'), join(web, 'sims'), { recursive: true });
for (const d of readdirSync(join(web, 'sims'))) {
  const f = d === 'index.html' ? join(web, 'sims', d) : join(web, 'sims', d, 'index.html');
  if (!existsSync(f)) continue;
  const fonts = d === 'index.html' ? '../vendor/fonts.css' : '../../vendor/fonts.css';
  writeFileSync(f, readFileSync(f, 'utf8').replace(/<link rel="preconnect"[^>]*>\n?/g, '')
    .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/, `<link rel="stylesheet" href="${fonts}">`));
}
for (const f of ['examples-c.js', 'examples-cpp.js', 'examples-java.js', 'examples-python.js', 'stl-data.js', 'stl.js']) cpSync(join(root, f), join(web, f));
const pyLocal = "new URL('./vendor/pyodide/', self.location.href).href";
let nbRunner = readFileSync(join(root, 'notebook-runner.js'), 'utf8')
  .replace(/^const PYODIDE = .*$/m, `const PYODIDE = ${pyLocal};`)
  .replace(/^const PACKAGES = .*$/m, `const PACKAGES = ${pyLocal};`)
  .replace(/^const EXTRA = .*$/m, EXTRA_JS)
  .replace(/^const OFFLINE = .*$/m, OFFLINE_JS);
if (/https:\/\//.test(nbRunner.split('\n').filter(l => /^const (PYODIDE|PACKAGES|EXTRA|OFFLINE) /.test(l)).join('\n'))) throw new Error('notebook-runner.js still points to the internet');
writeFileSync(join(web, 'notebook-runner.js'), nbRunner);
cpSync(join(root, 'notebook.js'), join(web, 'notebook.js'));
cpSync(join(root, 'notebook-examples.js'), join(web, 'notebook-examples.js'));
writeFileSync(join(web, 'compiler.js'), readFileSync(join(root, 'compiler.js'), 'utf8').replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@yowasp\/clang@[^/]+\/gen\/bundle\.js/, './vendor/yowasp/bundle.js'));
writeFileSync(join(web, 'runner.js'), readFileSync(join(root, 'runner.js'), 'utf8').replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@bjorn3\/browser_wasi_shim@[^/]+\/dist\/index\.js/, './vendor/wasi-shim/index.js'));
writeFileSync(join(web, 'python-runner.js'), readFileSync(join(root, 'python-runner.js'), 'utf8').replace(/'https:\/\/cdn\.jsdelivr\.net\/npm\/pyodide@[^/]+\/'/, "new URL('./vendor/pyodide/', self.location.href).href"));
cpSync(join(root, 'guide.js'), join(web, 'guide.js'));
cpSync(join(root, 'guide-more.js'), join(web, 'guide-more.js'));

// every file the page loads must now be local: fail the build if a CDN address is left anywhere it would be fetched
const problems = [];
for (const f of ['index.html', 'notebook.html', 'stl.html', 'algorithms.html', 'compiler.js', 'runner.js', 'python-runner.js', 'notebook-runner.js']) {
  const text = readFileSync(join(web, f), 'utf8');
  for (const m of text.matchAll(/(?:src|href)="(https?:[^"]+)"|import\s*\(?\s*['"](https?:[^'"]+)|=\s*'(https?:\/\/cdn[^']+)'/g)) {
    const url = m[1] || m[2] || m[3];
    if (/^<a /.test(text.slice(text.lastIndexOf('<', m.index), m.index + 3))) continue;   // ordinary links are fine
    problems.push(`${f}: ${url}`);
  }
  for (const m of text.matchAll(/(?:src|href)="(vendor\/[^"]+)"/g)) if (!existsSync(join(web, m[1]))) problems.push(`${f}: missing ${m[1]}`);
}
for (const d of readdirSync(join(web, 'sims'))) {
  const f = d === 'index.html' ? join(web, 'sims', d) : join(web, 'sims', d, 'index.html');
  if (existsSync(f) && /googleapis|gstatic/.test(readFileSync(f, 'utf8'))) problems.push('sims/' + d + ': still loads fonts from the internet');
}
if (problems.length) { console.error('Still loads from the internet or missing:\n' + problems.join('\n')); process.exit(1); }
console.log('web/ is ready (offline).');
