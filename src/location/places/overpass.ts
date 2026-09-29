import { distanceMeters, type LatLng } from '../geo';
import type { FetchLike, PlaceResult, PlacesProvider, StoreQuery } from './types';

/** Public Overpass instances, tried in order (the main one rate-limits busy IPs). */
export const OVERPASS_ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
/** overpass-api.de rejects requests without a descriptive User-Agent (HTTP 406). */
const USER_AGENT = 'Shovar/1.0 (personal wallet app; store-credit reminders)';

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

/** Escapes a name for a regex, then for an Overpass QL double-quoted string. */
function escapeForQl(s: string): string {
  const regex = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return regex.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/** Overpass QL: shops whose name / brand / localized name matches any spelling, around a point. */
export function buildOverpassQuery(names: string[], center: LatLng, radiusM: number): string {
  const pattern = `^(${names.map(escapeForQl).join('|')})$`;
  const around = `(around:${Math.round(radiusM)},${center.lat.toFixed(5)},${center.lng.toFixed(5)})`;
  const keys = ['name', 'brand', 'name:en', 'name:he'];
  const clauses = keys.map((k) => `nwr["${k}"~"${pattern}",i]${around};`).join('');
  return `[out:json][timeout:15];(${clauses});out center 40;`;
}

function address(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const parts = [street, tags['addr:city']].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

/**
 * OpenStreetMap via Overpass: free, no key. Used when no Google key is set.
 * Coverage of chain branches in Israel is good for large brands.
 */
export function createOverpassProvider(fetchImpl: FetchLike = fetch, endpoints: string[] = OVERPASS_ENDPOINTS): PlacesProvider {
  return {
    name: 'osm',
    async searchStore(query: StoreQuery, center: LatLng, radiusM: number, signal?: AbortSignal): Promise<PlaceResult[]> {
      const body = `data=${encodeURIComponent(buildOverpassQuery(query.names, center, radiusM))}`;
      let json: { elements?: OverpassElement[] } | null = null;
      let lastError: Error | null = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetchImpl(endpoint, {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json', 'User-Agent': USER_AGENT },
            body,
          });
          if (!res.ok) throw new Error(`Overpass ${res.status}`);
          json = (await res.json()) as { elements?: OverpassElement[] };
          break;
        } catch (e) {
          if (signal?.aborted) throw e;
          lastError = e instanceof Error ? e : new Error(String(e));
        }
      }
      if (!json) throw lastError ?? new Error('Overpass unavailable');

      const out: PlaceResult[] = [];
      for (const el of json.elements ?? []) {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (lat == null || lng == null) continue;
        if (distanceMeters(center, { lat, lng }) > radiusM * 1.2) continue;
        out.push({
          id: `osm:${el.type}/${el.id}`,
          name: el.tags?.name ?? query.names[0],
          address: address(el.tags),
          lat,
          lng,
          provider: 'osm',
        });
      }
      return out;
    },
  };
}
