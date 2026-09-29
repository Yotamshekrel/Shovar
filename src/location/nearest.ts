import type { Item } from '@/domain/types';
import { storeKey } from '@/search/brands';

import { distanceMeters, type LatLng } from './geo';

export const NEARBY_RADIUS_M = 3000;
/** "What's around me" scan radius. */
export const SCAN_RADIUS_M = 5000;

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

export interface NearbyStore {
  storeKey: string;
  storeName: string;
  items: Item[];
  distanceM: number;
  address: string | null;
  lat: number;
  lng: number;
}

/** Pure: one entry per store (all its cards together) with the closest known branch within `radius`, closest first. */
export function nearbyStores(
  items: Item[],
  places: { storeKey: string; address?: string | null; lat: number; lng: number }[],
  here: LatLng,
  radius = SCAN_RADIUS_M,
): NearbyStore[] {
  const groups = new Map<string, Item[]>();
  for (const item of items) groups.set(storeKey(item.storeName), [...(groups.get(storeKey(item.storeName)) ?? []), item]);
  const out: NearbyStore[] = [];
  for (const [key, group] of groups) {
    const spots: { address: string | null; lat: number; lng: number }[] = places
      .filter((p) => p.storeKey === key)
      .map((p) => ({ address: p.address ?? null, lat: p.lat, lng: p.lng }));
    for (const i of group) if (i.pinnedLat != null && i.pinnedLng != null) spots.push({ address: null, lat: i.pinnedLat, lng: i.pinnedLng });
    let best: { spot: (typeof spots)[number]; d: number } | null = null;
    for (const spot of spots) {
      const d = distanceMeters(here, spot);
      if (!best || d < best.d) best = { spot, d };
    }
    if (best && best.d <= radius) {
      out.push({ storeKey: key, storeName: group[0].storeName, items: group, distanceM: best.d, address: best.spot.address, lat: best.spot.lat, lng: best.spot.lng });
    }
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}
