import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';

import { networkIdFor, networkStores, onCatalogChanged } from '@/networks/registry';

import { BRANDS, brandById, brandNames, findBrand, type Brand } from './brands';
import { MATCH_THRESHOLD, bestScore, prepareName, prepareQuery, type PreparedName } from './fuzzy';

export interface IndexedItem {
  item: Item;
  names: PreparedName[];
  /** Id of the multi-store network the card belongs to (BuyMe, Tav Zahav, …), if any. */
  networkId: string | null;
}

export interface SearchResult {
  item: Item;
  score: number;
  matched: string;
  active: boolean;
  /** Set when the card matched through a store of its network rather than its own name ("Castro" → a BuyMe card). */
  via: string | null;
}

interface NetworkSearch {
  names: PreparedName[];
  /** Prepared name → the store's display name. */
  labels: Map<PreparedName, string>;
}

/** Network stores rank just below cards that are specifically for the store. */
const NETWORK_WEIGHT = 0.9;
/** Lists hold hundreds of names, so only clear matches (exact, prefix, word, substring, same-sound) count — not typo guesses. */
const NETWORK_MIN_SCORE = 0.69;
const networkSearchCache = new Map<string, NetworkSearch>();
onCatalogChanged(() => networkSearchCache.clear());

function networkSearch(id: string): NetworkSearch {
  let cached = networkSearchCache.get(id);
  if (!cached) {
    const names: PreparedName[] = [];
    const labels = new Map<PreparedName, string>();
    for (const s of networkStores(id)) {
      const brand = s.key.startsWith('brand:') ? brandById(s.key.slice(6)) : null;
      const label = brand
        ? brand.nameHe
          ? `${brand.name} · ${brand.nameHe}`
          : brand.name
        : s.nameEn && !/[\u05d0-\u05ea]/.test(s.nameEn) && /[\u05d0-\u05ea]/.test(s.name)
          ? `${s.name} · ${s.nameEn}`
          : s.name;
      // Known chains answer to every spelling ('קסטרו' finds a list entry written 'CASTRO').
      for (const n of [s.name, s.nameEn, ...(brand ? brandNames(brand) : [])]) {
        if (!n) continue;
        const p = prepareName(n, NETWORK_WEIGHT);
        names.push(p);
        labels.set(p, label);
      }
    }
    cached = { names, labels };
    networkSearchCache.set(id, cached);
  }
  return cached;
}

/** Precomputes normalized/phonetic forms for each item's names (store, brand aliases, notes). */
export function buildIndex(items: Item[]): IndexedItem[] {
  return items.map((item) => {
    const names: PreparedName[] = [prepareName(item.storeName)];
    const brand = findBrand(item.storeName);
    if (brand) {
      for (const n of brandNames(brand)) {
        if (n !== item.storeName) names.push(prepareName(n, 0.98));
      }
    }
    if (item.notes) names.push(prepareName(item.notes, 0.6));
    return { item, names, networkId: networkStores(networkIdFor(item)).length > 0 ? networkIdFor(item) : null };
  });
}

/**
 * "Do I have credit here?" search. Returns matches ranked by score, with
 * active items first at equal relevance, then higher balance first.
 */
export function searchItems(index: IndexedItem[], query: string, opts: { limit?: number; now?: Date } = {}): SearchResult[] {
  const q = prepareQuery(query);
  if (!q.compact) return [];
  const now = opts.now ?? new Date();
  const results: SearchResult[] = [];
  // Cards of one network share its store list, so score it once per query.
  const networkScores = new Map<string, { score: number; name: PreparedName | null }>();
  for (const entry of index) {
    const own = bestScore(q, entry.names);
    let { score, name } = own;
    let via: string | null = null;
    if (entry.networkId) {
      let net = networkScores.get(entry.networkId);
      if (!net) {
        net = bestScore(q, networkSearch(entry.networkId).names);
        networkScores.set(entry.networkId, net);
      }
      if (net.name && net.score >= NETWORK_MIN_SCORE && net.score > score) {
        score = net.score;
        name = net.name;
        via = networkSearch(entry.networkId).labels.get(net.name) ?? net.name.raw;
      }
    }
    if (score >= MATCH_THRESHOLD && name) {
      const active = !entry.item.deletedAt && effectiveStatus(entry.item, now) === 'active';
      results.push({ item: entry.item, score, matched: via ?? name.raw, active, via });
    }
  }
  results.sort((a, b) => {
    const band = Math.round(b.score * 10) - Math.round(a.score * 10);
    if (band !== 0) return band;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (b.item.balanceMinor ?? 0) - (a.item.balanceMinor ?? 0);
  });
  return opts.limit ? results.slice(0, opts.limit) : results;
}

let brandIndex: { brand: Brand; names: PreparedName[] }[] | null = null;

/** Suggests known brands for a partially typed store name (Hebrew or English). */
export function suggestBrands(query: string, limit = 4): Brand[] {
  const q = prepareQuery(query);
  if (q.compact.length < 2) return [];
  brandIndex ??= BRANDS.map((brand) => ({ brand, names: brandNames(brand).map((n) => prepareName(n)) }));
  const scored = brandIndex
    .map((b) => ({ brand: b.brand, score: bestScore(q, b.names).score }))
    .filter((x) => x.score >= 0.6)
    .sort((a, b) => b.score - a.score);
  // Next to an exact match, brands that merely sound alike ("Zara" / "Azrieli") are noise.
  const floor = (scored[0]?.score ?? 0) >= 0.95 ? 0.7 : 0;
  return scored
    .filter((x) => x.score >= floor)
    .slice(0, limit)
    .map((x) => x.brand);
}
