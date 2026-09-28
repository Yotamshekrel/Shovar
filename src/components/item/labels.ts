import { daysUntil, formatDate } from '@/domain/dates';
import type { TFunction } from '@/i18n';

export function expiryLabel(t: TFunction, expiryDate: string | null, locale: string, now = new Date()): string {
  if (!expiryDate) return t('expiry.none');
  const d = daysUntil(expiryDate, now);
  if (d < 0) return t('expiry.expiredOn', { date: formatDate(expiryDate, locale) });
  if (d === 0) return t('expiry.today');
  if (d === 1) return t('expiry.tomorrow');
  if (d <= 60) return t('expiry.inDays', { days: d });
  return t('expiry.on', { date: formatDate(expiryDate, locale) });
}
