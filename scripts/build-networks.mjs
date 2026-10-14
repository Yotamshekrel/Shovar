// Compacts the scraped store lists (data/store-lists/*.json) into the bundle-friendly
// format read by src/networks (src/networks/data/<id>.json).
//   node scripts/build-networks.mjs
// Row format: [name, nameEn | null, flags]  (flags: 1 = online-only, 2 = booking required)
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'data', 'store-lists');
const outDir = join(root, 'src', 'networks', 'data');
mkdirSync(outDir, { recursive: true });

// Trailing words that only say which department/channel of a chain ("קסטרו גברים", "פוקס אונליין").
const SUFFIX_RE = /\s+(אונליין|אוננליין|online|גברים|נשים|ילדים|תינוקות|men|women)$/i;

function clean(s) {
  if (!s) return null;
  let out = s.replace(/\s+/g, ' ').trim();
  out = out.replace(/\s*\((?:לטיני|latin logo|latin)[^)]*\)/i, '').trim();
  return out || null;
}

function canonical(name) {
  let out = name;
  for (let i = 0; i < 2; i++) out = out.replace(SUFFIX_RE, '').trim();
  return out;
}

const index = [];
for (const file of readdirSync(srcDir).filter((f) => f.endsWith('.json')).sort()) {
  const id = file.replace(/\.json$/, '');
  const json = JSON.parse(readFileSync(join(srcDir, file), 'utf8'));
  const seen = new Map();
  for (const s of json.stores) {
    const rawName = clean(s.name) ?? clean(s.nameEn);
    if (!rawName || s.uncertain) continue;
    // An "…אונליין" suffix is just the web shop of a chain; only lists that are online-only as a whole are flagged.
    const onlineOnly = /online/i.test(json.variant ?? '');
    const name = canonical(rawName);
    const nameEn = canonical(clean(s.nameEn) ?? '') || null;
    if (!name) continue;
    const key = name.toLowerCase();
    let flags = onlineOnly ? 1 : 0;
    if (s.bookingRequired) flags |= 2;
    const prev = seen.get(key);
    if (prev) {
      // A physical entry wins over an online-only duplicate of the same chain.
      if (!(flags & 1)) prev[2] &= ~1;
      prev[1] ??= nameEn && nameEn.toLowerCase() !== key ? nameEn : null;
      continue;
    }
    seen.set(key, [name, nameEn && nameEn.toLowerCase() !== key ? nameEn : null, flags]);
  }
  const stores = [...seen.values()].map((r) => (r[2] ? r : r[1] ? [r[0], r[1], 0] : [r[0], null, 0]));
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify({ id, platform: json.platform, variant: json.variant, updated: json.updated, stores }) + '\n');
  index.push({ id, count: stores.length });
}
console.log(index.map((i) => `${i.id}: ${i.count}`).join('\n'));
