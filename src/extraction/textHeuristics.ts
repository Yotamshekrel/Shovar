import { addDays, addMonths, parseLooseDate, todayIso } from '@/domain/dates';
import { detectCurrency, parseAmountToMinor } from '@/domain/money';
import { BRANDS, brandForHost, brandNames, type Brand } from '@/search/brands';
import { normalizeText } from '@/search/normalize';
import { extractUrls, parseUrl } from '@/utils/url';

import type { ConfidenceField, RawExtraction } from './schema';

/**
 * Rule-based extraction from plain text: on-device OCR output, a shared
 * WhatsApp/email message, or a web page's text. Used when AI extraction is
 * off or unavailable, and to enrich link imports. Returns the same shape as the
 * model so both paths share `normalizeExtraction`.
 */

const GIFT_RE = /gift\s*card|gift\s*voucher|כרטיס\s*מתנה|כרטיס\s*המתנה|גיפט\s*קארד|שובר\s*מתנה|תו\s*קני[יה]|תו\s*שי|voucher|שובר/i;
const CREDIT_RE = /תעודת\s*זיכוי|זיכוי|credit\s*note|store\s*credit|return\s*credit|refund\s*voucher|החזר/i;
const EXPIRY_RE = /תוקף|בתוקף|ניתן\s*למימוש|למימוש\s*עד|valid|expir|\bexp\b|use\s*by|until|עד\s*לתאריך|עד\s*תאריך/i;
const ISSUE_RE = /תאריך|date|הונפק|issued|הנפקה/i;
const CODE_RE =
  /קוד|מס(?:פר)?['׳"]?\s*(?:ה?שובר|ה?כרטיס|ה?זיכוי)|code|voucher\s*(?:no|number|#)|card\s*(?:no|number|#)|barcode|ברקוד|coupon|מספר\s*כרטיס/i;
const PIN_RE = /\bpin\b|קוד\s*סודי|cvv|סיסמה/i;
const BALANCE_RE = /יתרה|balance|remaining|נותר/i;
const VALUE_RE = /זיכוי|סכום\s*(?:ה?שובר|ה?זיכוי|ה?כרטיס)?|שווי|ערך|credit|value|amount|על\s*סך|בסך/i;
const TOTAL_RE = /סה["״']?כ|total|לתשלום/i;
const NOISE_LINE_RE =
  /קבלה|חשבונית|receipt|invoice|tax|עוסק|ח\.?פ|ע\.?מ|טלפון|tel|phone|www\.|http|תאריך|date|שעה|time|קופה|cashier|סניף\s*\d/i;

const DATE_TOKEN_RE =
  /\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\s+(?:ב)?[a-z\u05d0-\u05ea]+\.?,?\s+\d{2,4}\b|\b\d{1,2}[/.]\d{4}\b/gi;
const AMOUNT_RE =
  /(?:₪|\$|€|£|nis|ils|ש["״']?ח)?\s*(\d{1,3}(?:,\d{3})+(?:[.,]\d{1,2})?|\d{1,6}(?:[.,]\d{1,2})?)\s*(₪|ש["״']?ח|nis|ils|\$|€|£)?/gi;

interface Found<T> {
  value: T;
  confidence: number;
}

function linesOf(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function datesIn(line: string): string[] {
  const out: string[] = [];
  for (const m of line.match(DATE_TOKEN_RE) ?? []) {
    const iso = parseLooseDate(m);
    if (iso) out.push(iso);
  }
  return out;
}

function amountsIn(line: string): { minor: number; hasCurrency: boolean }[] {
  // Remove dates, times and long digit runs (codes, phone numbers) before scanning for money.
  const cleaned = line
    .replace(DATE_TOKEN_RE, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ')
    .replace(/\d{7,}/g, ' ')
    .replace(/\d+(?:-\d+){1,}/g, ' ');
  const out: { minor: number; hasCurrency: boolean }[] = [];
  for (const m of cleaned.matchAll(AMOUNT_RE)) {
    const hasCurrency = /₪|\$|€|£|nis|ils|ש["״']?ח/i.test(m[0]);
    const minor = parseAmountToMinor(m[1]);
    if (minor !== null && minor > 0) out.push({ minor, hasCurrency });
  }
  return out;
}

let brandMatchers: { brand: Brand; needle: string }[] | null = null;

/** Finds the longest known brand name mentioned anywhere in the text (whole words). */
export function findBrandInText(text: string): Brand | null {
  brandMatchers ??= BRANDS.flatMap((brand) =>
    brandNames(brand)
      .map((n) => normalizeText(n))
      .filter((n) => n.length >= 3)
      .map((needle) => ({ brand, needle })),
  ).sort((a, b) => b.needle.length - a.needle.length);
  const hay = ` ${normalizeText(text)} `;
  let platform: Brand | null = null;
  for (const { brand, needle } of brandMatchers) {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Hebrew prefixes: "בזארה", "לשופרסל", "מסופר פארם"
    const hit = hay.includes(` ${needle} `) || (/[\u05d0-\u05ea]/.test(needle) && new RegExp(`[ \\n][בלמוה]${escaped} `).test(hay));
    if (!hit) continue;
    // A specific store beats a multi-store platform ("Castro card via BuyMe" → Castro).
    if (!brand.platform) return brand;
    platform ??= brand;
  }
  return platform;
}

function findStore(lines: string[], text: string, link: string | null): Found<string> | null {
  const host = link ? parseUrl(link)?.hostname : null;
  const hostBrand = host ? brandForHost(host) : null;
  if (hostBrand && !hostBrand.platform) return { value: hostBrand.name, confidence: 0.9 };
  const mentioned = findBrandInText(text);
  if (mentioned) return { value: mentioned.name, confidence: 0.85 };
  if (hostBrand) return { value: hostBrand.name, confidence: 0.8 };
  for (const line of lines.slice(0, 6)) {
    const letters = line.replace(/[^a-z\u05d0-\u05ea]/gi, '');
    if (letters.length < 2 || line.length > 40) continue;
    if (NOISE_LINE_RE.test(line) || GIFT_RE.test(line) || CREDIT_RE.test(line)) continue;
    if (/\d{3,}/.test(line)) continue;
    return { value: line.replace(/[*_=~|]+/g, '').trim(), confidence: 0.5 };
  }
  return null;
}

function findAmount(lines: string[]): Found<number> | null {
  const tiers: [RegExp, number][] = [
    [BALANCE_RE, 0.8],
    [VALUE_RE, 0.75],
    [TOTAL_RE, 0.6],
  ];
  for (const [re, conf] of tiers) {
    for (let i = 0; i < lines.length; i++) {
      if (!re.test(lines[i])) continue;
      // The amount is often on the same line, sometimes on the next one.
      const candidates = [...amountsIn(lines[i]), ...(amountsIn(lines[i]).length === 0 && lines[i + 1] ? amountsIn(lines[i + 1]) : [])];
      if (candidates.length > 0) {
        const withCurrency = candidates.filter((c) => c.hasCurrency);
        const pick = (withCurrency.length ? withCurrency : candidates).reduce((a, b) => (b.minor > a.minor ? b : a));
        return { value: pick.minor / 100, confidence: withCurrency.length ? conf : conf - 0.1 };
      }
    }
  }
  const all = lines.flatMap(amountsIn).filter((a) => a.hasCurrency);
  if (all.length > 0) {
    const max = all.reduce((a, b) => (b.minor > a.minor ? b : a));
    return { value: max.minor / 100, confidence: 0.45 };
  }
  return null;
}

function findDates(lines: string[], now: Date): { issue: Found<string> | null; expiry: Found<string> | null } {
  let issue: Found<string> | null = null;
  let expiry: Found<string> | null = null;
  const unlabeled: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const ds = datesIn(line);
    const next = ds.length === 0 && lines[i + 1] ? datesIn(lines[i + 1]) : [];
    if (EXPIRY_RE.test(line) && (ds.length || next.length)) {
      const d = ds.length ? ds[ds.length - 1] : next[0];
      if (!expiry) expiry = { value: d, confidence: 0.8 };
    } else if (ISSUE_RE.test(line) && ds.length) {
      if (!issue) issue = { value: ds[0], confidence: 0.7 };
    } else {
      unlabeled.push(...ds);
    }
  }

  if (!issue && unlabeled.length > 0) {
    const sorted = [...unlabeled].sort();
    const today = todayIso(now);
    const past = sorted.filter((d) => d <= today);
    if (past.length) issue = { value: past[past.length - 1], confidence: 0.5 };
    if (!expiry) {
      const future = sorted.filter((d) => d > today);
      if (future.length) expiry = { value: future[future.length - 1], confidence: 0.5 };
    }
  }

  if (!expiry) {
    // Validity period instead of a date: "בתוקף לשנה", "תוקף הזיכוי: 30 יום", "valid for 12 months".
    const text = lines.join(' ');
    const m = /(?:בתוקף|תוקף|valid(?:\s*for)?)[^\d\n]{0,20}?(\d{1,3})?\s*(ימים|יום|days?|חודשים|חודש|months?|שנתיים|שנים|שנה|years?)/i.exec(
      text,
    );
    if (m) {
      const unit = m[2].toLowerCase();
      const n = Number(m[1] ?? 1);
      const base = issue?.value ?? todayIso(now);
      let value: string;
      if (/ימים|יום|day/.test(unit)) value = addDays(base, n);
      else if (unit === 'שנתיים') value = addMonths(base, 24);
      else if (/שנה|שנים|year/.test(unit)) value = addMonths(base, n * 12);
      else value = addMonths(base, n);
      expiry = { value, confidence: 0.6 };
    }
  }
  return { issue, expiry };
}

function findCode(lines: string[]): Found<string> | null {
  for (let i = 0; i < lines.length; i++) {
    if (!CODE_RE.test(lines[i]) || PIN_RE.test(lines[i])) continue;
    const afterColon = lines[i].split(/[:：]/).slice(1).join(':').trim();
    const source = afterColon || lines[i];
    const tokens = source.match(/[A-Z0-9][A-Z0-9-]{3,}[A-Z0-9]/gi) ?? [];
    const best = tokens.filter((tk) => /\d/.test(tk)).sort((a, b) => b.length - a.length)[0];
    if (best) return { value: best, confidence: 0.75 };
    const nextTokens = lines[i + 1]?.match(/^[A-Z0-9][A-Z0-9 -]{3,}[A-Z0-9]$/i);
    if (nextTokens && /\d/.test(nextTokens[0])) return { value: nextTokens[0].trim(), confidence: 0.65 };
  }
  // A standalone long number is usually the barcode.
  for (const line of lines) {
    const m = /^(?:\d[\d ]{8,22}\d)$/.exec(line);
    if (m) return { value: m[0], confidence: 0.5 };
  }
  return null;
}

function findPin(lines: string[]): Found<string> | null {
  for (const line of lines) {
    if (!PIN_RE.test(line)) continue;
    const m = /(\d{3,8})/.exec(line.split(/[:：]/).slice(1).join(':') || line);
    if (m) return { value: m[1], confidence: 0.7 };
  }
  return null;
}

export interface TextParseOptions {
  now?: Date;
}

export function parseReceiptText(text: string, opts: TextParseOptions = {}): RawExtraction {
  const now = opts.now ?? new Date();
  const lines = linesOf(text);
  const link = extractUrls(text)[0] ?? null;
  const store = findStore(lines, text, link);
  const amount = findAmount(lines);
  const currency = detectCurrency(text);
  const { issue, expiry } = findDates(lines, now);
  const code = findCode(lines);
  const pin = findPin(lines);
  const isGift = GIFT_RE.test(text);
  const isCredit = CREDIT_RE.test(text);

  const confidence: Record<ConfidenceField, number> = {
    item_type: isGift || isCredit ? 0.8 : 0.4,
    store_name: store?.confidence ?? 0,
    amount: amount?.confidence ?? 0,
    currency: currency ? 0.8 : 0.3,
    issue_date: issue?.confidence ?? 0,
    expiry_date: expiry?.confidence ?? 0,
    code: code?.confidence ?? 0,
  };

  return {
    is_credit_document: isGift || isCredit || !!amount,
    item_type: isCredit && !/gift\s*card|כרטיס\s*מתנה/i.test(text) ? 'store_credit' : isGift ? 'gift_card' : 'store_credit',
    store_name: store?.value ?? null,
    amount: amount?.value ?? null,
    currency,
    issue_date: issue?.value ?? null,
    expiry_date: expiry?.value ?? null,
    code: code?.value ?? null,
    pin: pin?.value ?? null,
    link,
    notes: null,
    confidence,
  };
}
