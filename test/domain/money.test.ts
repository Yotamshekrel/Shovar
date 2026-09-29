import { detectCurrency, formatMoney, minorToInput, normalizeCurrency, parseAmountToMinor, sumByCurrency } from '@/domain/money';

describe('parseAmountToMinor', () => {
  it.each([
    ['120', 12000],
    ['120.50', 12050],
    ['120,5', 12050],
    ['1,200', 120000],
    ['1,200.75', 120075],
    ['1.200,75', 120075],
    ['₪ 99', 9900],
    ['99 ש"ח', 9900],
    ['1.200.000', 120000000],
    ['', null],
    ['abc', null],
  ])('%s → %s', (input, expected) => {
    expect(parseAmountToMinor(input)).toBe(expected);
  });

  it('accepts numbers', () => {
    expect(parseAmountToMinor(49.9)).toBe(4990);
    expect(parseAmountToMinor(-1)).toBeNull();
  });
});

describe('currency', () => {
  it('detects currency hints', () => {
    expect(detectCurrency('סה"כ 120 ש"ח')).toBe('ILS');
    expect(detectCurrency('₪120')).toBe('ILS');
    expect(detectCurrency('Total $25.00')).toBe('USD');
    expect(detectCurrency('€ 10')).toBe('EUR');
    expect(detectCurrency('nothing')).toBeNull();
  });

  it('normalizes currency codes', () => {
    expect(normalizeCurrency('nis')).toBe('ILS');
    expect(normalizeCurrency('usd')).toBe('USD');
    expect(normalizeCurrency('₪')).toBe('ILS');
    expect(normalizeCurrency(null)).toBe('ILS');
  });
});

describe('formatting', () => {
  it('drops decimals for whole amounts', () => {
    expect(formatMoney(12000, 'ILS', 'en')).toBe('₪120');
    expect(formatMoney(12050, 'USD', 'en')).toBe('$120.50');
    expect(formatMoney(null, 'ILS')).toBe('—');
  });

  it('round-trips input strings', () => {
    expect(minorToInput(12000)).toBe('120');
    expect(minorToInput(12050)).toBe('120.5');
    expect(minorToInput(12055)).toBe('120.55');
    expect(minorToInput(null)).toBe('');
  });

  it('sums per currency', () => {
    expect(
      sumByCurrency([
        { balanceMinor: 100, currency: 'ILS' },
        { balanceMinor: 50, currency: 'USD' },
        { balanceMinor: 200, currency: 'ILS' },
        { balanceMinor: null, currency: 'EUR' },
      ]),
    ).toEqual([
      { currency: 'ILS', totalMinor: 300 },
      { currency: 'USD', totalMinor: 50 },
    ]);
  });
});
