import { distanceMeters, type LatLng } from '../geo';
import type { FetchLike, PlaceResult, PlacesProvider, StoreQuery } from './types';

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location';

interface GooglePlace {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
}

/**
 * Google Places API (New) — Text Search biased to the user's area. Only the
 * store name and an approximate area center are sent; never the exact position.
 */
export function createGooglePlacesProvider(apiKey: string, fetchImpl: FetchLike = fetch): PlacesProvider {
  return {
    name: 'google',
    async searchStore(query: StoreQuery, center: LatLng, radiusM: number, signal?: AbortSignal): Promise<PlaceResult[]> {
      const seen = new Map<string, PlaceResult>();
      // One request per spelling is wasteful; the first (canonical) name finds branches in either language.
      const textQuery = query.names[0];
      const res = await fetchImpl(ENDPOINT, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery,
          maxResultCount: 20,
          locationBias: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius: Math.min(50_000, radiusM) } },
        }),
      });
      if (!res.ok) throw new Error(`Places API ${res.status}`);
      const json = (await res.json()) as { places?: GooglePlace[] };
      for (const p of json.places ?? []) {
        const lat = p.location?.latitude;
        const lng = p.location?.longitude;
        if (!p.id || lat == null || lng == null) continue;
        // locationBias is a preference, not a restriction — drop far-away hits.
        if (distanceMeters(center, { lat, lng }) > radiusM * 1.5) continue;
        seen.set(p.id, {
          id: `google:${p.id}`,
          name: p.displayName?.text ?? textQuery,
          address: p.formattedAddress ?? null,
          lat,
          lng,
          provider: 'google',
        });
      }
      return [...seen.values()];
    },
  };
}
