import type { Item } from '@/domain/types';
import { brandNames, findBrand } from '@/search/brands';
import { compact } from '@/search/normalize';
import { skeleton } from '@/search/phonetic';

import bundled from './networks.json';
import { LOADERS } from './lists';

/**
 * Multi-store gift cards (BuyMe, Tav Zahav, Max, …): which stores accept them.
 *
 * The store lists are scraped from the issuers (data/store-lists → scripts/build-networks.mjs
 * → src/networks/data) and looked up at runtime by network id, so a list update in a new app
 * version reaches existing cards without touching the database.
 */
export interface NetworkDef {
  id: string;
  /** Brand id of the platform (see search/brands.ts). */
  platform: string;
  label: { en: string; he: string };
  /** Compact data files merged into this network. */
  sources: string[];
  /**
   * Whether the list is a hand-picked set of chains (every physical entry is worth a places lookup) or a long tail
   * of one-off venues (only chains that other lists also carry are). Defaults to "short lists are curated".
   */
  curated?: boolean;
}

export const NO_NETWORK = 'none';

/** Card families, in display order — the first one per platform is its default. Defined in networks.json so the catalog sync can add to it. */
const BUNDLED_NETWORKS: NetworkDef[] = bundled.networks;

/** Cards added or changed by a downloaded catalog (see catalog.ts), on top of the bundled ones. */
let networks: NetworkDef[] = BUNDLED_NETWORKS;
/** Downloaded store lists, by source id; they win over the bundled copy of the same id. */
let remoteLists = new Map<string, RawList>();

export interface RawList {
  /** [name, nameEn | null, flags] with flags 1 = online-only, 2 = booking required. */
  stores: [string, string | null, number][];
}

export interface NetworkStore {
  /** Canonical store key, shared with direct cards for the same store (see search/brands storeKey). */
  key: string;
  name: string;
  nameEn: string | null;
  /** Every spelling to search places for. */
  names: string[];
  physical: boolean;
  /** Worth a places lookup: a physical chain, not a one-off venue or a booking-only experience. */
  locatable: boolean;
  /** Number of networks listing this store — a proxy for how well-known the chain is. */
  popularity: number;
}

/** Lists this small are curated chain lists; larger ones (BuyMe ALL, Nofshonit) also hold hotels, spas, restaurants … */
const CHAIN_LIST_MAX = 200;

function isCurated(def: NetworkDef, size: number): boolean {
  return def.curated ?? size <= CHAIN_LIST_MAX;
}

let defsById = new Map(networks.map((n) => [n.id, n]));

export function getNetworkDef(id: string | null | undefined): NetworkDef | null {
  return id ? (defsById.get(id) ?? null) : null;
}

export function networksForPlatform(brandId: string | null | undefined): NetworkDef[] {
  return brandId ? networks.filter((n) => n.platform === brandId) : [];
}

export function defaultNetworkId(brandId: string | null | undefined): string | null {
  return networksForPlatform(brandId)[0]?.id ?? null;
}

/** The network a card belongs to: its explicit choice, else the default for its platform brand. */
export function networkIdFor(item: Pick<Item, 'storeName' | 'network'>): string | null {
  if (item.network === NO_NETWORK) return null;
  if (item.network && defsById.has(item.network)) return item.network;
  const brand = findBrand(item.storeName);
  return brand?.platform ? defaultNetworkId(brand.id) : null;
}

export function networkLabel(def: NetworkDef, lang: 'en' | 'he'): string {
  return def.label[lang];
}

/** Below this many skeleton letters, two names are too likely to merely sound alike to be the same store. */
const MIN_SKELETON = 4;

/** Phonetic skeleton → canonical key, so "גולדה" in one list and "Golda" in another are one store. Built once, in a fixed order. */
let skeletonKeys: Map<string, string> | null = null;

function resolveKey(name: string, nameEn: string | null, register: boolean): string {
  const brand = findBrand(name) ?? (nameEn ? findBrand(nameEn) : null);
  if (brand) return `brand:${brand.id}`;
  const skeletons = [name, nameEn].map((n) => (n ? skeleton(n) : '')).filter((k) => k.length >= MIN_SKELETON);
  for (const k of skeletons) {
    const hit = skeletonKeys?.get(k);
    if (hit) return hit;
  }
  const key = `name:${compact(name)}`;
  if (register) for (const k of skeletons) skeletonKeys?.set(k, key);
  return key;
}

/**
 * Store key for a card's own store name. Known brands and names that also appear
 * (in any spelling) in a network list share that store's key, so a "Golda" card and a
 * BuyMe card usable at Golda are one place on the map.
 */
export function canonicalStoreKey(storeName: string): string {
  ensureBuilt();
  return resolveKey(storeName, null, false);
}

interface Merged {
  key: string;
  name: string;
  nameEn: string | null;
  names: string[];
  physical: boolean;
  booking: boolean;
}

function spellings(name: string, nameEn: string | null): string[] {
  const brand = findBrand(name) ?? (nameEn ? findBrand(nameEn) : null);
  const out = new Set<string>();
  if (brand) for (const n of [brand.name, ...brandNames(brand)]) out.add(n);
  // "מתאו - תל אביב" is the restaurant "מתאו" in Tel Aviv.
  for (const n of [name, nameEn]) {
    if (!n) continue;
    out.add(n);
    const head = n.split(/\s+-\s+/)[0]?.trim();
    if (head && head.length >= 2) out.add(head);
  }
  return [...out];
}

const mergedCache = new Map<string, Merged[]>();

/** Loads every list in a fixed order so canonical keys never depend on which card is opened first. */
function ensureBuilt(): void {
  if (skeletonKeys) return;
  skeletonKeys = new Map();
  for (const def of networks) {
    const byKey = new Map<string, Merged>();
    for (const source of def.sources) {
      const list = remoteLists.get(source) ?? LOADERS[source]?.();
      if (!list) continue;
      for (const [name, nameEn, flags] of list.stores) {
        const key = resolveKey(name, nameEn, true);
        const physical = (flags & 1) === 0;
        const booking = (flags & 2) !== 0;
        const prev = byKey.get(key);
        if (prev) {
          prev.physical ||= physical;
          prev.booking &&= booking;
          prev.nameEn ??= nameEn;
          continue;
        }
        byKey.set(key, { key, name, nameEn, names: spellings(name, nameEn), physical, booking });
      }
    }
    mergedCache.set(def.id, [...byKey.values()]);
  }
}

function loadMerged(id: string): Merged[] {
  ensureBuilt();
  return mergedCache.get(id) ?? [];
}

let chainKeys: Set<string> | null = null;
let popularity: Map<string, number> | null = null;

function globalStats(): { chainKeys: Set<string>; popularity: Map<string, number> } {
  if (chainKeys && popularity) return { chainKeys, popularity };
  chainKeys = new Set();
  popularity = new Map();
  for (const def of networks) {
    const stores = loadMerged(def.id);
    for (const s of stores) {
      popularity.set(s.key, (popularity.get(s.key) ?? 0) + 1);
      if (isCurated(def, stores.length) && s.physical && !s.booking) chainKeys.add(s.key);
    }
  }
  return { chainKeys, popularity };
}

const storesCache = new Map<string, NetworkStore[]>();

/** Every store accepting this network's cards (deduplicated by store key). */
export function networkStores(id: string | null | undefined): NetworkStore[] {
  if (!id || !defsById.has(id)) return [];
  const cached = storesCache.get(id);
  if (cached) return cached;
  const merged = loadMerged(id);
  const stats = globalStats();
  const curated = isCurated(defsById.get(id)!, merged.length);
  const out = merged.map<NetworkStore>((m) => ({
    key: m.key,
    name: m.name,
    nameEn: m.nameEn,
    names: m.names,
    physical: m.physical,
    locatable: m.physical && !m.booking && (curated || stats.chainKeys.has(m.key)),
    popularity: stats.popularity.get(m.key) ?? 1,
  }));
  storesCache.set(id, out);
  return out;
}

/** Display name of a network store in the UI language. */
export function networkStoreName(s: Pick<NetworkStore, 'name' | 'nameEn'>, lang: 'en' | 'he'): string {
  return lang === 'en' ? (s.nameEn ?? s.name) : s.name;
}

/** What a downloaded catalog changes: card families to add or replace, and the store lists they read. */
export interface CatalogPatch {
  networks: NetworkDef[];
  lists: Record<string, RawList>;
}

const listeners = new Set<() => void>();

/** Called after the catalog changed, so derived caches (search index) can be rebuilt. */
export function onCatalogChanged(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Makes `patch` the active catalog on top of the bundled one; `null` goes back to the bundled data. */
export function applyCatalog(patch: CatalogPatch | null): void {
  const byId = new Map(BUNDLED_NETWORKS.map((n) => [n.id, n]));
  for (const n of patch?.networks ?? []) byId.set(n.id, n);
  networks = [...byId.values()];
  defsById = new Map(networks.map((n) => [n.id, n]));
  remoteLists = new Map(Object.entries(patch?.lists ?? {}));
  skeletonKeys = null;
  chainKeys = null;
  popularity = null;
  mergedCache.clear();
  storesCache.clear();
  for (const fn of listeners) fn();
}

/** Every card family currently known: the bundled ones plus whatever a downloaded catalog added. */
export function allNetworkDefs(): NetworkDef[] {
  return networks;
}
