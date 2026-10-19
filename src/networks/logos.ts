import { findBrand } from '@/search/brands';
import { compact } from '@/search/normalize';

import index from './logoIndex.json';
import { LOGO_FILES } from './logoFiles';

const INDEX = index as Record<string, string>;
const cache = new Map<string, number | null>();

/** Bundled logo (an `expo-image` / `require` source) for a store, matched by name in any spelling; null when we have none. */
export function storeLogo(...names: (string | null | undefined)[]): number | null {
  const wanted = names.filter((n): n is string => !!n && n.trim().length > 0);
  if (wanted.length === 0) return null;
  const cacheKey = wanted.join('|');
  const hit = cache.get(cacheKey);
  if (hit !== undefined) return hit;

  let id: string | undefined;
  for (const name of wanted) {
    // "FOX - תל אביב" is the chain "FOX".
    id = INDEX[compact(name)] ?? INDEX[compact(name.split(/\s+-\s+/)[0])];
    if (!id) {
      const brand = findBrand(name);
      if (brand) id = INDEX[compact(brand.name)] ?? (brand.nameHe ? INDEX[compact(brand.nameHe)] : undefined);
    }
    if (id) break;
  }
  const source = id ? (LOGO_FILES[id]?.() ?? null) : null;
  cache.set(cacheKey, source);
  return source;
}
