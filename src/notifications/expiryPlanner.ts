import { addDays, daysUntil, fromIsoDate } from '@/domain/dates';
import { formatMoney } from '@/domain/money';
import { effectiveStatus } from '@/domain/status';
import type { Item } from '@/domain/types';
import { type Lang, translate } from '@/i18n';

export interface ExpiryReminderSettings {
  enabled: boolean;
  /** Days before expiry, e.g. [14, 3]. 0 = on the expiry day. */
  days: number[];
  /** Local hour of day to deliver reminders. */
  hour: number;
}

export interface PlannedNotification {
  /** Stable identifier: `expiry:<itemId>:<daysBefore>`. */
  id: string;
  itemId: string;
  daysBefore: number;
  fireAt: Date;
  title: string;
  body: string;
  data: { url: string; itemId: string; kind: 'expiry' };
  /** Changes whenever content or timing changes (used to reschedule only what changed). */
  signature: string;
}

export const EXPIRY_PREFIX = 'expiry:';
/** iOS keeps at most 64 pending local notifications per app; leave room for others. */
export const MAX_SCHEDULED_EXPIRY = 50;

function whenText(lang: Lang, daysBefore: number): string {
  if (daysBefore === 0) return translate(lang, 'notif.whenToday');
  if (daysBefore === 1) return translate(lang, 'notif.whenTomorrow');
  return translate(lang, 'notif.whenInDays', { days: daysBefore });
}

/** Item type as a mid-sentence noun ("gift card", not "Gift card"). */
export function typeInSentence(lang: Lang, type: Item['type']): string {
  const label = translate(lang, `type.${type}`);
  return lang === 'en' ? label.charAt(0).toLowerCase() + label.slice(1) : label;
}

export function expiryNotificationContent(item: Item, daysBefore: number, lang: Lang, locale: string): { title: string; body: string } {
  const when = whenText(lang, daysBefore);
  const title = translate(lang, 'notif.expiryTitle', { store: item.storeName });
  const body =
    item.balanceMinor != null && item.balanceMinor > 0
      ? translate(lang, 'notif.expiryBody', { amount: formatMoney(item.balanceMinor, item.currency, locale), when })
      : translate(lang, 'notif.expiryBodyNoAmount', { type: typeInSentence(lang, item.type), when });
  return { title, body };
}

/**
 * Pure planner: which expiry reminders should be scheduled right now.
 * Past trigger times are skipped, the soonest reminders win when the platform
 * limit is reached, and re-running with the same inputs yields the same plan.
 */
export function planExpiryNotifications(
  items: Item[],
  settings: ExpiryReminderSettings,
  opts: { now?: Date; lang: Lang; locale: string; max?: number },
): PlannedNotification[] {
  if (!settings.enabled) return [];
  const now = opts.now ?? new Date();
  const days = [...new Set(settings.days)].filter((d) => Number.isInteger(d) && d >= 0).sort((a, b) => b - a);
  const planned: PlannedNotification[] = [];

  for (const item of items) {
    if (item.deletedAt || !item.expiryDate) continue;
    if (effectiveStatus(item, now) !== 'active') continue;
    if (item.balanceMinor === 0) continue;
    if (daysUntil(item.expiryDate, now) < 0) continue;

    for (const d of days) {
      const day = fromIsoDate(addDays(item.expiryDate, -d));
      if (!day) continue;
      const fireAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), settings.hour, 0, 0, 0);
      if (fireAt.getTime() <= now.getTime()) continue;
      const { title, body } = expiryNotificationContent(item, d, opts.lang, opts.locale);
      planned.push({
        id: `${EXPIRY_PREFIX}${item.id}:${d}`,
        itemId: item.id,
        daysBefore: d,
        fireAt,
        title,
        body,
        data: { url: `/item/${item.id}`, itemId: item.id, kind: 'expiry' },
        signature: `${fireAt.toISOString()}|${title}|${body}`,
      });
    }
  }

  planned.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.id.localeCompare(b.id));
  return planned.slice(0, opts.max ?? MAX_SCHEDULED_EXPIRY);
}

export interface ScheduledRef {
  id: string;
  signature: string | null;
}

/** Diff between what is scheduled with the OS and the plan. */
export function diffSchedule(
  scheduled: ScheduledRef[],
  plan: PlannedNotification[],
): { cancel: string[]; schedule: PlannedNotification[] } {
  const planned = new Map(plan.map((p) => [p.id, p]));
  const existing = new Map(scheduled.filter((s) => s.id.startsWith(EXPIRY_PREFIX)).map((s) => [s.id, s]));
  const cancel: string[] = [];
  const schedule: PlannedNotification[] = [];
  for (const [id, s] of existing) {
    const p = planned.get(id);
    if (!p || p.signature !== s.signature) cancel.push(id);
  }
  for (const [id, p] of planned) {
    const s = existing.get(id);
    if (!s || s.signature !== p.signature) schedule.push(p);
  }
  return { cancel, schedule };
}
