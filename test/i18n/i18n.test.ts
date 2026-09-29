import { en } from '@/i18n/en';
import { he } from '@/i18n/he';
import { isRtlLanguage, localeFor, resolveLanguage, translate } from '@/i18n';
import { DEFAULT_SETTINGS, sanitizeSettings } from '@/state/settings';

function placeholders(s: string): string[] {
  return (s.match(/\{(\w+)\}/g) ?? []).sort();
}

describe('i18n', () => {
  it('Hebrew covers every English key', () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });

  it('uses the same placeholders in both languages', () => {
    const mismatched = (Object.keys(en) as (keyof typeof en)[]).filter((k) => placeholders(en[k]).join() !== placeholders(he[k]).join());
    expect(mismatched).toEqual([]);
  });

  it('has no empty strings', () => {
    expect(Object.entries(he).filter(([, v]) => !v.trim())).toEqual([]);
    expect(Object.entries(en).filter(([, v]) => !v.trim())).toEqual([]);
  });

  it('interpolates parameters and keeps unknown ones visible', () => {
    expect(translate('en', 'expiry.inDays', { days: 3 })).toBe('Expires in 3 days');
    expect(translate('he', 'expiry.inDays', { days: 3 })).toBe('פג בעוד 3 ימים');
    expect(translate('en', 'expiry.inDays')).toBe('Expires in {days} days');
  });

  it('resolves language preference and direction', () => {
    expect(resolveLanguage('system', 'he')).toBe('he');
    expect(resolveLanguage('en', 'he')).toBe('en');
    expect(isRtlLanguage('he')).toBe(true);
    expect(isRtlLanguage('en')).toBe(false);
    expect(localeFor('he')).toBe('he-IL');
  });
});

describe('settings sanitization', () => {
  it('fills defaults for missing values', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings({ language: 'he' }).language).toBe('he');
  });

  it('clamps and cleans invalid values', () => {
    const s = sanitizeSettings({
      expiryReminderDays: [3, 14, 3, -1, 999, 1.5],
      reminderHour: 30,
      locationRadiusM: 5,
      locationCooldownHours: 1000,
    });
    expect(s.expiryReminderDays).toEqual([14, 3]);
    expect(s.reminderHour).toBe(10);
    expect(s.locationRadiusM).toBe(100);
    expect(s.locationCooldownHours).toBe(168);
  });

  it('keeps location reminders opt-in and biometric lock off by default', () => {
    expect(DEFAULT_SETTINGS.locationEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.biometricLock).toBe(false);
    expect(DEFAULT_SETTINGS.expiryReminderDays).toEqual([14, 3]);
  });
});
