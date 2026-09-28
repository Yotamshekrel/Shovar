import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isActive } from '@/domain/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { storeKey } from '@/search/brands';
import { getServices } from '@/services/database';
import { useItemsStore } from '@/state/items';
import { useSettings } from '@/state/settings';

import { nearestCredit } from './nearest';
import { formatDistance } from './nearbyAlert';
import { PlacesCache } from './places/placesCache';

export interface NearbyCredit {
  item: Item;
  distanceM: number;
  distanceLabel: string;
}

/**
 * "Near you" section of search: stores with credit close to the last known
 * position, using only the local places cache (no network, no permission prompt).
 */
export function useNearbyCredit(limit = 3): NearbyCredit[] {
  const items = useItemsStore((s) => s.items);
  const { locationEnabled } = useSettings();
  const { lang } = useI18n();
  const [result, setResult] = useState<NearbyCredit[]>([]);

  useEffect(() => {
    if (Platform.OS === 'web' || !locationEnabled) {
      setResult([]);
      return;
    }
    let alive = true;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 });
      if (!pos || !alive) return;
      const active = items.filter((i) => isActive(i) && i.balanceMinor !== 0);
      const { db } = await getServices();
      const places = await new PlacesCache(db).placesFor([...new Set(active.map((i) => storeKey(i.storeName)))]);
      const near = nearestCredit(active, places, { lat: pos.coords.latitude, lng: pos.coords.longitude }).slice(0, limit);
      if (alive) setResult(near.map((n) => ({ ...n, distanceLabel: formatDistance(lang, n.distanceM) })));
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [items, locationEnabled, lang, limit]);

  return result;
}
