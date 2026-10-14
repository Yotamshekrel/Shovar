import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { isActive } from '@/domain/status';
import type { Item } from '@/domain/types';
import { useI18n } from '@/i18n';
import { groupName, storeGroups } from '@/networks/accepted';
import { getServices } from '@/services/database';
import { useItemsStore } from '@/state/items';
import { useSettings } from '@/state/settings';

import { nearestCredit } from './nearest';
import { formatDistance } from './nearbyAlert';
import { PlacesCache } from './places/placesCache';

const EMPTY: NearbyCredit[] = [];

export interface NearbyCredit {
  item: Item;
  distanceM: number;
  distanceLabel: string;
  /** Where the card can be used, when that differs from the card's own store (multi-store cards). */
  atStore: string | null;
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

  const enabled = Platform.OS !== 'web' && locationEnabled;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 });
      if (!pos || !alive) return;
      const active = items.filter((i) => isActive(i) && i.balanceMinor !== 0);
      const { db } = await getServices();
      const places = await new PlacesCache(db).placesFor([...storeGroups(active).keys()]);
      const near = nearestCredit(active, places, { lat: pos.coords.latitude, lng: pos.coords.longitude }).slice(0, limit);
      if (alive)
        setResult(
          near.map((n) => ({
            item: n.item,
            distanceM: n.distanceM,
            distanceLabel: formatDistance(lang, n.distanceM),
            atStore: n.group.direct ? null : groupName(n.group, lang) || null,
          })),
        );
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [items, enabled, lang, limit]);

  return enabled ? result : EMPTY;
}
