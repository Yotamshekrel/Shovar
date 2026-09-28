import { reloadAppAsync } from 'expo';
import { I18nManager, Platform } from 'react-native';

import { isRtlLanguage, resolveLanguage } from '@/i18n';
import { useItemsStore } from '@/state/items';
import { SETTINGS_KEY, sanitizeSettings, useSettingsStore, type AppSettings } from '@/state/settings';

import { getServices } from './database';

let persistUnsub: (() => void) | null = null;

/** Loads persisted settings into the store and keeps them saved on change. */
export async function loadSettings(): Promise<AppSettings> {
  const { kv } = await getServices();
  const stored = await kv.get<Partial<AppSettings>>(SETTINGS_KEY);
  const settings = sanitizeSettings(stored);
  useSettingsStore.getState().hydrate(settings);

  persistUnsub?.();
  let timer: ReturnType<typeof setTimeout> | null = null;
  persistUnsub = useSettingsStore.subscribe((state, prev) => {
    if (state.settings === prev.settings) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      kv.set(SETTINGS_KEY, state.settings).catch((e) => console.warn('[settings] persist failed', e));
    }, 150);
  });
  return settings;
}

/**
 * Makes the native layout direction match the chosen language. Returns true
 * when a restart is needed for the change to take effect.
 */
export function applyLayoutDirection(settings: AppSettings): boolean {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const lang = resolveLanguage(settings.language);
      document.documentElement.dir = isRtlLanguage(lang) ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
    return false;
  }
  const wantRtl = isRtlLanguage(resolveLanguage(settings.language));
  if (I18nManager.isRTL === wantRtl) return false;
  I18nManager.allowRTL(wantRtl);
  I18nManager.forceRTL(wantRtl);
  return true;
}

const RTL_ATTEMPT_KEY = 'rtl.lastForced';

/**
 * Called once at startup: if the stored language disagrees with the current
 * layout direction, flip it and reload — but only once, to avoid reload loops
 * in environments that reset RTL (e.g. Expo Go).
 */
export async function ensureLayoutDirection(settings: AppSettings): Promise<void> {
  if (!applyLayoutDirection(settings)) return;
  const { kv } = await getServices();
  const want = isRtlLanguage(resolveLanguage(settings.language)) ? 'rtl' : 'ltr';
  const last = await kv.get<{ want: string; at: number }>(RTL_ATTEMPT_KEY);
  if (last && last.want === want && Date.now() - last.at < 60_000) return;
  await kv.set(RTL_ATTEMPT_KEY, { want, at: Date.now() });
  await reloadAppAsync('layout direction changed');
}

export async function restartApp(reason = 'settings changed'): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.location.reload();
    return;
  }
  await reloadAppAsync(reason);
}

export async function initApp(): Promise<AppSettings> {
  const settings = await loadSettings();
  await ensureLayoutDirection(settings);
  await useItemsStore.getState().refresh();
  return settings;
}
