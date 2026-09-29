import { addDays, addMonths, daysUntil, isPastExpiry, parseLooseDate, todayIso } from '@/domain/dates';
import { effectiveStatus, expiryTone, filterItems, isExpiringSoon, sortItems } from '@/domain/status';
import type { Item } from '@/domain/types';
import { type ItemFormValues, validateItemForm } from '@/domain/validation';
import { extractUrls, isValidHttpUrl, parseUrl } from '@/utils/url';

const base: ItemFormValues = {
  type: 'store_credit',
  storeName: 'Zara',
  storeCategory: null,
  amount: '120',
  balance: '',
  currency: 'ILS',
  expiryDate: null,
  purchaseDate: null,
  code: '',
  pin: '',
  barcodeFormat: 'code128',
  linkUrl: '',
  notes: '',
  source: 'manual',
};

describe('validateItemForm', () => {
  it('builds a draft with balance defaulting to amount', () => {
    const { draft, errors } = validateItemForm(base);
    expect(errors).toEqual({});
    expect(draft).toMatchObject({ storeName: 'Zara', amountMinor: 12000, balanceMinor: 12000, code: null, linkUrl: null });
  });

  it('requires a store name', () => {
    expect(validateItemForm({ ...base, storeName: '  ' }).errors.storeName).toBe('form.error.store');
  });

  it('rejects unparseable amounts and balance above amount', () => {
    expect(validateItemForm({ ...base, amount: 'abc' }).errors.amount).toBe('form.error.amount');
    expect(validateItemForm({ ...base, balance: '200' }).errors.balance).toBe('form.error.balance');
    expect(validateItemForm({ ...base, balance: '80' }).draft?.balanceMinor).toBe(8000);
  });

  it('allows items without an amount (e.g. "one free massage")', () => {
    const { draft } = validateItemForm({ ...base, amount: '' });
    expect(draft).toMatchObject({ amountMinor: null, balanceMinor: null });
  });

  it('validates and normalizes links', () => {
    expect(validateItemForm({ ...base, linkUrl: 'not a link' }).errors.linkUrl).toBe('form.error.link');
    expect(validateItemForm({ ...base, linkUrl: 'buyme.co.il/card/1' }).draft?.linkUrl).toBe('https://buyme.co.il/card/1');
  });

  it('trims codes and notes', () => {
    const { draft } = validateItemForm({ ...base, code: '  AB-12 ', notes: '  hi ', pin: ' 12 ' });
    expect(draft).toMatchObject({ code: 'AB-12', notes: 'hi', pin: '12' });
  });
});

describe('dates', () => {
  const now = new Date(2026, 8, 28);
  it('parses receipt date formats (day-first)', () => {
    expect(parseLooseDate('28/09/2026')).toBe('2026-09-28');
    expect(parseLooseDate('28.09.26')).toBe('2026-09-28');
    expect(parseLooseDate('2026-09-28')).toBe('2026-09-28');
    expect(parseLooseDate('1/2/2027')).toBe('2027-02-01');
    expect(parseLooseDate('12/31/2026')).toBe('2026-12-31');
    expect(parseLooseDate('31 Dec 2026')).toBe('2026-12-31');
    expect(parseLooseDate('Dec 31, 2026')).toBe('2026-12-31');
    expect(parseLooseDate('31 בדצמבר 2026')).toBe('2026-12-31');
    expect(parseLooseDate('12/2027')).toBe('2027-12-31');
    expect(parseLooseDate('02/2028')).toBe('2028-02-29');
    expect(parseLooseDate('31/02/2026')).toBeNull();
    expect(parseLooseDate('hello')).toBeNull();
  });

  it('does date math on date-only values', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-09-28', 12)).toBe('2027-09-28');
    expect(daysUntil('2026-10-08', now)).toBe(10);
    expect(daysUntil('2026-09-27', now)).toBe(-1);
  });

  it('treats the expiry day itself as still valid', () => {
    expect(isPastExpiry('2026-09-28', now)).toBe(false);
    expect(isPastExpiry('2026-09-27', now)).toBe(true);
    expect(isPastExpiry(null, now)).toBe(false);
    expect(todayIso(now)).toBe('2026-09-28');
  });
});

describe('status, filters and sorting', () => {
  const now = new Date(2026, 8, 28);
  const mk = (p: Partial<Item>): Item =>
    ({
      id: p.storeName ?? 'x',
      type: 'store_credit',
      storeName: 'x',
      balanceMinor: 100,
      currency: 'ILS',
      expiryDate: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00Z',
      deletedAt: null,
      ...p,
    }) as Item;

  it('derives expired status and tones', () => {
    expect(effectiveStatus(mk({ expiryDate: '2026-09-27' }), now)).toBe('expired');
    expect(effectiveStatus(mk({ expiryDate: '2026-09-28' }), now)).toBe('active');
    expect(expiryTone('2026-09-30', now)).toBe('urgent');
    expect(expiryTone('2026-10-20', now)).toBe('soon');
    expect(expiryTone('2027-01-01', now)).toBe('ok');
    expect(expiryTone(null, now)).toBe('none');
    expect(isExpiringSoon(mk({ expiryDate: '2026-10-10' }), now)).toBe(true);
  });

  it('filters by type and expiring soon', () => {
    const items = [mk({ storeName: 'A', type: 'gift_card' }), mk({ storeName: 'B', expiryDate: '2026-10-01' }), mk({ storeName: 'C' })];
    expect(filterItems(items, 'gift_card', now).map((i) => i.storeName)).toEqual(['A']);
    expect(filterItems(items, 'store_credit', now).map((i) => i.storeName)).toEqual(['B', 'C']);
    expect(filterItems(items, 'expiring', now).map((i) => i.storeName)).toEqual(['B']);
  });

  it('sorts by expiry (undated last), store, balance and recency', () => {
    const items = [
      mk({ storeName: 'b', expiryDate: null, balanceMinor: 5, createdAt: '2026-03-01' }),
      mk({ storeName: 'a', expiryDate: '2027-01-01', balanceMinor: 50, createdAt: '2026-01-01' }),
      mk({ storeName: 'c', expiryDate: '2026-10-01', balanceMinor: 10, createdAt: '2026-02-01' }),
    ];
    expect(sortItems(items, 'expiry').map((i) => i.storeName)).toEqual(['c', 'a', 'b']);
    expect(sortItems(items, 'store').map((i) => i.storeName)).toEqual(['a', 'b', 'c']);
    expect(sortItems(items, 'balance').map((i) => i.storeName)).toEqual(['a', 'c', 'b']);
    expect(sortItems(items, 'recent').map((i) => i.storeName)).toEqual(['b', 'c', 'a']);
  });
});

describe('url utils', () => {
  it('parses and normalizes links', () => {
    expect(parseUrl('https://www.BuyMe.co.il/x?a=1#f')).toMatchObject({
      hostname: 'www.buyme.co.il',
      pathname: '/x',
      search: '?a=1',
      hash: '#f',
    });
    expect(parseUrl('zara.com')?.href).toBe('https://zara.com/');
    expect(isValidHttpUrl('ftp://x.com')).toBe(false);
    expect(isValidHttpUrl('hello')).toBe(false);
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('extracts links from shared text', () => {
    const text = 'קיבלת מתנה! 🎁 לצפייה: https://buyme.co.il/gift/ABC123. תהנה! ועוד https://x.co/y,';
    expect(extractUrls(text)).toEqual(['https://buyme.co.il/gift/ABC123', 'https://x.co/y']);
  });
});
