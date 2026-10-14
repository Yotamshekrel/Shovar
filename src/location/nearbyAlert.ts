import { formatMoney, sumByCurrency } from '@/domain/money';
import type { Item } from '@/domain/types';
import { type Lang, translate } from '@/i18n';
import { typeInSentence } from '@/notifications/expiryPlanner';
import { eligibleAt } from '@/networks/accepted';

import { roundDistance } from './geo';

/** Cards that should trigger a nearby reminder at this store (multi-store cards included), biggest balance first. */
export function eligibleItemsForStore(items: Item[], storeKey: string, now = new Date()): Item[] {
  return eligibleAt(items, storeKey, now).sort((a, b) => (b.balanceMinor ?? 0) - (a.balanceMinor ?? 0));
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
  /** The store the user is near, when it differs from the top card's own store (multi-store cards). */
  storeName?: string,
): { title: string; body: string; data: { url: string; itemId: string; kind: 'nearby' } } | null {
  if (items.length === 0) return null;
  const top = items[0];
  const store = storeName ?? top.storeName;
  const distance = formatDistance(lang, distanceM);
  const totals = sumByCurrency(items);
  const body =
    totals.length > 0 && totals.some((t) => t.totalMinor > 0)
      ? translate(lang, 'notif.nearbyBody', {
          amount: totals.map((t) => formatMoney(t.totalMinor, t.currency, locale)).join(' + '),
          store,
          distance,
        })
      : translate(lang, 'notif.nearbyBodyNoAmount', { type: typeInSentence(lang, top.type), store, distance });
  return { title: translate(lang, 'notif.nearbyTitle'), body, data: { url: `/item/${top.id}`, itemId: top.id, kind: 'nearby' } };
}
