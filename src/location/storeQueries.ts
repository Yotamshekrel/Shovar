import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';
import { brandNames, findBrand, storeKey as storeKeyOf } from '@/search/brands';

import type { StoreQuery } from './places/types';

/** Active, unmuted items grouped by canonical store with all spellings to search for. */
export function storeQueries(items: Item[], now = new Date()): Map<string, StoreQuery> {
  const groups = new Map<string, StoreQuery>();
  for (const i of items) {
    if (i.deletedAt || i.locationMuted || i.balanceMinor === 0 || effectiveStatus(i, now) !== 'active') continue;
    const key = storeKeyOf(i.storeName);
    const brand = findBrand(i.storeName);
    const names = brand ? [brand.name, ...brandNames(brand)] : [i.storeName];
    const existing = groups.get(key);
    groups.set(key, { storeKey: key, names: [...new Set([...(existing?.names ?? []), ...names, i.storeName])] });
  }
  return groups;
}
