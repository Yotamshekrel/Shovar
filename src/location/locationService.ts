import * as Location from 'expo-location';
import { AppState, Platform } from 'react-native';

import { env } from '@/config/env';
import { localeFor, resolveLanguage } from '@/i18n';
import { presentNow } from '@/notifications/notifications';
import { storeKey as storeKeyOf } from '@/search/brands';
import { getSecret } from '@/security/keyStore';
import { getServices } from '@/services/database';
import { type AppSettings, SETTINGS_KEY, getSettings, sanitizeSettings, useSettingsStore } from '@/state/settings';

import { cellCenter, cellKey, distanceMeters, type LatLng } from './geo';
import { type GeofenceCandidate, REFRESH_REGION_ID, maxRegionsFor, parseStoreRegionId, planGeofences } from './geofencePlanner';
import { eligibleItemsForStore, nearbyNotificationContent } from './nearbyAlert';
import { createChainProvider } from './places/chain';
import { createGooglePlacesProvider } from './places/google';
import { createOverpassProvider } from './places/overpass';
import { createPhotonProvider } from './places/photon';
import { PlacesCache } from './places/placesCache';
import type { PlacesProvider, StoreQuery } from './places/types';
import { type NearbyStore, nearbyStores } from './nearest';
import { storeQueries } from './storeQueries';

export const GEOFENCE_TASK = 'shvar-geofence';
export const PLACES_KEY_SECRET = 'googlePlacesApiKey';
export const LOCATION_STATUS_KEY = 'location.status';
/** Radius used when looking up branches around the user's ~11 km cache cell. */
const LOOKUP_RADIUS_M = 12_000;
/** Cap network lookups per refresh (battery + API quota); the rest happen on later refreshes. */
const MAX_LOOKUPS_PER_REFRESH = 6;
const FIX_TIMEOUT_MS = 8_000;
/** The scan looks up branches around a ~2 km grid cell (radius covers the whole scan radius from anywhere in it). */
const SCAN_CELL_DEG = 0.02;
const SCAN_LOOKUP_RADIUS_M = 6_500;

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export interface LocationStatus {
  at: string;
  storeRegions: number;
  refreshRadius: number;
  reason: string;
}

export type RefreshOutcome =
  { status: 'ok'; storeRegions: number } | { status: 'disabled' | 'unsupported' | 'no-permission' | 'no-position' | 'no-items' | 'error' };

/** Settings may not be hydrated when the OS wakes the app in the background. */
async function readSettings(): Promise<AppSettings> {
  if (useSettingsStore.getState().loaded) return getSettings();
  const { kv } = await getServices();
  return sanitizeSettings(await kv.get<Partial<AppSettings>>(SETTINGS_KEY));
}

export async function locationPermissions(): Promise<{ foreground: boolean; background: boolean; canAskAgain: boolean }> {
  if (!supported) return { foreground: false, background: false, canAskAgain: false };
  const [fg, bg] = await Promise.all([Location.getForegroundPermissionsAsync(), Location.getBackgroundPermissionsAsync()]);
  return { foreground: fg.granted, background: bg.granted, canAskAgain: fg.canAskAgain };
}

/** Incremental request: "while using" first, then "always" (required for background geofencing). */
export async function requestLocationPermissions(): Promise<{ foreground: boolean; background: boolean }> {
  if (!supported) return { foreground: false, background: false };
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return { foreground: false, background: false };
  const bg = await Location.requestBackgroundPermissionsAsync();
  return { foreground: true, background: bg.granted };
}

async function currentPosition(allowActiveFix: boolean): Promise<LatLng | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60_000, requiredAccuracy: 500 });
    if (last) return { lat: last.coords.latitude, lng: last.coords.longitude };
    if (!allowActiveFix) return null;
    // A cold GPS fix can take a long time indoors; a coarse fix is plenty for finding stores.
    const fix = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), FIX_TIMEOUT_MS)),
    ]);
    if (fix) return { lat: fix.coords.latitude, lng: fix.coords.longitude };
    const stale = await Location.getLastKnownPositionAsync();
    return stale ? { lat: stale.coords.latitude, lng: stale.coords.longitude } : null;
  } catch {
    return null;
  }
}

/**
 * Photon answers in well under a second, so it goes first (after Google when a
 * key is set); the public Overpass servers are a slow last resort.
 */
async function placesProvider(): Promise<PlacesProvider> {
  const key = (await getSecret(PLACES_KEY_SECRET).catch(() => null)) || env.googlePlacesApiKey;
  const chain = [
    ...(key ? [{ provider: createGooglePlacesProvider(key), timeoutMs: 6_000 }] : []),
    { provider: createPhotonProvider(), timeoutMs: 6_000 },
    { provider: createOverpassProvider(), timeoutMs: 12_000 },
  ];
  return createChainProvider(chain);
}

export async function stopGeofences(): Promise<void> {
  if (!supported) return;
  try {
    if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) await Location.stopGeofencingAsync(GEOFENCE_TASK);
  } catch {
    // task may not be registered yet
  }
}

let refreshing: Promise<RefreshOutcome> | null = null;

/**
 * Looks up branches for stores with credit near the user (cached ~30 days per
 * area), then registers the nearest N as geofences plus a refresh boundary.
 */
export function refreshGeofences(reason: string, opts: { position?: LatLng; foreground?: boolean } = {}): Promise<RefreshOutcome> {
  refreshing ??= doRefresh(reason, opts).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh(reason: string, opts: { position?: LatLng; foreground?: boolean }): Promise<RefreshOutcome> {
  if (!supported) return { status: 'unsupported' };
  try {
    const settings = await readSettings();
    if (!settings.locationEnabled) {
      await stopGeofences();
      return { status: 'disabled' };
    }
    const perms = await locationPermissions();
    if (!perms.background) return { status: 'no-permission' };

    const { items: repo, db, kv } = await getServices();
    const active = await repo.listActiveItems();
    const groups = storeQueries(active);
    if (groups.size === 0) {
      await stopGeofences();
      await kv.set<LocationStatus>(LOCATION_STATUS_KEY, { at: new Date().toISOString(), storeRegions: 0, refreshRadius: 0, reason });
      return { status: 'no-items' };
    }

    const position = opts.position ?? (await currentPosition(opts.foreground ?? AppState.currentState === 'active'));
    if (!position) return { status: 'no-position' };

    const cache = new PlacesCache(db);
    const cell = cellKey(position);
    const provider = await placesProvider();
    const stale: StoreQuery[] = [];
    for (const q of groups.values()) {
      if (stale.length >= MAX_LOOKUPS_PER_REFRESH) break;
      if (!(await cache.isFresh(q.storeKey, cell))) stale.push(q);
    }
    await Promise.all(
      stale.map(async (q) => {
        try {
          // Only the store name and the ~11 km cell center are sent — never the exact position.
          const places = await provider.searchStore(q, cellCenter(cell), LOOKUP_RADIUS_M);
          await cache.save(q.storeKey, cell, provider.name, places);
        } catch (e) {
          console.warn('[location] places lookup failed', q.storeKey, e);
        }
      }),
    );

    const candidates: GeofenceCandidate[] = (await cache.placesFor([...groups.keys()])).map((p) => ({
      storeKey: p.storeKey,
      placeId: p.id,
      lat: p.lat,
      lng: p.lng,
    }));
    for (const i of active) {
      if (i.pinnedLat != null && i.pinnedLng != null && groups.has(storeKeyOf(i.storeName))) {
        candidates.push({ storeKey: storeKeyOf(i.storeName), placeId: `pinned:${i.id}`, lat: i.pinnedLat, lng: i.pinnedLng });
      }
    }

    const plan = planGeofences(position, candidates, { maxRegions: maxRegionsFor(Platform.OS), radiusM: settings.locationRadiusM });
    await Location.startGeofencingAsync(GEOFENCE_TASK, plan.regions);
    await kv.set<LocationStatus>(LOCATION_STATUS_KEY, {
      at: new Date().toISOString(),
      storeRegions: plan.storeRegions,
      refreshRadius: plan.refreshRadius,
      reason,
    });
    return { status: 'ok', storeRegions: plan.storeRegions };
  } catch (e) {
    console.warn('[location] refresh failed', e);
    return { status: 'error' };
  }
}

/** Handles a geofence event from the background task (or a simulated one). */
export async function handleGeofenceEvent(
  eventType: Location.GeofencingEventType,
  region: Pick<Location.LocationRegion, 'identifier' | 'latitude' | 'longitude' | 'radius'>,
): Promise<void> {
  if (region.identifier === REFRESH_REGION_ID) {
    if (eventType === Location.GeofencingEventType.Exit) await refreshGeofences('moved', { foreground: false });
    return;
  }
  if (eventType !== Location.GeofencingEventType.Enter || !region.identifier) return;
  const parsed = parseStoreRegionId(region.identifier);
  if (!parsed) return;
  await notifyNearby(parsed.storeKey, { lat: region.latitude, lng: region.longitude }, region.radius);
}

/** Sends "You have ₪120 credit at Zara, 150m away" unless muted or within the cooldown. */
export async function notifyNearby(
  storeKey: string,
  place: LatLng,
  fallbackDistanceM: number,
  opts: { ignoreCooldown?: boolean; forceDistanceM?: number } = {},
): Promise<boolean> {
  const settings = await readSettings();
  if (!settings.locationEnabled && !opts.ignoreCooldown) return false;
  const { items: repo, db } = await getServices();
  const items = eligibleItemsForStore(await repo.listActiveItems(), storeKey);
  if (items.length === 0) return false;
  const cache = new PlacesCache(db);
  if (!opts.ignoreCooldown && !(await cache.tryClaimAlert(storeKey, settings.locationCooldownHours))) return false;

  const here = opts.forceDistanceM != null ? null : await currentPosition(false);
  const distance = opts.forceDistanceM ?? (here ? distanceMeters(here, place) : fallbackDistanceM);
  const lang = resolveLanguage(settings.language);
  const content = nearbyNotificationContent(items, distance, lang, localeFor(lang));
  if (!content) return false;
  await presentNow(content);
  return true;
}

/** For the settings screen: send a sample reminder for the store with the most credit. */
export async function sendTestNearbyReminder(): Promise<boolean> {
  const { items: repo } = await getServices();
  const groups = storeQueries(await repo.listActiveItems());
  const first = [...groups.keys()][0];
  if (!first) return false;
  return notifyNearby(first, { lat: 0, lng: 0 }, 150, { ignoreCooldown: true, forceDistanceM: 150 });
}

/** "I'm at this store now": saves the current position as this card's store location. */
export async function pinCurrentLocation(): Promise<LatLng | null> {
  if (!supported) return null;
  const perm = await Location.requestForegroundPermissionsAsync();
  if (!perm.granted) return null;
  try {
    const fix = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: fix.coords.latitude, lng: fix.coords.longitude };
  } catch {
    return null;
  }
}

export type ScanOutcome =
  | { status: 'ok'; stores: NearbyStore[]; storesWithCredit: number }
  | { status: 'unsupported' | 'no-permission' | 'no-position' | 'no-items' | 'error' };

const scanCell = (p: LatLng) => `scan:${Math.floor(p.lat / SCAN_CELL_DEG)}:${Math.floor(p.lng / SCAN_CELL_DEG)}`;
function scanCellCenter(key: string): LatLng {
  const [, lat, lng] = key.split(':').map(Number);
  return { lat: (lat + 0.5) * SCAN_CELL_DEG, lng: (lng + 0.5) * SCAN_CELL_DEG };
}

/**
 * "What's around me": foreground location only. Shows what the local cache
 * already knows straight away (`onUpdate`), then looks up the remaining stores
 * in parallel and returns the final list, closest first.
 */
export async function scanNearby(onUpdate?: (partial: ScanOutcome) => void): Promise<ScanOutcome> {
  if (!supported) return { status: 'unsupported' };
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return { status: 'no-permission' };
    const { items: repo, db } = await getServices();
    const active = (await repo.listActiveItems()).filter((i) => i.balanceMinor !== 0);
    const groups = storeQueries(active);
    if (groups.size === 0) return { status: 'no-items' };
    const position = await currentPosition(true);
    if (!position) return { status: 'no-position' };

    const cache = new PlacesCache(db);
    const cell = scanCell(position);
    const relevant = active.filter((i) => groups.has(storeKeyOf(i.storeName)));
    const compute = async (): Promise<ScanOutcome> => ({
      status: 'ok',
      stores: nearbyStores(relevant, await cache.placesFor([...groups.keys()]), position),
      storesWithCredit: groups.size,
    });

    const stale: StoreQuery[] = [];
    for (const q of groups.values()) if (!(await cache.isFresh(q.storeKey, cell))) stale.push(q);
    if (stale.length === 0) return compute();

    const cached = await compute();
    if (cached.status === 'ok' && cached.stores.length > 0) onUpdate?.(cached);

    const provider = await placesProvider();
    await Promise.all(
      stale.map(async (q) => {
        try {
          // Only the store name and a ~2 km grid-cell center are sent — never the exact position.
          const places = await provider.searchStore(q, scanCellCenter(cell), SCAN_LOOKUP_RADIUS_M);
          await cache.save(q.storeKey, cell, provider.name, places);
        } catch (e) {
          console.warn('[location] scan lookup failed', q.storeKey, e);
        }
      }),
    );
    return compute();
  } catch (e) {
    console.warn('[location] scan failed', e);
    return { status: 'error' };
  }
}
