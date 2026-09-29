import type { Item } from '@/domain/types';
import { EXPIRY_PREFIX, diffSchedule, planExpiryNotifications } from '@/notifications/expiryPlanner';

const NOW = new Date(2026, 8, 28, 12, 0); // Sep 28 2026, 12:00 local

function item(id: string, p: Partial<Item> = {}): Item {
  return {
    id,
    type: 'store_credit',
    storeName: 'Zara',
    storeCategory: null,
    storeLogoUri: null,
    initialAmountMinor: 12000,
    balanceMinor: 12000,
    currency: 'ILS',
    expiryDate: '2026-10-30',
    purchaseDate: null,
    code: null,
    pin: null,
    barcodeFormat: 'code128',
    linkUrl: null,
    notes: null,
    status: 'active',
    source: 'manual',
    locationMuted: false,
    pinnedLat: null,
    pinnedLng: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...p,
  };
}

const settings = { enabled: true, days: [14, 3], hour: 10 };
const opts = { now: NOW, lang: 'en' as const, locale: 'en-US' };

describe('planExpiryNotifications', () => {
  it('schedules the default 14 and 3 day reminders at the chosen hour', () => {
    const plan = planExpiryNotifications([item('a')], settings, opts);
    expect(plan.map((p) => p.id)).toEqual([`${EXPIRY_PREFIX}a:14`, `${EXPIRY_PREFIX}a:3`]);
    expect(plan[0].fireAt).toEqual(new Date(2026, 9, 16, 10, 0));
    expect(plan[1].fireAt).toEqual(new Date(2026, 9, 27, 10, 0));
    expect(plan[0].title).toBe('Zara credit expires soon');
    expect(plan[0].body).toBe('₪120 expires in 14 days. Use it before it’s gone.');
    expect(plan[1].data).toEqual({ url: '/item/a', itemId: 'a', kind: 'expiry' });
  });

  it('skips reminders whose time has passed, including later today', () => {
    // Expires in 3 days: the 14-day reminder is in the past; the 3-day one is today 10:00 < now 12:00.
    const plan = planExpiryNotifications([item('b', { expiryDate: '2026-10-01' })], settings, opts);
    expect(plan).toEqual([]);
    const morning = planExpiryNotifications([item('b', { expiryDate: '2026-10-01' })], settings, {
      ...opts,
      now: new Date(2026, 8, 28, 8, 0),
    });
    expect(morning.map((p) => p.daysBefore)).toEqual([3]);
  });

  it('supports day-of and tomorrow wording, in Hebrew too', () => {
    const plan = planExpiryNotifications([item('c', { expiryDate: '2026-10-02' })], { enabled: true, days: [1, 0], hour: 9 }, opts);
    expect(plan.map((p) => p.body)).toEqual([
      '₪120 expires tomorrow. Use it before it’s gone.',
      '₪120 expires today. Use it before it’s gone.',
    ]);
    const he = planExpiryNotifications(
      [item('c', { expiryDate: '2026-10-02', storeName: 'זארה' })],
      { enabled: true, days: [0], hour: 9 },
      { ...opts, lang: 'he', locale: 'he-IL' },
    );
    expect(he[0].title).toBe('הזיכוי ב־זארה פג בקרוב');
    expect(he[0].body).toContain('היום');
  });

  it('ignores used, expired, deleted, zero-balance and undated items', () => {
    const plan = planExpiryNotifications(
      [
        item('used', { status: 'used' }),
        item('gone', { expiryDate: '2026-09-01' }),
        item('del', { deletedAt: '2026-09-01T00:00:00Z' }),
        item('zero', { balanceMinor: 0 }),
        item('nodate', { expiryDate: null }),
      ],
      settings,
      opts,
    );
    expect(plan).toEqual([]);
  });

  it('words items without an amount by type', () => {
    const plan = planExpiryNotifications(
      [item('g', { type: 'gift_card', balanceMinor: null })],
      { enabled: true, days: [3], hour: 10 },
      opts,
    );
    expect(plan[0].body).toBe('Your gift card expires in 3 days.');
  });

  it('keeps only the soonest reminders under the platform cap', () => {
    const items = Array.from({ length: 40 }, (_, i) => item(`i${i}`, { expiryDate: `2027-0${1 + (i % 9)}-1${i % 10}` }));
    const plan = planExpiryNotifications(items, settings, { ...opts, max: 10 });
    expect(plan).toHaveLength(10);
    const times = plan.map((p) => p.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
  });

  it('returns nothing when disabled', () => {
    expect(planExpiryNotifications([item('a')], { ...settings, enabled: false }, opts)).toEqual([]);
  });
});

describe('diffSchedule', () => {
  it('only touches what changed and leaves unrelated notifications alone', () => {
    const plan = planExpiryNotifications([item('a'), item('b', { expiryDate: '2026-12-01' })], settings, opts);
    const [a14, a3, b14, b3] = [
      plan.find((p) => p.id.endsWith('a:14'))!,
      plan.find((p) => p.id.endsWith('a:3'))!,
      plan.find((p) => p.id.endsWith('b:14'))!,
      plan.find((p) => p.id.endsWith('b:3'))!,
    ];
    const scheduled = [
      { id: a14.id, signature: a14.signature }, // unchanged
      { id: a3.id, signature: 'stale' }, // content changed
      { id: `${EXPIRY_PREFIX}deleted:3`, signature: 'x' }, // no longer planned
      { id: 'nearby-123', signature: null }, // not ours
    ];
    const { cancel, schedule } = diffSchedule(scheduled, plan);
    expect(cancel.sort()).toEqual([a3.id, `${EXPIRY_PREFIX}deleted:3`].sort());
    expect(schedule.map((p) => p.id).sort()).toEqual([a3.id, b14.id, b3.id].sort());
  });

  it('is a no-op when everything is in sync', () => {
    const plan = planExpiryNotifications([item('a')], settings, opts);
    const { cancel, schedule } = diffSchedule(
      plan.map((p) => ({ id: p.id, signature: p.signature })),
      plan,
    );
    expect(cancel).toEqual([]);
    expect(schedule).toEqual([]);
  });
});
