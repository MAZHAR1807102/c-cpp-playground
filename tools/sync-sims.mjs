// Copy the animated algorithm simulations from the algorithm-simulations repository (next to this one) into sims/,
// so the playground can show them in its own pages and the desktop app can carry them offline.
// usage: node tools/sync-sims.mjs [path-to-algorithm-simulations]
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(process.argv[2] || join(root, '..', 'algorithm-simulations'));
const out = join(root, 'sims');
if (!existsSync(join(src, 'assets', 'sim.js'))) { console.error('Not found: ' + src); process.exit(1); }

rmSync(out, { recursive: true, force: true });
const dirs = readdirSync(src).filter(d => !d.startsWith('.') && statSync(join(src, d)).isDirectory());
for (const d of dirs) cpSync(join(src, d), join(out, d), { recursive: true });
// the home page: its link to the playground must leave the frame and go to the playground itself
const home = readFileSync(join(src, 'index.html'), 'utf8')
  .replace(/<a class="sim" href="https:\/\/mazhar1807102\.github\.io\/c-cpp-playground\/">/, '<a class="sim" href="../index.html" target="_top">');
writeFileSync(join(out, 'index.html'), home);
const pages = dirs.filter(d => existsSync(join(out, d, 'index.html')));
console.log(`sims/: ${pages.length} simulations (${pages.join(', ')}) and the shared assets`);
