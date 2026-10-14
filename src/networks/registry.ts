import type { Item } from '@/domain/types';
import { brandNames, findBrand } from '@/search/brands';
import { compact } from '@/search/normalize';
import { skeleton } from '@/search/phonetic';

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
}

export const NO_NETWORK = 'none';

/** First entry per platform is its default. */
export const NETWORKS: NetworkDef[] = [
  { id: 'buyme_all', platform: 'buyme', label: { en: 'BuyMe ALL', he: 'BuyMe ALL' }, sources: ['buyme_all'] },
  { id: 'buyme_total', platform: 'buyme', label: { en: 'BuyMe TOTAL', he: 'BuyMe TOTAL' }, sources: ['buyme_total'] },
  { id: 'buyme_style', platform: 'buyme', label: { en: 'BuyMe STYLE', he: 'BuyMe STYLE' }, sources: ['buyme_style'] },
  { id: 'buyme_brunch', platform: 'buyme', label: { en: 'BuyMe Brunch', he: 'BuyMe ברנץ׳' }, sources: ['buyme_brunch'] },
  { id: 'tavzahav', platform: 'tavzahav', label: { en: 'Tav Zahav', he: 'תו הזהב' }, sources: ['tavzahav_shopping', 'tavzahav_online'] },
  { id: 'max_giftcard', platform: 'max', label: { en: 'GiftCard', he: 'גיפטקארד' }, sources: ['max_giftcard'] },
  { id: 'max_super', platform: 'max', label: { en: 'Super GiftCard', he: 'סופר גיפטקארד' }, sources: ['max_super_giftcard'] },
  { id: 'max_executive', platform: 'max', label: { en: 'Executive', he: 'אקזקיוטיב' }, sources: ['max_executive'] },
  { id: 'max_food', platform: 'max', label: { en: 'Food', he: 'אוכל' }, sources: ['max_food'] },
  {
    id: 'dreamcard',
    platform: 'dreamcard',
    label: { en: 'Dream Card', he: 'דרים קארד' },
    sources: ['dreamcard_multipass_include', 'dreamcard_multipass_nosacks', 'dreamcard_without_multipass'],
  },
  { id: 'nofshonit', platform: 'nofshonit', label: { en: 'Nofshonit', he: 'נופשונית' }, sources: ['nofshonit_swish_plus'] },
];

/** Metro needs static require paths, so every data file is listed here (and loaded lazily). */
const LOADERS: Record<string, () => RawList> = {
  buyme_all: () => require('./data/buyme_all.json'),
  buyme_brunch: () => require('./data/buyme_brunch.json'),
  buyme_style: () => require('./data/buyme_style.json'),
  buyme_total: () => require('./data/buyme_total.json'),
  dreamcard_multipass_include: () => require('./data/dreamcard_multipass_include.json'),
  dreamcard_multipass_nosacks: () => require('./data/dreamcard_multipass_nosacks.json'),
  dreamcard_without_multipass: () => require('./data/dreamcard_without_multipass.json'),
  max_executive: () => require('./data/max_executive.json'),
  max_food: () => require('./data/max_food.json'),
  max_giftcard: () => require('./data/max_giftcard.json'),
  max_super_giftcard: () => require('./data/max_super_giftcard.json'),
  nofshonit_swish_plus: () => require('./data/nofshonit_swish_plus.json'),
  tavzahav_online: () => require('./data/tavzahav_online.json'),
  tavzahav_shopping: () => require('./data/tavzahav_shopping.json'),
};

interface RawList {
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

const defsById = new Map(NETWORKS.map((n) => [n.id, n]));

export function getNetworkDef(id: string | null | undefined): NetworkDef | null {
  return id ? (defsById.get(id) ?? null) : null;
}

export function networksForPlatform(brandId: string | null | undefined): NetworkDef[] {
  return brandId ? NETWORKS.filter((n) => n.platform === brandId) : [];
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
  for (const def of NETWORKS) {
    const byKey = new Map<string, Merged>();
    for (const source of def.sources) {
      const list = LOADERS[source]?.();
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
  for (const def of NETWORKS) {
    const stores = loadMerged(def.id);
    for (const s of stores) {
      popularity.set(s.key, (popularity.get(s.key) ?? 0) + 1);
      if (stores.length <= CHAIN_LIST_MAX && s.physical && !s.booking) chainKeys.add(s.key);
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
  const curated = merged.length <= CHAIN_LIST_MAX;
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
