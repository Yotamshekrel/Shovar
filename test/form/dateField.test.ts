import { daysInMonth, yearOptions } from '@/components/form/DateField';
import { confirm, notify, useDialogStore } from '@/utils/dialogs';

describe('date picker helpers (year → month → day)', () => {
  const now = new Date(2026, 8, 29);

  it('lists this year and the next ten for expiry dates, soonest first', () => {
    const years = yearOptions('future', now);
    expect(years[0]).toBe(2026);
    expect(years).toHaveLength(11);
    expect(years[10]).toBe(2036);
  });

  it('lists recent years, newest first, for issue dates', () => {
    const years = yearOptions('past', now);
    expect(years[0]).toBe(2026);
    expect(years[years.length - 1]).toBe(2020);
  });

  it('keeps an existing value selectable even if it is outside the range', () => {
    expect(yearOptions('future', now, 2050)).toContain(2050);
    expect(yearOptions('past', now, 2001)).toContain(2001);
  });

  it('knows how many days each month has (leap years included)', () => {
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('themed dialogs', () => {
  afterEach(() => useDialogStore.setState({ queue: [] }));

  it('resolves confirm() with the user’s choice and shows dialogs one at a time', async () => {
    const first = confirm({ title: 'Delete Zara?', confirmText: 'Delete', cancelText: 'Cancel', destructive: true });
    const second = confirm({ title: 'Other', confirmText: 'OK', cancelText: 'No' });
    const [a, b] = useDialogStore.getState().queue;
    expect(useDialogStore.getState().queue).toHaveLength(2);
    expect(a).toMatchObject({ title: 'Delete Zara?', destructive: true });

    useDialogStore.getState().settle(a.id, true);
    await expect(first).resolves.toBe(true);
    expect(useDialogStore.getState().queue[0].id).toBe(b.id);
    useDialogStore.getState().settle(b.id, false);
    await expect(second).resolves.toBe(false);
  });

  it('notify() queues a single-button notice', () => {
    notify('Saved');
    const [n] = useDialogStore.getState().queue;
    expect(n.cancelText).toBeUndefined();
    expect(n.title).toBe('Saved');
  });
});
