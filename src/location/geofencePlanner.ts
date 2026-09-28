import { distanceMeters, type LatLng } from './geo';

export interface GeofenceCandidate {
  storeKey: string;
  /** Unique per physical branch. */
  placeId: string;
  lat: number;
  lng: number;
}

export interface PlannedRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
}

export interface GeofencePlan {
  regions: PlannedRegion[];
  /** Store regions only (excludes the refresh boundary). */
  storeRegions: number;
  refreshRadius: number;
}

export interface GeofencePlanOptions {
  /** Total regions the OS allows us to monitor (iOS 20, Android 100). */
  maxRegions: number;
  /** Store geofence radius in meters. */
  radiusM: number;
  /** Ignore branches further than this. */
  maxDistanceM?: number;
  minRefreshRadiusM?: number;
  maxRefreshRadiusM?: number;
}

export const REFRESH_REGION_ID = 'refresh';
const STORE_PREFIX = 'store|';

/** iOS monitors at most 20 regions per app; keep one slot for the refresh boundary. */
export function maxRegionsFor(platform: string): number {
  return platform === 'ios' ? 20 : 60;
}

export function storeRegionId(storeKey: string, placeId: string): string {
  return `${STORE_PREFIX}${storeKey}|${placeId}`;
}

export function parseStoreRegionId(identifier: string): { storeKey: string; placeId: string } | null {
  if (!identifier.startsWith(STORE_PREFIX)) return null;
  const rest = identifier.slice(STORE_PREFIX.length);
  const sep = rest.indexOf('|');
  if (sep <= 0) return null;
  return { storeKey: rest.slice(0, sep), placeId: rest.slice(sep + 1) };
}

/**
 * Chooses which geofences to register: the nearest store branches (up to the
 * platform limit minus one), plus a "refresh" region around the user. Leaving
 * the refresh region wakes the app to recompute the set, so we never need
 * continuous GPS tracking — only the OS's low-power region monitoring.
 */
export function planGeofences(position: LatLng, candidates: GeofenceCandidate[], opts: GeofencePlanOptions): GeofencePlan {
  const maxDistance = opts.maxDistanceM ?? 30_000;
  const minRefresh = opts.minRefreshRadiusM ?? 1_000;
  const maxRefresh = opts.maxRefreshRadiusM ?? 5_000;
  const slots = Math.max(0, opts.maxRegions - 1);

  const unique = new Map<string, GeofenceCandidate & { distance: number }>();
  for (const c of candidates) {
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const id = storeRegionId(c.storeKey, c.placeId);
    if (unique.has(id)) continue;
    const distance = distanceMeters(position, c);
    if (distance > maxDistance) continue;
    unique.set(id, { ...c, distance });
  }

  const nearest = [...unique.entries()].sort((a, b) => a[1].distance - b[1].distance).slice(0, slots);

  const regions: PlannedRegion[] = nearest.map(([identifier, c]) => ({
    identifier,
    latitude: c.lat,
    longitude: c.lng,
    radius: opts.radiusM,
    notifyOnEnter: true,
    notifyOnExit: false,
  }));

  // Re-plan once the user has moved about half-way to the furthest monitored branch.
  const furthest = nearest.length ? nearest[nearest.length - 1][1].distance : maxRefresh * 2;
  const refreshRadius = Math.round(Math.min(maxRefresh, Math.max(minRefresh, furthest / 2)));
  regions.push({
    identifier: REFRESH_REGION_ID,
    latitude: position.lat,
    longitude: position.lng,
    radius: refreshRadius,
    notifyOnEnter: false,
    notifyOnExit: true,
  });

  return { regions, storeRegions: nearest.length, refreshRadius };
}
