/**
 * Money helpers. Amounts are integers in minor units (e.g. agorot).
 */

export const SUPPORTED_CURRENCIES = ['ILS', 'USD', 'EUR', 'GBP'] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK', 'HUF']);

export function minorDigits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

export function toMinor(amount: number, currency = 'ILS'): number {
  const factor = 10 ** minorDigits(currency);
  return Math.round(amount * factor);
}

export function fromMinor(minor: number, currency = 'ILS'): number {
  return minor / 10 ** minorDigits(currency);
}

const SYMBOLS: Record<string, string> = {
  ILS: '₪',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function currencySymbol(currency: string): string {
  return SYMBOLS[currency.toUpperCase()] ?? currency.toUpperCase();
}

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(locale: string, currency: string, fractionDigits: number) {
  const key = `${locale}|${currency}|${fractionDigits}`;
  let f = formatterCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
    } catch {
      f = new Intl.NumberFormat('en', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });
    }
    formatterCache.set(key, f);
  }
  return f;
}

/**
 * Formats a minor-unit amount for display. Whole amounts drop the decimals
 * (₪120 rather than ₪120.00) which reads better on wallet tiles.
 */
export function formatMoney(minor: number | null | undefined, currency: string, locale = 'en'): string {
  if (minor == null) return '—';
  const digits = minorDigits(currency);
  const major = fromMinor(minor, currency);
  const fraction = Number.isInteger(major) ? 0 : digits;
  try {
    return getFormatter(locale, currency, fraction).format(major);
  } catch {
    return `${currencySymbol(currency)}${major.toFixed(fraction)}`;
  }
}

/** Sums balances per currency (items can mix currencies). */
export function sumByCurrency(
  entries: { balanceMinor: number | null; currency: string }[],
): { currency: string; totalMinor: number }[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.balanceMinor == null) continue;
    totals.set(e.currency, (totals.get(e.currency) ?? 0) + e.balanceMinor);
  }
  return [...totals.entries()]
    .map(([currency, totalMinor]) => ({ currency, totalMinor }))
    .sort((a, b) => b.totalMinor - a.totalMinor);
}

/**
 * Parses a user- or OCR-provided amount string ("1,200.50", "120,5", "₪ 99")
 * into minor units. Returns null when nothing numeric can be read.
 */
export function parseAmountToMinor(input: string | number | null | undefined, currency = 'ILS'): number | null {
  if (input == null) return null;
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? toMinor(input, currency) : null;
  }
  const cleaned = input.replace(/[^\d.,]/g, '');
  if (!cleaned || !/\d/.test(cleaned)) return null;

  let normalized = cleaned;
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: whichever comes last is the decimal separator.
    if (lastComma > lastDot) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = cleaned.replace(/,/g, '');
    }
  } else if (lastComma >= 0) {
    const decimals = cleaned.length - lastComma - 1;
    const commaCount = (cleaned.match(/,/g) ?? []).length;
    // "120,5" / "120,50" → decimal comma; "1,200" → thousands separator.
    normalized = commaCount === 1 && decimals > 0 && decimals <= 2 ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '');
  } else if (lastDot >= 0) {
    const dotCount = (cleaned.match(/\./g) ?? []).length;
    const decimals = cleaned.length - lastDot - 1;
    // "1.200.000" → thousands; "1.200" (3 decimals) is ambiguous, treat as thousands.
    if (dotCount > 1 || decimals === 3) normalized = cleaned.replace(/\./g, '');
  }
  const value = Number.parseFloat(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return toMinor(value, currency);
}

/** Formats minor units as a plain editable string ("120" or "120.5"). */
export function minorToInput(minor: number | null | undefined, currency = 'ILS'): string {
  if (minor == null) return '';
  const major = fromMinor(minor, currency);
  return Number.isInteger(major) ? String(major) : major.toFixed(minorDigits(currency)).replace(/0$/, '');
}

const CURRENCY_HINTS: [RegExp, string][] = [
  [/₪|ש["״']?\s?ח|שקל|\bnis\b|\bils\b/i, 'ILS'],
  [/€|\beur\b|euro|יורו/i, 'EUR'],
  [/£|\bgbp\b|pound|ליש"ט/i, 'GBP'],
  [/\$|\busd\b|dollar|דולר/i, 'USD'],
];

/** Detects a currency from free text (symbols, codes, Hebrew names). */
export function detectCurrency(text: string | null | undefined): string | null {
  if (!text) return null;
  for (const [re, code] of CURRENCY_HINTS) {
    if (re.test(text)) return code;
  }
  return null;
}

export function normalizeCurrency(value: string | null | undefined, fallback = 'ILS'): string {
  if (!value) return fallback;
  const upper = value.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(upper)) return upper === 'NIS' ? 'ILS' : upper;
  return detectCurrency(value) ?? fallback;
}
