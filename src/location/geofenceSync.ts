import { AppState, Platform } from 'react-native';

import type { Item } from '@/domain/types';
import { storeKey } from '@/search/brands';
import { useSettingsStore } from '@/state/settings';

import { refreshGeofences } from './locationService';

const FOREGROUND_THROTTLE_MS = 10 * 60_000;

let started = false;
let lastRefreshAt = 0;
let lastSignature = '';
let timer: ReturnType<typeof setTimeout> | null = null;

function schedule(reason: string, delay = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    lastRefreshAt = Date.now();
    refreshGeofences(reason, { foreground: AppState.currentState === 'active' }).catch(() => {});
  }, delay);
}

/** Which stores/pins/mutes are relevant for geofences — refresh only when this changes. */
function signature(items: Item[]): string {
  return items
    .filter((i) => !i.deletedAt && i.status === 'active' && !i.locationMuted && i.balanceMinor !== 0)
    .map((i) => `${storeKey(i.storeName)}@${i.pinnedLat ?? ''},${i.pinnedLng ?? ''}`)
    .sort()
    .join('|');
}

/**
 * Keeps registered geofences current: when stores with credit change, when
 * location settings change, and when the app returns to the foreground
 * (throttled). Leaving the refresh region handles the background case.
 */
export function startGeofenceSync(onItemsChanged: (l: (items: Item[]) => void) => () => void): void {
  if (started || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
  started = true;

  onItemsChanged((items) => {
    const sig = signature(items);
    if (sig === lastSignature) return;
    lastSignature = sig;
    schedule('items-changed');
  });

  useSettingsStore.subscribe((state, prev) => {
    const a = state.settings;
    const b = prev.settings;
    if (a.locationEnabled !== b.locationEnabled || a.locationRadiusM !== b.locationRadiusM) schedule('settings-changed', 300);
  });

  AppState.addEventListener('change', (next) => {
    if (next === 'active' && Date.now() - lastRefreshAt > FOREGROUND_THROTTLE_MS) schedule('foreground', 3000);
  });
}
