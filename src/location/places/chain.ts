import type { LatLng } from '../geo';
import type { PlaceResult, PlacesProvider, StoreQuery } from './types';

/** Rejects if `p` takes longer than `ms`, aborting the underlying request. */
async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Tries providers in order, each with its own timeout, and returns the first
 * that answers. A provider that answers "no branches" is trusted; only errors
 * and timeouts fall through to the next one.
 */
export function createChainProvider(providers: { provider: PlacesProvider; timeoutMs: number }[]): PlacesProvider {
  return {
    name: providers[0].provider.name,
    async searchStore(query: StoreQuery, center: LatLng, radiusM: number, signal?: AbortSignal): Promise<PlaceResult[]> {
      let lastError: unknown = new Error('No places provider');
      for (const { provider, timeoutMs } of providers) {
        if (signal?.aborted) break;
        try {
          return await withTimeout((s) => provider.searchStore(query, center, radiusM, s), timeoutMs);
        } catch (e) {
          lastError = e;
        }
      }
      throw lastError;
    },
  };
}
