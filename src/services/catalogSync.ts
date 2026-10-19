import { CATALOG_BASE_URL } from '@/config/catalog';
import type { KvRepository } from '@/db/kvRepository';
import { applySaved, syncCatalog, type SavedCatalog, type SyncResult } from '@/networks/catalog';
import { BUNDLED_HASHES } from '@/networks/lists';
import { applyCatalog } from '@/networks/registry';

const KEY = 'catalog.v1';
const TIMEOUT_MS = 15_000;

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    // Public static files: no cookies, no identifiers.
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit', headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const store = (kv: KvRepository) => ({
  load: () => kv.get<SavedCatalog>(KEY),
  save: (c: SavedCatalog) => kv.set(KEY, c),
});

/** Puts the lists downloaded earlier on top of the bundled ones. Local only; runs when the database opens. */
export async function applySavedCatalog(kv: KvRepository): Promise<void> {
  await applySaved({ ...store(kv), apply: applyCatalog, bundledHashes: BUNDLED_HASHES });
}

/** Fetches newer store lists, at most every 12 hours. Safe to fire and forget: failures leave the current lists in place. */
export function refreshCatalog(kv: KvRepository): Promise<SyncResult> {
  return syncCatalog({
    baseUrl: CATALOG_BASE_URL,
    fetchJson,
    ...store(kv),
    now: Date.now,
    bundledHashes: BUNDLED_HASHES,
    apply: applyCatalog,
  });
}
