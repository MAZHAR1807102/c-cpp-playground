// Build desktop/web from the website in the repository root, with every CDN file replaced by a local copy
// from node_modules, so that the app works with no internet connection.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
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

// CodeMirror 5: only the parts the page uses
for (const d of ['lib', 'mode/clike', 'mode/python', 'addon/edit', 'addon/hint', 'addon/runmode'])
  cpSync(join(nm, 'codemirror', d), join(vendor, 'codemirror', d), { recursive: true });

// fonts (Latin subsets), replacing the Google Fonts stylesheet
const fonts = [
  ['Atkinson Hyperlegible', '@fontsource/atkinson-hyperlegible', 'atkinson-hyperlegible', [400, 700]],
  ['Bricolage Grotesque', '@fontsource/bricolage-grotesque', 'bricolage-grotesque', [800]],
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

// the page and its scripts, with CDN addresses rewritten
let html = readFileSync(join(root, 'index.html'), 'utf8')
  .replace(/<link rel="preconnect"[^>]*>\n?/g, '')
  .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/, '<link rel="stylesheet" href="vendor/fonts.css">')
  .replace(/https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/codemirror\/5\.65\.16\/([\w/-]+?)(?:\.min)?\.(js|css)/g,
    (_, p, ext) => `vendor/codemirror/${p === 'codemirror' ? 'lib/codemirror' : p}.${ext}`)
  .replace(/'https:\/\/cdn\.jsdelivr\.net\/npm\/@live-codes\/java-wasm@[^/]+\/dist\/'/, "'./vendor/java-wasm/'");
writeFileSync(join(web, 'index.html'), html);
writeFileSync(join(web, 'compiler.js'), readFileSync(join(root, 'compiler.js'), 'utf8').replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@yowasp\/clang@[^/]+\/gen\/bundle\.js/, './vendor/yowasp/bundle.js'));
writeFileSync(join(web, 'runner.js'), readFileSync(join(root, 'runner.js'), 'utf8').replace(/https:\/\/cdn\.jsdelivr\.net\/npm\/@bjorn3\/browser_wasi_shim@[^/]+\/dist\/index\.js/, './vendor/wasi-shim/index.js'));
writeFileSync(join(web, 'python-runner.js'), readFileSync(join(root, 'python-runner.js'), 'utf8').replace(/'https:\/\/cdn\.jsdelivr\.net\/npm\/pyodide@[^/]+\/'/, "new URL('./vendor/pyodide/', self.location.href).href"));
cpSync(join(root, 'guide.js'), join(web, 'guide.js'));
cpSync(join(root, 'guide-more.js'), join(web, 'guide-more.js'));

// every file the page loads must now be local: fail the build if a CDN address is left anywhere it would be fetched
const problems = [];
for (const f of ['index.html', 'compiler.js', 'runner.js', 'python-runner.js']) {
  const text = readFileSync(join(web, f), 'utf8');
  for (const m of text.matchAll(/(?:src|href)="(https?:[^"]+)"|import\s*\(?\s*['"](https?:[^'"]+)|=\s*'(https?:\/\/cdn[^']+)'/g)) {
    const url = m[1] || m[2] || m[3];
    if (/^<a /.test(text.slice(text.lastIndexOf('<', m.index), m.index + 3))) continue;   // ordinary links are fine
    problems.push(`${f}: ${url}`);
  }
  for (const m of text.matchAll(/(?:src|href)="(vendor\/[^"]+)"/g)) if (!existsSync(join(web, m[1]))) problems.push(`${f}: missing ${m[1]}`);
}
if (problems.length) { console.error('Still loads from the internet or missing:\n' + problems.join('\n')); process.exit(1); }
console.log('web/ is ready (offline).');
