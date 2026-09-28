/**
 * Date helpers for date-only values stored as `YYYY-MM-DD` in local time.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

/** Parses `YYYY-MM-DD` to a local Date at midnight; null if invalid. */
export function fromIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = ISO_DATE.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

export function isValidIsoDate(value: string | null | undefined): value is string {
  return fromIsoDate(value) !== null;
}

export function addDays(iso: string, days: number): string {
  const d = fromIsoDate(iso);
  if (!d) throw new Error(`Invalid date: ${iso}`);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function addMonths(iso: string, months: number): string {
  const d = fromIsoDate(iso);
  if (!d) throw new Error(`Invalid date: ${iso}`);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return toIsoDate(d);
}

/** Whole days from `from` (default today) until `iso`. Negative when in the past. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const target = fromIsoDate(iso);
  if (!target) return Number.NaN;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

/** An item is expired the day after its expiry date. */
export function isPastExpiry(expiryIso: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiryIso) return false;
  const d = daysUntil(expiryIso, now);
  return Number.isFinite(d) && d < 0;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  ינואר: 1,
  feb: 2,
  february: 2,
  פברואר: 2,
  mar: 3,
  march: 3,
  מרץ: 3,
  מרס: 3,
  apr: 4,
  april: 4,
  אפריל: 4,
  may: 5,
  מאי: 5,
  jun: 6,
  june: 6,
  יוני: 6,
  jul: 7,
  july: 7,
  יולי: 7,
  aug: 8,
  august: 8,
  אוגוסט: 8,
  sep: 9,
  sept: 9,
  september: 9,
  ספטמבר: 9,
  oct: 10,
  october: 10,
  אוקטובר: 10,
  nov: 11,
  november: 11,
  נובמבר: 11,
  dec: 12,
  december: 12,
  דצמבר: 12,
};

function build(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${pad2(m)}-${pad2(d)}`;
  return isValidIsoDate(iso) ? iso : null;
}

/**
 * Parses loosely formatted dates as they appear on Israeli / international
 * receipts. Day-first is assumed for numeric formats (DD/MM/YYYY), which is the
 * convention in Israel and most of the world; `preferMonthFirst` flips it for
 * US receipts.
 */
export function parseLooseDate(input: string | null | undefined, preferMonthFirst = false): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return build(Number(m[1]), Number(m[2]), Number(m[3]));

  m = /(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    if (preferMonthFirst && a <= 12) return build(y, a, b) ?? build(y, b, a);
    if (b > 12 && a <= 12) return build(y, a, b);
    return build(y, b, a);
  }

  // "31 Dec 2026", "31 בדצמבר 2026"
  m = /(\d{1,2})\s+(?:ב)?([a-z\u0590-\u05ff]+)\.?,?\s+(\d{2,4})/.exec(s);
  if (m && MONTHS[m[2]]) return build(Number(m[3]), MONTHS[m[2]], Number(m[1]));

  // "Dec 31, 2026"
  m = /([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{2,4})/.exec(s);
  if (m && MONTHS[m[1]]) return build(Number(m[3]), MONTHS[m[1]], Number(m[2]));

  // "12/2027" (month/year, common on gift cards) → last day of that month
  m = /^(\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (month >= 1 && month <= 12) {
      const last = new Date(year, month, 0).getDate();
      return build(year, month, last);
    }
  }
  return null;
}

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

export function formatDate(iso: string | null | undefined, locale = 'en', style: 'short' | 'medium' = 'medium'): string {
  const d = fromIsoDate(iso);
  if (!d) return '';
  const key = `${locale}|${style}`;
  let f = dateFormatterCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(
      locale,
      style === 'short' ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' },
    );
    dateFormatterCache.set(key, f);
  }
  return f.format(d);
}

export function nowIso(): string {
  return new Date().toISOString();
}
