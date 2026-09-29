import { compact, hasHebrew } from '@/search/normalize';

import { distanceMeters, type LatLng } from '../geo';
import type { FetchLike, PlaceResult, PlacesProvider, StoreQuery } from './types';

export const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
  };
}

/** One Hebrew and one Latin spelling is enough — Photon is a fuzzy search, not an exact index. */
export function photonQueryNames(names: string[]): string[] {
  const he = names.find((n) => hasHebrew(n));
  const latin = names.find((n) => !hasHebrew(n));
  return [he, latin].filter((n): n is string => !!n);
}

/**
 * OpenStreetMap data through Photon (komoot): a fast, location-biased search
 * that answers in well under a second, unlike the busy public Overpass servers.
 * Only the store name and the approximate area center are sent.
 */
export function createPhotonProvider(fetchImpl: FetchLike = fetch): PlacesProvider {
  return {
    name: 'osm',
    async searchStore(query: StoreQuery, center: LatLng, radiusM: number, signal?: AbortSignal): Promise<PlaceResult[]> {
      const wanted = query.names.map(compact).filter(Boolean);
      const found = new Map<string, PlaceResult>();
      await Promise.all(
        photonQueryNames(query.names).map(async (name) => {
          const url = `${PHOTON_ENDPOINT}?q=${encodeURIComponent(name)}&lat=${center.lat.toFixed(4)}&lon=${center.lng.toFixed(4)}&limit=40&location_bias_scale=0.6`;
          const res = await fetchImpl(url, { signal, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`Photon ${res.status}`);
          const json = (await res.json()) as { features?: PhotonFeature[] };
          for (const f of json.features ?? []) {
            const p = f.properties;
            const [lng, lat] = f.geometry?.coordinates ?? [];
            if (!p?.name || lat == null || lng == null) continue;
            // Photon also returns streets and towns that merely resemble the name.
            const n = compact(p.name);
            if (!wanted.some((w) => n.includes(w) || (n.length >= 4 && w.includes(n)))) continue;
            if (distanceMeters(center, { lat, lng }) > radiusM * 1.2) continue;
            const street = [p.street, p.housenumber].filter(Boolean).join(' ');
            const address = [street, p.city].filter(Boolean).join(', ');
            const id = `osm:${p.osm_type ?? 'x'}/${p.osm_id ?? `${lat},${lng}`}`;
            found.set(id, { id, name: p.name, address: address || null, lat, lng, provider: 'osm' });
          }
        }),
      );
      return [...found.values()];
    },
  };
}
