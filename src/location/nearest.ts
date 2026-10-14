import type { Item } from '@/domain/types';
import { type StoreGroup, storeGroups } from '@/networks/accepted';

import { distanceMeters, type LatLng } from './geo';

export const NEARBY_RADIUS_M = 3000;
/** "What's around me" scan radius. */
export const SCAN_RADIUS_M = 5000;

type PlaceLike = { storeKey: string; address?: string | null; lat: number; lng: number };

function spotsFor(group: StoreGroup, places: PlaceLike[]): { address: string | null; lat: number; lng: number }[] {
  const spots: { address: string | null; lat: number; lng: number }[] = places
    .filter((p) => p.storeKey === group.key)
    .map((p) => ({ address: p.address ?? null, lat: p.lat, lng: p.lng }));
  // A pinned location belongs to the store the card is specifically for.
  if (group.direct)
    for (const i of group.items)
      if (i.pinnedLat != null && i.pinnedLng != null) spots.push({ address: null, lat: i.pinnedLat, lng: i.pinnedLng });
  return spots;
}

function closest(here: LatLng, spots: { address: string | null; lat: number; lng: number }[]) {
  let best: { spot: (typeof spots)[number]; d: number } | null = null;
  for (const spot of spots) {
    const d = distanceMeters(here, spot);
    if (!best || d < best.d) best = { spot, d };
  }
  return best;
}

export interface NearestCredit {
  item: Item;
  distanceM: number;
  /** The store where the card can be used (differs from the card's own store for multi-store cards). */
  group: StoreGroup;
}

/** Pure: nearest cached branch per item within `radius`, closest first. */
export function nearestCredit(items: Item[], places: PlaceLike[], here: LatLng, radius = NEARBY_RADIUS_M): NearestCredit[] {
  const best = new Map<string, NearestCredit>();
  for (const group of storeGroups(items).values()) {
    const hit = closest(here, spotsFor(group, places));
    if (!hit || hit.d > radius) continue;
    for (const item of group.items) {
      const prev = best.get(item.id);
      if (!prev || hit.d < prev.distanceM) best.set(item.id, { item, distanceM: hit.d, group });
    }
  }
  return [...best.values()].sort((a, b) => a.distanceM - b.distanceM);
}

export interface NearbyStore {
  storeKey: string;
  /** Name for display (a card's own store name when the user has one, else the network's name). */
  storeName: string;
  storeNameHe: string | null;
  storeNameEn: string | null;
  /** Cards usable here, cards specifically for this store first. */
  items: Item[];
  distanceM: number;
  address: string | null;
  lat: number;
  lng: number;
}

/** Pure: one entry per store (all cards usable there together) with the closest known branch within `radius`, closest first. */
export function nearbyStores(items: Item[], places: PlaceLike[], here: LatLng, radius = SCAN_RADIUS_M): NearbyStore[] {
  const out: NearbyStore[] = [];
  for (const group of storeGroups(items).values()) {
    const hit = closest(here, spotsFor(group, places));
    if (!hit || hit.d > radius) continue;
    const direct = group.direct ? group.items[0] : null;
    out.push({
      storeKey: group.key,
      storeName: direct?.storeName ?? group.nameHe ?? group.nameEn ?? group.items[0].storeName,
      storeNameHe: group.nameHe,
      storeNameEn: group.nameEn,
      items: group.items,
      distanceM: hit.d,
      address: hit.spot.address,
      lat: hit.spot.lat,
      lng: hit.spot.lng,
    });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}
