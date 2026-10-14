import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';
import { storeGroups } from '@/networks/accepted';

import type { StoreQuery } from './places/types';

/**
 * Active, unmuted items grouped by canonical store with all spellings to search for.
 * Multi-store cards (BuyMe, Tav Zahav, …) contribute a query for every store of their network.
 * Queries are ordered by importance: stores you hold a card for first, then well-known chains.
 */
export function storeQueries(items: Item[], now = new Date()): Map<string, StoreQuery> {
  const eligible = items.filter((i) => !i.deletedAt && !i.locationMuted && i.balanceMinor !== 0 && effectiveStatus(i, now) === 'active');
  const groups = [...storeGroups(eligible).values()].sort((a, b) => a.rank - b.rank);
  return new Map(groups.map((g) => [g.key, { storeKey: g.key, names: g.names, rank: g.rank }]));
}
