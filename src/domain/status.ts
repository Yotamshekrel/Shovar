import { daysUntil, isPastExpiry } from './dates';
import type { Item, ItemStatus } from './types';

export const EXPIRING_SOON_DAYS = 30;

/** Status the UI should show: an "active" item past its expiry date is expired. */
export function effectiveStatus(item: Pick<Item, 'status' | 'expiryDate'>, now = new Date()): ItemStatus {
  if (item.status === 'active' && isPastExpiry(item.expiryDate, now)) return 'expired';
  return item.status;
}

export function isActive(item: Pick<Item, 'status' | 'expiryDate' | 'deletedAt'>, now = new Date()): boolean {
  return !item.deletedAt && effectiveStatus(item, now) === 'active';
}

export function isExpiringSoon(item: Pick<Item, 'status' | 'expiryDate'>, now = new Date(), withinDays = EXPIRING_SOON_DAYS): boolean {
  if (!item.expiryDate || effectiveStatus(item, now) !== 'active') return false;
  const d = daysUntil(item.expiryDate, now);
  return d >= 0 && d <= withinDays;
}

export type ExpiryTone = 'none' | 'ok' | 'soon' | 'urgent' | 'expired';

export function expiryTone(expiryDate: string | null, now = new Date()): ExpiryTone {
  if (!expiryDate) return 'none';
  const d = daysUntil(expiryDate, now);
  if (d < 0) return 'expired';
  if (d <= 7) return 'urgent';
  if (d <= EXPIRING_SOON_DAYS) return 'soon';
  return 'ok';
}

export type SortKey = 'expiry' | 'store' | 'balance' | 'recent';
export type FilterKey = 'all' | 'gift_card' | 'store_credit' | 'expiring';

export function filterItems<T extends Item>(items: T[], filter: FilterKey, now = new Date()): T[] {
  switch (filter) {
    case 'gift_card':
    case 'store_credit':
      return items.filter((i) => i.type === filter);
    case 'expiring':
      return items.filter((i) => isExpiringSoon(i, now));
    default:
      return items;
  }
}

export function sortItems<T extends Item>(items: T[], sort: SortKey, locale = 'en'): T[] {
  const copy = [...items];
  const collator = new Intl.Collator(locale, { sensitivity: 'base' });
  switch (sort) {
    case 'store':
      return copy.sort((a, b) => collator.compare(a.storeName, b.storeName));
    case 'balance':
      return copy.sort((a, b) => (b.balanceMinor ?? -1) - (a.balanceMinor ?? -1));
    case 'recent':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'expiry':
    default:
      // Soonest expiry first, then items without expiry by store name.
      return copy.sort((a, b) => {
        if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
        if (a.expiryDate) return -1;
        if (b.expiryDate) return 1;
        return collator.compare(a.storeName, b.storeName);
      });
  }
}
