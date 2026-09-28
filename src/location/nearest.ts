import type { Item } from '@/domain/types';
import { storeKey } from '@/search/brands';

import { distanceMeters, type LatLng } from './geo';

export const NEARBY_RADIUS_M = 3000;

/** Pure: nearest cached branch per item within `radius`, closest first. */
export function nearestCredit(
  items: Item[],
  places: { storeKey: string; lat: number; lng: number }[],
  here: LatLng,
  radius = NEARBY_RADIUS_M,
): { item: Item; distanceM: number }[] {
  const byStore = new Map<string, { lat: number; lng: number }[]>();
  for (const p of places) byStore.set(p.storeKey, [...(byStore.get(p.storeKey) ?? []), p]);
  const out: { item: Item; distanceM: number }[] = [];
  for (const item of items) {
    const spots = [...(byStore.get(storeKey(item.storeName)) ?? [])];
    if (item.pinnedLat != null && item.pinnedLng != null) spots.push({ lat: item.pinnedLat, lng: item.pinnedLng });
    let best = Number.POSITIVE_INFINITY;
    for (const s of spots) best = Math.min(best, distanceMeters(here, s));
    if (best <= radius) out.push({ item, distanceM: best });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}
