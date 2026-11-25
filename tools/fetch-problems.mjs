// Download the problem lists for the Practice page and save them as practice-data.js.
//   Codeforces: the official API (problemset.problems): name, rating, tags, how many solved it.
//   CodeChef:   the list the CodeChef practice page uses (no tags in the list, so each topic is asked for separately).
// If one judge cannot be reached, the problems saved last time are kept for it.
// usage: node tools/fetch-problems.mjs
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, 'practice-data.js');
const UA = { 'User-Agent': 'Mozilla/5.0 (playground problem list)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// one topic list for both judges; CodeChef topics are mapped onto the Codeforces names
const CC_TAGS = {
  'dynamic-programming': 'dp', 'greedy': 'greedy', 'mathematics': 'math', 'basic-math': 'math', 'number-theory': 'number theory',
  'string': 'strings', 'implementation': 'implementation', 'brute-force': 'brute force', 'data-structures': 'data structures',
  'dfs': 'dfs and similar', 'bfs': 'dfs and similar', 'graphs': 'graphs', 'trees': 'trees', 'binary-search': 'binary search',
  'sorting': 'sortings', 'two-pointers': 'two pointers', 'sliding-window': 'two pointers', 'bit-manipulation': 'bitmasks',
  'bitmasking': 'bitmasks', 'combinatorics': 'combinatorics', 'geometry': 'geometry', 'hashing': 'hashing',
  'game-theory': 'games', 'prefix-sum': 'prefix sums', 'arrays': 'arrays', 'recursion': 'recursion'
};

let old = null;
if (existsSync(OUT)) {
  try { const src = readFileSync(OUT, 'utf8'); old = JSON.parse(src.slice(src.indexOf('{'), src.lastIndexOf('}') + 1)); } catch (_) {}
}

async function json(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(1500 * i);
    }
  }
}

const tags = [];
const tagId = t => { let i = tags.indexOf(t); if (i < 0) { i = tags.length; tags.push(t); } return i; };

async function codeforces() {
  const j = await json('https://codeforces.com/api/problemset.problems');
  if (j.status !== 'OK') throw new Error('Codeforces: ' + j.comment);
  const solved = new Map(j.result.problemStatistics.map(s => [s.contestId + s.index, s.solvedCount]));
  // [contestId, index, name, rating (0 = none yet), [tags], solved]
  return j.result.problems.filter(p => p.type === 'PROGRAMMING' && p.contestId).map(p =>
    [p.contestId, p.index, p.name, p.rating || 0, p.tags.filter(t => t !== '*special').map(tagId), solved.get(p.contestId + p.index) || 0]);
}

const ccList = (page, tag = '') => `https://www.codechef.com/api/list/problems?page=${page}&limit=100&sort_by=difficulty_rating&sort_order=asc&search=&category=rated&tags=${tag}&group=all`;
async function codechef() {
  const all = new Map();
  for (let page = 0; ; page++) {
    const j = await json(ccList(page));
    if (j.status !== 'success') throw new Error('CodeChef: ' + j.message);
    for (const p of j.data) all.set(p.code, p);
    if (!j.data.length || all.size >= j.count) break;
    await sleep(400);
  }
  const ptags = new Map();
  for (const [slug, name] of Object.entries(CC_TAGS)) {
    for (let page = 0; ; page++) {
      let j;
      try { j = await json(ccList(page, slug)); } catch (_) { break; }
      if (j.status !== 'success' || !j.data) break;
      for (const p of j.data) {
        if (!ptags.has(p.code)) ptags.set(p.code, new Set());
        ptags.get(p.code).add(tagId(name));
      }
      if (!j.data.length || (page + 1) * 100 >= j.count) break;
      await sleep(400);
    }
    await sleep(400);
  }
  // [code, name, rating (0 = none), solved, [tags]]; CodeChef uses -1 and 9999 for "not rated yet"
  return [...all.values()].map(p => {
    const r = +p.difficulty_rating;
    return [p.code, p.name, r > 0 && r < 5000 ? r : 0, +p.distinct_successful_submissions || 0, [...(ptags.get(p.code) || [])]];
  });
}

function keepOld(judge, e) {
  console.warn(`${judge}: ${e.message}; keeping the problems saved last time`);
  if (!old) return [];
  // old tag numbers must be translated to this run's numbering
  const idx = judge === 'Codeforces' ? 4 : 4;
  return old[judge === 'Codeforces' ? 'cf' : 'cc'].map(p => { const q = p.slice(); q[idx] = p[idx].map(t => tagId(old.tags[t])); return q; });
}

let cf, cc;
try { cf = await codeforces(); } catch (e) { cf = keepOld('Codeforces', e); }
try { cc = await codechef(); } catch (e) { cc = keepOld('CodeChef', e); }
if (!cf.length && !cc.length) { console.error('No problems downloaded.'); process.exit(1); }
const data = { updated: new Date().toISOString().slice(0, 10), tags, cf, cc };
writeFileSync(OUT, '// Problem lists for the Practice page, made by tools/fetch-problems.mjs. Do not edit by hand.\nwindow.PRACTICE = ' + JSON.stringify(data) + ';\n');
console.log(`practice-data.js: ${cf.length} Codeforces + ${cc.length} CodeChef problems, ${tags.length} topics, ${(JSON.stringify(data).length / 1048576).toFixed(2)} MB`);
