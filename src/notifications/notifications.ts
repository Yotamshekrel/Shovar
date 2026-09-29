import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import type { Item } from '@/domain/types';
import { currentLang, localeFor } from '@/i18n';
import { getSettings } from '@/state/settings';

import { type ScheduledRef, diffSchedule, planExpiryNotifications } from './expiryPlanner';

export const CHANNEL_EXPIRY = 'expiry';
export const CHANNEL_NEARBY = 'nearby';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

let configured = false;

/** Foreground presentation + Android channels. Safe to call more than once. */
export async function configureNotifications(): Promise<void> {
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    const lang = currentLang();
    await Notifications.setNotificationChannelAsync(CHANNEL_EXPIRY, {
      name: lang === 'he' ? 'תזכורות תפוגה' : 'Expiry reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(CHANNEL_NEARBY, {
      name: lang === 'he' ? 'זיכוי בקרבת מקום' : 'Credit nearby',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

export async function notificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (!supported) return 'denied';
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Asks for notification permission (once; returns the resulting state). */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  await configureNotifications();
  const current = await notificationPermission();
  if (current === 'granted') return true;
  if (current === 'denied') return false;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let lastItems: Item[] = [];

/** Debounced reconcile of scheduled expiry reminders with the current wallet. */
export function scheduleExpirySync(items: Item[] = lastItems): void {
  lastItems = items;
  if (!supported) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncExpiryNotifications(lastItems).catch((e) => console.warn('[notifications] sync failed', e));
  }, 400);
}

/**
 * Idempotent: computes the plan, compares it with what the OS has scheduled
 * (by identifier + content signature) and only cancels/schedules the difference.
 */
export async function syncExpiryNotifications(items: Item[], now = new Date()): Promise<{ scheduled: number; cancelled: number }> {
  if (!supported) return { scheduled: 0, cancelled: 0 };
  await configureNotifications();
  const settings = getSettings();
  const lang = currentLang();
  const permitted = (await notificationPermission()) === 'granted';
  const plan = permitted
    ? planExpiryNotifications(
        items,
        { enabled: settings.expiryRemindersEnabled, days: settings.expiryReminderDays, hour: settings.reminderHour },
        { now, lang, locale: localeFor(lang) },
      )
    : [];

  const existing = await Notifications.getAllScheduledNotificationsAsync();
  const refs: ScheduledRef[] = existing.map((n) => ({
    id: n.identifier,
    signature: typeof n.content.data?.signature === 'string' ? (n.content.data.signature as string) : null,
  }));
  const { cancel, schedule } = diffSchedule(refs, plan);

  for (const id of cancel) await Notifications.cancelScheduledNotificationAsync(id);
  for (const p of schedule) {
    await Notifications.scheduleNotificationAsync({
      identifier: p.id,
      content: { title: p.title, body: p.body, data: { ...p.data, signature: p.signature }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.fireAt, channelId: CHANNEL_EXPIRY },
    });
  }
  return { scheduled: schedule.length, cancelled: cancel.length };
}

/** Shows a notification immediately (used by location reminders). */
export async function presentNow(
  content: { title: string; body: string; data: Record<string, unknown> },
  channelId = CHANNEL_NEARBY,
): Promise<void> {
  if (!supported) return;
  await configureNotifications();
  await Notifications.scheduleNotificationAsync({
    content: { ...content, sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId } : null,
  });
}

let handledInitialResponse = false;

/** Opens the related card when a notification is tapped (cold start and while running). */
export function useNotificationRouting(): void {
  useEffect(() => {
    if (!supported) return;
    const go = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string' && url.startsWith('/item/')) setTimeout(() => router.push(url as `/item/${string}`), 50);
    };
    if (!handledInitialResponse) {
      handledInitialResponse = true;
      go(Notifications.getLastNotificationResponse());
    }
    const sub = Notifications.addNotificationResponseReceivedListener(go);
    return () => sub.remove();
  }, []);
}
