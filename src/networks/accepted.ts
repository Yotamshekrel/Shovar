import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';
import type { Lang } from '@/i18n';
import { brandById, brandNames, findBrand } from '@/search/brands';

import { canonicalStoreKey, networkIdFor, networkStores } from './registry';

/**
 * "Which stores can this card be used at?" — the single source of truth for
 * location features. A plain card is accepted at its own store; a multi-store
 * card (BuyMe, Tav Zahav, …) at every locatable store of its network.
 */
export interface StoreGroup {
  key: string;
  /** Cards usable here, cards of this very store first. */
  items: Item[];
  /** True when at least one card is specifically for this store. */
  direct: boolean;
  /** Names of the store (Hebrew / English) for display. */
  nameHe: string | null;
  nameEn: string | null;
  /** Every spelling to search places for. */
  names: string[];
  /** 0 = user has a card for exactly this store; larger = less certain / well-known. */
  rank: number;
}

const HEBREW = /[א-ת]/;

function ownNames(item: Item): { key: string; names: string[]; nameHe: string | null; nameEn: string | null } {
  const brand = findBrand(item.storeName);
  const names = brand ? [brand.name, ...brandNames(brand), item.storeName] : [item.storeName];
  return {
    key: canonicalStoreKey(item.storeName),
    names,
    nameHe: brand?.nameHe ?? (HEBREW.test(item.storeName) ? item.storeName : null),
    nameEn: brand?.name ?? (HEBREW.test(item.storeName) ? null : item.storeName),
  };
}

/** Whether a card is a multi-store card with a known store list. */
export function hasNetwork(item: Pick<Item, 'storeName' | 'network'>): boolean {
  return networkStores(networkIdFor(item)).length > 0;
}

/** True if the card is specifically for the store with this key (not merely usable there through a network). */
export function isOwnStore(item: Item, key: string): boolean {
  return canonicalStoreKey(item.storeName) === key;
}

/** True if `item` can be used at the store with this key (a plain card: only its own store). */
export function isAcceptedAt(item: Item, key: string): boolean {
  if (hasNetwork(item)) return networkStores(networkIdFor(item)).some((s) => s.key === key && s.physical);
  return canonicalStoreKey(item.storeName) === key;
}

/** Cards grouped by the store they can be used at. */
export function storeGroups(items: Item[]): Map<string, StoreGroup> {
  const groups = new Map<string, StoreGroup>();
  const add = (
    key: string,
    item: Item,
    direct: boolean,
    info: { names: string[]; nameHe: string | null; nameEn: string | null },
    rank: number,
  ) => {
    const g = groups.get(key);
    if (!g) {
      groups.set(key, { key, items: [item], direct, names: [...new Set(info.names)], nameHe: info.nameHe, nameEn: info.nameEn, rank });
      return;
    }
    if (!g.items.includes(item)) {
      if (direct) g.items.unshift(item);
      else g.items.push(item);
    }
    g.names = [...new Set([...g.names, ...info.names])];
    if (direct && !g.direct) {
      g.direct = true;
      g.nameHe = info.nameHe ?? g.nameHe;
      g.nameEn = info.nameEn ?? g.nameEn;
    } else {
      g.nameHe ??= info.nameHe;
      g.nameEn ??= info.nameEn;
    }
    g.rank = Math.min(g.rank, rank);
  };

  for (const item of items) {
    const stores = networkStores(networkIdFor(item));
    if (stores.length === 0) {
      const own = ownNames(item);
      add(own.key, item, true, own, 0);
      continue;
    }
    for (const s of stores) {
      if (!s.locatable) continue;
      const brand = s.key.startsWith('brand:') ? brandById(s.key.slice(6)) : null;
      const nameEn = s.nameEn ?? brand?.name ?? (HEBREW.test(s.name) ? null : s.name);
      const nameHe = brand?.nameHe ?? (HEBREW.test(s.name) ? s.name : null);
      // Well-known chains (listed by many networks) are looked up first.
      add(s.key, item, false, { names: s.names, nameHe, nameEn }, 1 + Math.max(0, 5 - s.popularity) / 10);
    }
  }
  return groups;
}

export function groupName(g: Pick<StoreGroup, 'nameHe' | 'nameEn'>, lang: Lang): string {
  return (lang === 'he' ? (g.nameHe ?? g.nameEn) : (g.nameEn ?? g.nameHe)) ?? '';
}

/** Cards that should trigger a nearby reminder at the store with this key. */
export function eligibleAt(items: Item[], key: string, now = new Date()): Item[] {
  return items.filter(
    (i) => !i.deletedAt && !i.locationMuted && effectiveStatus(i, now) === 'active' && i.balanceMinor !== 0 && isAcceptedAt(i, key),
  );
}
