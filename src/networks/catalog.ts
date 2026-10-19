import type { CatalogPatch, NetworkDef, RawList } from './registry';

/**
 * Over-the-air store lists.
 *
 * `scripts/build-networks.mjs` publishes a manifest (card families + a content hash per store list) and the lists
 * themselves next to the landing page. The app downloads only the lists whose hash it does not already hold, checks
 * them against this schema and hands the result to the registry; anything that fails validation is ignored, so a bad
 * publish can never break the bundled data.
 */
export const CATALOG_SCHEMA = 1;

export interface CatalogManifest {
  schema: number;
  updated: string;
  networks: NetworkDef[];
  lists: Record<string, { hash: string; count: number }>;
}

export interface SavedCatalog {
  fetchedAt: number;
  manifest: CatalogManifest;
  /** Lists downloaded so far, newest hash per id. */
  lists: Record<string, { hash: string; list: RawList }>;
}

const ID_RE = /^[a-z0-9_]{1,48}$/;
const MAX_LIST_ROWS = 5000;
const MAX_NAME = 120;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown, max: number): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;

function parseNetwork(v: unknown): NetworkDef | null {
  if (!isObj(v) || !isStr(v.id, 48) || !ID_RE.test(v.id) || !isStr(v.platform, 48)) return null;
  const label = v.label;
  if (!isObj(label) || !isStr(label.en, 60) || !isStr(label.he, 60)) return null;
  if (!Array.isArray(v.sources) || v.sources.length === 0 || v.sources.length > 12) return null;
  if (!v.sources.every((s) => typeof s === 'string' && ID_RE.test(s))) return null;
  const def: NetworkDef = { id: v.id, platform: v.platform, label: { en: label.en, he: label.he }, sources: v.sources as string[] };
  if (typeof v.curated === 'boolean') def.curated = v.curated;
  return def;
}

/** Returns a clean manifest, or null if it is not one this app version understands. */
export function parseManifest(json: unknown): CatalogManifest | null {
  if (!isObj(json) || json.schema !== CATALOG_SCHEMA || !Array.isArray(json.networks) || !isObj(json.lists)) return null;
  const networks = json.networks.map(parseNetwork).filter((n): n is NetworkDef => n !== null);
  const lists: CatalogManifest['lists'] = {};
  for (const [id, meta] of Object.entries(json.lists)) {
    if (!ID_RE.test(id) || !isObj(meta) || !isStr(meta.hash, 64) || typeof meta.count !== 'number') continue;
    lists[id] = { hash: meta.hash, count: meta.count };
  }
  return { schema: CATALOG_SCHEMA, updated: typeof json.updated === 'string' ? json.updated : '', networks, lists };
}

/** Returns a clean store list, or null when it is malformed (a list is all-or-nothing). */
export function parseList(json: unknown): RawList | null {
  if (!isObj(json) || !Array.isArray(json.stores) || json.stores.length > MAX_LIST_ROWS) return null;
  const stores: RawList['stores'] = [];
  for (const row of json.stores) {
    if (!Array.isArray(row) || !isStr(row[0], MAX_NAME)) return null;
    const nameEn = row[1];
    if (nameEn !== null && !isStr(nameEn, MAX_NAME)) return null;
    const flags = row[2];
    if (!Number.isInteger(flags) || flags < 0 || flags > 3) return null;
    stores.push([row[0], nameEn, flags]);
  }
  return { stores };
}

/** The registry patch for a saved catalog: card families whose every source list is available (here or bundled). */
export function toPatch(saved: SavedCatalog, hasBundled: (id: string) => boolean): CatalogPatch {
  const lists: CatalogPatch['lists'] = {};
  for (const [id, l] of Object.entries(saved.lists)) lists[id] = l.list;
  const networks = saved.manifest.networks.filter((n) => n.sources.every((s) => lists[s] || hasBundled(s)));
  return { networks, lists };
}

export interface SyncDeps {
  baseUrl: string;
  fetchJson: (url: string) => Promise<unknown>;
  load: () => Promise<SavedCatalog | null>;
  save: (c: SavedCatalog) => Promise<void>;
  now: () => number;
  /** Hash of each bundled list. */
  bundledHashes: Record<string, string>;
  apply: (patch: CatalogPatch) => void;
  minIntervalMs?: number;
}

export type SyncResult = 'fresh' | 'updated' | 'unchanged' | 'failed';

const DEFAULT_INTERVAL_MS = 12 * 60 * 60 * 1000;

/** Applies what is saved on this device; call once at startup, before anything reads the registry. */
export async function applySaved(deps: Pick<SyncDeps, 'load' | 'apply' | 'bundledHashes'>): Promise<SavedCatalog | null> {
  const saved = await deps.load().catch(() => null);
  if (!saved) return null;
  deps.apply(toPatch(saved, (id) => id in deps.bundledHashes));
  return saved;
}

/** Downloads whatever changed since the last sync. Never throws: on any problem the current data stays in use. */
export async function syncCatalog(deps: SyncDeps): Promise<SyncResult> {
  try {
    const saved = await deps.load().catch(() => null);
    const interval = deps.minIntervalMs ?? DEFAULT_INTERVAL_MS;
    if (saved && deps.now() - saved.fetchedAt < interval) return 'fresh';

    const manifest = parseManifest(await deps.fetchJson(`${deps.baseUrl}/manifest.json`));
    if (!manifest) return 'failed';

    const have: SavedCatalog['lists'] = {};
    let changed = !saved || saved.manifest.updated !== manifest.updated;
    // Lists a card family reads, minus those we already hold in the published version.
    const wanted = new Set(manifest.networks.flatMap((n) => n.sources));
    for (const id of wanted) {
      const meta = manifest.lists[id];
      if (!meta) continue;
      const held = saved?.lists[id];
      if (held && held.hash === meta.hash) {
        have[id] = held;
      } else if (deps.bundledHashes[id] !== meta.hash) {
        const list = parseList(await deps.fetchJson(`${deps.baseUrl}/lists/${id}.json`));
        if (!list) continue;
        have[id] = { hash: meta.hash, list };
        changed = true;
      }
    }

    const next: SavedCatalog = { fetchedAt: deps.now(), manifest, lists: have };
    await deps.save(next);
    if (changed) deps.apply(toPatch(next, (id) => id in deps.bundledHashes));
    return changed ? 'updated' : 'unchanged';
  } catch {
    return 'failed';
  }
}
