import { getLocales } from 'expo-localization';
import { useMemo } from 'react';

import { type LanguagePref, getSettings, useSettings } from '@/state/settings';

import { en, type StringKey } from './en';
import { he } from './he';

export type Lang = 'en' | 'he';
export type { StringKey };

const DICTS: Record<Lang, Record<StringKey, string>> = { en, he };

export function deviceLanguage(): Lang {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    return code === 'he' || code === 'iw' ? 'he' : 'en';
  } catch {
    return 'en';
  }
}

export function resolveLanguage(pref: LanguagePref, device: Lang = deviceLanguage()): Lang {
  return pref === 'system' ? device : pref;
}

export function isRtlLanguage(lang: Lang): boolean {
  return lang === 'he';
}

export function localeFor(lang: Lang): string {
  return lang === 'he' ? 'he-IL' : 'en-US';
}

export type TParams = Record<string, string | number>;

export function translate(lang: Lang, key: StringKey, params?: TParams): string {
  const template = DICTS[lang][key] ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (params[name] !== undefined ? String(params[name]) : `{${name}}`));
}

export type TFunction = (key: StringKey, params?: TParams) => string;

/** Non-React access (background tasks, notification builders). */
export function currentLang(): Lang {
  return resolveLanguage(getSettings().language);
}

export function t(key: StringKey, params?: TParams): string {
  return translate(currentLang(), key, params);
}

export function useI18n() {
  const { language } = useSettings();
  return useMemo(() => {
    const lang = resolveLanguage(language);
    const tt: TFunction = (key, params) => translate(lang, key, params);
    return { t: tt, lang, locale: localeFor(lang), isRTL: isRtlLanguage(lang) };
  }, [language]);
}
