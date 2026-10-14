import type { LatLng } from '../geo';

export type PlacesProviderName = 'google' | 'osm' | 'pinned';

export interface PlaceResult {
  /** Provider-scoped id, e.g. `google:ChIJ…`, `osm:node/123`. */
  id: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  provider: PlacesProviderName;
}

export interface StoreQuery {
  /** Canonical store key (brand:zara / name:…). */
  storeKey: string;
  /** Every spelling to search for (e.g. "Zara", "זארה"). */
  names: string[];
  /** Lookup priority: 0 = a card for exactly this store; higher = a store reached through a multi-store card. */
  rank?: number;
}

export interface PlacesProvider {
  name: Exclude<PlacesProviderName, 'pinned'>;
  /** Branches of the store near `center` (within roughly `radiusM`). */
  searchStore(query: StoreQuery, center: LatLng, radiusM: number, signal?: AbortSignal): Promise<PlaceResult[]>;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
