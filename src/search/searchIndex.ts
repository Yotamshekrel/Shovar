import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';

import { BRANDS, brandNames, findBrand, type Brand } from './brands';
import { MATCH_THRESHOLD, bestScore, prepareName, prepareQuery, type PreparedName } from './fuzzy';

export interface IndexedItem {
  item: Item;
  names: PreparedName[];
}

export interface SearchResult {
  item: Item;
  score: number;
  matched: string;
  active: boolean;
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
    return { item, names };
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
  for (const entry of index) {
    const { score, name } = bestScore(q, entry.names);
    if (score >= MATCH_THRESHOLD && name) {
      const active = !entry.item.deletedAt && effectiveStatus(entry.item, now) === 'active';
      results.push({ item: entry.item, score, matched: name.raw, active });
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
  return brandIndex
    .map((b) => ({ brand: b.brand, score: bestScore(q, b.names).score }))
    .filter((x) => x.score >= 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.brand);
}
