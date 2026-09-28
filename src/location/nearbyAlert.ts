import { formatMoney, sumByCurrency } from '@/domain/money';
import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';
import { type Lang, translate } from '@/i18n';
import { typeInSentence } from '@/notifications/expiryPlanner';
import { storeKey as storeKeyOf } from '@/search/brands';

import { roundDistance } from './geo';

/** Items that should trigger a nearby reminder for this store. */
export function eligibleItemsForStore(items: Item[], storeKey: string, now = new Date()): Item[] {
  return items
    .filter(
      (i) =>
        !i.deletedAt &&
        !i.locationMuted &&
        effectiveStatus(i, now) === 'active' &&
        i.balanceMinor !== 0 &&
        storeKeyOf(i.storeName) === storeKey,
    )
    .sort((a, b) => (b.balanceMinor ?? 0) - (a.balanceMinor ?? 0));
}

export function formatDistance(lang: Lang, meters: number): string {
  const d = roundDistance(meters);
  return d.unit === 'm' ? translate(lang, 'notif.meters', { meters: d.value }) : translate(lang, 'notif.km', { km: d.value });
}

/**
 * "You have ₪120 credit at Zara, 150m away." — sums every card for the store
 * (per currency) so one notification covers them all.
 */
export function nearbyNotificationContent(
  items: Item[],
  distanceM: number,
  lang: Lang,
  locale: string,
): { title: string; body: string; data: { url: string; itemId: string; kind: 'nearby' } } | null {
  if (items.length === 0) return null;
  const top = items[0];
  const distance = formatDistance(lang, distanceM);
  const totals = sumByCurrency(items);
  const body =
    totals.length > 0 && totals.some((t) => t.totalMinor > 0)
      ? translate(lang, 'notif.nearbyBody', {
          amount: totals.map((t) => formatMoney(t.totalMinor, t.currency, locale)).join(' + '),
          store: top.storeName,
          distance,
        })
      : translate(lang, 'notif.nearbyBodyNoAmount', { type: typeInSentence(lang, top.type), store: top.storeName, distance });
  return { title: translate(lang, 'notif.nearbyTitle'), body, data: { url: `/item/${top.id}`, itemId: top.id, kind: 'nearby' } };
}
