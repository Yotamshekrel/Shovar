// Bundles small store logos for the app.
//   node scripts/build-logos.mjs [--dry]
// Reads the logo URLs kept in data/store-lists/*.json (scraped by scrape-networks.mjs), picks the stores people
// are most likely to meet — the built-in brand dictionary, chains listed by several gift cards, and the curated
// Max chain lists — downloads them, squares them to 120×120 and writes
//   assets/logos/*.webp                 the images
//   src/networks/logoIndex.json         normalized store name → image id
//   src/networks/logoFiles.ts           image id → require() (Metro needs static paths)
// Needs macOS `sips` and `cwebp` (brew install webp). Downloads are cached in the OS temp directory.
import { execFileSync } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const dry = process.argv.includes('--dry');

const work = join(tmpdir(), 'shovar-logos');
mkdirSync(join(work, 'dl'), { recursive: true });
mkdirSync(join(work, 'lib'), { recursive: true });

// The app's own name matching (src/search) so keys agree with what the app looks up.
for (const f of ['normalize', 'brands']) {
  const out = ts.transpileModule(readFileSync(join(root, 'src/search', `${f}.ts`), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  writeFileSync(join(work, 'lib', `${f}.js`), out);
}
const { compact } = require(join(work, 'lib/normalize.js'));
const { BRANDS } = require(join(work, 'lib/brands.js'));

// --- collect candidates -----------------------------------------------------------------------------------
const lists = readdirSync(join(root, 'data/store-lists')).filter((f) => f.endsWith('.json'));
/** key → { names, logos: Set(url), lists: Set(listId) } */
const byKey = new Map();
for (const file of lists) {
  const id = file.replace(/\.json$/, '');
  const json = JSON.parse(readFileSync(join(root, 'data/store-lists', file), 'utf8'));
  for (const s of json.stores) {
    const names = [s.name, s.nameEn].filter(Boolean);
    for (const n of names) {
      // "FOX - תל אביב" is the chain "FOX".
      for (const variant of new Set([n, n.split(/\s+-\s+/)[0]])) {
        const key = compact(variant);
        if (key.length < 2) continue;
        const e = byKey.get(key) ?? { logos: new Set(), lists: new Set() };
        if (s.logo) e.logos.add(s.logo);
        e.lists.add(id);
        byKey.set(key, e);
      }
    }
  }
}

const chosen = new Map(); // image id → { url | null, keys: Set }
const keyToImage = new Map();
const hash = (s) => createHash('sha1').update(s).digest('hex').slice(0, 10);

function assign(imageId, url, keys) {
  const e = chosen.get(imageId) ?? { urls: [], keys: new Set() };
  if (url && !e.urls.includes(url)) e.urls.push(url);
  for (const k of keys) {
    e.keys.add(k);
    keyToImage.set(k, imageId);
  }
  chosen.set(imageId, e);
}

// Logos the issuers don't publish in their store lists (and whose sites only offer a tiny favicon).
const BRAND_LOGO_URLS = {
  tavzahav: 'https://tavhazahav.shufersal.co.il/tavhazahav/assets/images/logo-zahavt.png',
};

// 1) Brand dictionary (also gives Hebrew/English aliases for free).
const brandHosts = new Map();
for (const b of BRANDS) {
  const keys = [b.name, b.nameHe, ...b.aliases].filter(Boolean).map(compact).filter((k) => k.length >= 2);
  const urls = [...(BRAND_LOGO_URLS[b.id] ? [BRAND_LOGO_URLS[b.id]] : []), ...keys.flatMap((k) => [...(byKey.get(k)?.logos ?? [])])];
  assign(`b-${b.id}`, urls[0] ?? null, keys);
  chosen.get(`b-${b.id}`).urls.push(...urls.slice(1));
  brandHosts.set(`b-${b.id}`, b.domains ?? []);
}
// 2) Chains honored by at least three gift card lists, and every Max chain (a curated list of real chains).
const maxKeys = new Set();
for (const file of lists.filter((f) => f.startsWith('max_'))) {
  for (const s of JSON.parse(readFileSync(join(root, 'data/store-lists', file), 'utf8')).stores)
    for (const n of [s.name, s.nameEn].filter(Boolean)) maxKeys.add(compact(n));
}
for (const [key, e] of byKey) {
  if (keyToImage.has(key) || e.logos.size === 0) continue;
  if (e.lists.size >= 3 || maxKeys.has(key)) {
    const id = `s-${hash(key)}`;
    assign(id, [...e.logos][0], [key]);
    chosen.get(id).urls.push(...[...e.logos].slice(1));
  }
}
console.log(`${chosen.size} images, ${keyToImage.size} name keys`);
if (dry) process.exit(0);

// --- download + convert -------------------------------------------------------------------------------------
const UA = { 'user-agent': 'Mozilla/5.0 (Shovar logo build)' };
async function download(url) {
  const file = join(work, 'dl', hash(url));
  if (existsSync(file)) return file;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error(String(res.status));
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    // Some sites reset Node's TLS handshake but serve curl; try that before giving up.
    try {
      execFileSync('curl', ['-fsSL', '-m', '20', '-A', 'Mozilla/5.0', '-o', file, url], { stdio: 'ignore' });
    } catch {
      rmSync(file, { force: true });
      throw err;
    }
  }
  return file;
}

const outDir = join(root, 'assets/logos');
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

/** Decodes what the site served into a PNG: sips for the common formats, dwebp for WebP. SVG/ICO throw, so the next source is tried. */
function toPng(src, out) {
  const kind = execFileSync('file', ['-b', src]).toString();
  if (/Web\/P/i.test(kind)) execFileSync('dwebp', ['-quiet', src, '-o', out], { stdio: 'ignore' });
  else execFileSync('sips', ['-s', 'format', 'png', src, '--out', out], { stdio: 'ignore' });
}

function convert(src, imageId) {
  const raw = join(work, `${imageId}.raw.png`);
  const sq = join(work, `${imageId}.png`);
  toPng(src, raw);
  execFileSync('sips', ['-Z', '104', '--padToHeightWidth', '120', '120', '--padColor', 'FFFFFF', raw, '--out', sq], { stdio: 'ignore' });
  execFileSync('cwebp', ['-quiet', '-q', '82', '-alpha_q', '80', sq, '-o', join(outDir, `${imageId}.webp`)], { stdio: 'ignore' });
  rmSync(sq, { force: true });
  rmSync(raw, { force: true });
}

/** Icons for a brand's own site: apple-touch-icon (180 px), /apple-touch-icon.png, then Google's favicon service — in that order. */
async function* favicons(domains) {
  for (const d of domains) {
    for (const origin of [`https://www.${d}`, `https://${d}`]) {
      try {
        const res = await fetch(origin, { headers: UA, signal: AbortSignal.timeout(12000), redirect: 'follow' });
        const html = (await res.text()).slice(0, 200000);
        const tags = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi) ?? [];
        const best = tags
          .map((t) => ({ href: t.match(/href=["']([^"']+)["']/i)?.[1], size: Number(t.match(/sizes=["'](\d+)/i)?.[1] ?? 0) }))
          .filter((t) => t.href)
          .sort((a, b) => b.size - a.size)[0];
        if (best) yield await download(new URL(best.href, res.url).href);
      } catch {
        /* next */
      }
    }
    for (const u of [`https://www.${d}/apple-touch-icon.png`, `https://www.google.com/s2/favicons?domain=${d}&sz=128`]) {
      try {
        yield await download(u);
      } catch {
        /* next */
      }
    }
  }
}

const ok = new Set();
const ids = [...chosen.keys()];
let next = 0;
async function worker() {
  while (next < ids.length) {
    const id = ids[next++];
    const e = chosen.get(id);
    const files = (async function* () {
      for (const url of e.urls) {
        try {
          yield await download(url);
        } catch {
          /* next */
        }
      }
      if (id.startsWith('b-')) yield* favicons(brandHosts.get(id) ?? []);
    })();
    for await (const file of files) {
      try {
        convert(file, id);
        ok.add(id);
        break;
      } catch {
        if (process.env.LOGO_DEBUG) console.warn(id, 'unusable image', file.slice(-10));
      }
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

// --- index --------------------------------------------------------------------------------------------------
const index = {};
for (const [key, id] of [...keyToImage].sort(([a], [b]) => a.localeCompare(b))) if (ok.has(id)) index[key] = id;
const used = [...new Set(Object.values(index))].sort();
writeFileSync(join(root, 'src/networks/logoIndex.json'), JSON.stringify(index) + '\n');
writeFileSync(
  join(root, 'src/networks/logoFiles.ts'),
  `// Generated by scripts/build-logos.mjs — do not edit.\n// Metro needs static require paths, so every bundled logo is listed here.\nexport const LOGO_FILES: Record<string, () => number> = {\n${used
    .map((id) => `  '${id}': () => require('../../assets/logos/${id}.webp'),`)
    .join('\n')}\n};\n`,
);
console.log(`bundled ${used.length} logos for ${Object.keys(index).length} names (${chosen.size - ok.size} had no usable image)`);
