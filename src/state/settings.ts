import { create } from 'zustand';

import type { SortKey } from '@/domain/status';

export type LanguagePref = 'system' | 'en' | 'he';
export type ThemePref = 'system' | 'light' | 'dark';

export interface AppSettings {
  language: LanguagePref;
  theme: ThemePref;
  defaultCurrency: string;
  sort: SortKey;
  onboardingDone: boolean;
  // Expiry reminders
  expiryRemindersEnabled: boolean;
  expiryReminderDays: number[];
  reminderHour: number;
  // Location reminders
  locationEnabled: boolean;
  locationRadiusM: number;
  locationCooldownHours: number;
  // Security
  biometricLock: boolean;
  lockAfterSeconds: number;
  // AI extraction
  aiExtractionEnabled: boolean;
  aiConsentGiven: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: 'system',
  theme: 'system',
  defaultCurrency: 'ILS',
  sort: 'expiry',
  onboardingDone: false,
  expiryRemindersEnabled: true,
  expiryReminderDays: [14, 3],
  reminderHour: 10,
  locationEnabled: false,
  locationRadiusM: 150,
  locationCooldownHours: 12,
  biometricLock: false,
  lockAfterSeconds: 60,
  aiExtractionEnabled: true,
  aiConsentGiven: false,
};

export const SETTINGS_KEY = 'settings.v1';

/** Merges stored settings with defaults, dropping unknown / malformed values. */
export function sanitizeSettings(stored: Partial<AppSettings> | null | undefined): AppSettings {
  const s = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  const days = Array.isArray(s.expiryReminderDays)
    ? [...new Set(s.expiryReminderDays.filter((d) => Number.isInteger(d) && d >= 0 && d <= 365))].sort((a, b) => b - a)
    : DEFAULT_SETTINGS.expiryReminderDays;
  return {
    ...s,
    expiryReminderDays: days,
    reminderHour: Number.isInteger(s.reminderHour) && s.reminderHour >= 0 && s.reminderHour <= 23 ? s.reminderHour : 10,
    locationRadiusM: Math.min(500, Math.max(100, Number(s.locationRadiusM) || 150)),
    locationCooldownHours: Math.min(168, Math.max(1, Number(s.locationCooldownHours) || 12)),
  };
}

interface SettingsState {
  settings: AppSettings;
  loaded: boolean;
  hydrate: (s: AppSettings) => void;
  patch: (p: Partial<AppSettings>) => void;
}

/**
 * In-memory settings. Persistence is handled by `services/settingsService`,
 * which subscribes to this store and writes changes to SQLite.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  hydrate: (settings) => set({ settings, loaded: true }),
  patch: (p) => set((st) => ({ settings: sanitizeSettings({ ...st.settings, ...p }) })),
}));

export function useSettings(): AppSettings {
  return useSettingsStore((s) => s.settings);
}

export function getSettings(): AppSettings {
  return useSettingsStore.getState().settings;
}
