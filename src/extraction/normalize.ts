import { daysUntil, isValidIsoDate, parseLooseDate } from '@/domain/dates';
import { normalizeCurrency, parseAmountToMinor } from '@/domain/money';
import { emptyDraft, type ItemDraft, type ItemSource, type ItemType } from '@/domain/types';
import { findBrand } from '@/search/brands';
import { hasHebrew } from '@/search/normalize';
import type { DraftField } from '@/state/drafts';
import { parseUrl } from '@/utils/url';

import type { ConfidenceField, RawExtraction } from './schema';

export const LOW_CONFIDENCE = 0.7;

export interface ExtractionResult {
  draft: ItemDraft;
  lowConfidence: DraftField[];
  isCreditDocument: boolean;
  /** Number of meaningful fields found (store, amount, expiry, code, link). */
  fieldsFound: number;
}

export interface NormalizeOptions {
  defaultCurrency?: string;
  source?: ItemSource;
  now?: Date;
}

const LEGAL_SUFFIXES = /\s*(?:בע["״']?מ|בעמ|ltd\.?|limited|inc\.?|llc|l\.t\.d|\(\d{4}\))\s*$/i;

function str(v: unknown, max = 200): string | null {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  if (!s || /^(null|none|n\/a|unknown|-)$/i.test(s)) return null;
  return s.slice(0, max);
}

function confidenceOf(raw: RawExtraction, field: ConfidenceField): number {
  const c = raw.confidence && typeof raw.confidence === 'object' ? (raw.confidence as Record<string, unknown>)[field] : undefined;
  const n = typeof c === 'number' ? c : typeof c === 'string' ? Number.parseFloat(c) : Number.NaN;
  if (!Number.isFinite(n)) return 0.5;
  // Some models answer in percent.
  const v = n > 1 && n <= 100 ? n / 100 : n;
  return Math.min(1, Math.max(0, v));
}

/** Uses the canonical brand spelling in the document's script ("ZARA" → "Zara", "זארה" stays Hebrew). */
export function canonicalStoreName(name: string): string {
  const cleaned =
    name
      .replace(LEGAL_SUFFIXES, '')
      .replace(/^["'״]+|["'״]+$/g, '')
      .trim() || name.trim();
  const brand = findBrand(cleaned);
  if (brand) return hasHebrew(cleaned) && brand.nameHe ? cleaned : brand.name;
  // Title-case shouting Latin names ("GOLDA ICE CREAM" → "Golda Ice Cream"), keep short acronyms.
  if (/^[A-Z0-9 &'.-]+$/.test(cleaned) && cleaned.replace(/[^A-Z]/g, '').length > 4) {
    return cleaned.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
  }
  return cleaned;
}

function toIso(v: unknown): string | null {
  const s = str(v, 40);
  if (!s) return null;
  if (isValidIsoDate(s)) return s;
  return parseLooseDate(s);
}

/**
 * Validates and normalizes raw model (or heuristic) output into a form draft,
 * and decides which fields the user should double-check.
 */
export function normalizeExtraction(raw: RawExtraction | null | undefined, opts: NormalizeOptions = {}): ExtractionResult {
  const now = opts.now ?? new Date();
  const low = new Set<DraftField>();
  const r: RawExtraction = raw && typeof raw === 'object' ? raw : {};

  const flag = (field: DraftField, conf: ConfidenceField) => {
    if (confidenceOf(r, conf) < LOW_CONFIDENCE) low.add(field);
  };

  // Type
  let type: ItemType = 'store_credit';
  if (r.item_type === 'gift_card' || r.item_type === 'store_credit') {
    type = r.item_type;
    flag('type', 'item_type');
  } else {
    low.add('type');
  }

  // Store
  const rawStore = str(r.store_name, 80);
  const storeName = rawStore ? canonicalStoreName(rawStore) : '';
  if (!storeName) low.add('storeName');
  else flag('storeName', 'store_name');

  // Currency and amount
  const currencyRaw = str(r.currency, 12);
  const currency = normalizeCurrency(currencyRaw, opts.defaultCurrency ?? 'ILS');
  let amountMinor =
    typeof r.amount === 'number' || typeof r.amount === 'string' ? parseAmountToMinor(r.amount as number | string, currency) : null;
  if (amountMinor !== null && amountMinor <= 0) amountMinor = null;
  if (amountMinor === null) low.add('amountMinor');
  else {
    flag('amountMinor', 'amount');
    // Implausibly large for a store credit / gift card.
    if (amountMinor > 10_000_000) low.add('amountMinor');
    if (!currencyRaw) low.add('amountMinor');
  }

  // Dates
  const purchaseDate = toIso(r.issue_date);
  if (purchaseDate && daysUntil(purchaseDate, now) > 2) {
    // Issue dates in the future are almost always misreads (e.g. month/day swap).
    low.add('purchaseDate');
  }
  if (purchaseDate) flag('purchaseDate', 'issue_date');

  const expiryDate = toIso(r.expiry_date);
  if (expiryDate) {
    flag('expiryDate', 'expiry_date');
    if (purchaseDate && expiryDate < purchaseDate) low.add('expiryDate');
    if (daysUntil(expiryDate, now) > 365 * 10) low.add('expiryDate');
  }

  // Secrets and links
  const code = str(r.code, 64);
  if (code) flag('code', 'code');
  const pin = str(r.pin, 16);
  const linkRaw = str(r.link, 500);
  const link = linkRaw ? (parseUrl(linkRaw)?.href ?? null) : null;
  const notes = str(r.notes, 200);

  const fieldsFound = [storeName, amountMinor, expiryDate, code, link].filter((v) => v !== null && v !== '').length;

  const draft = emptyDraft({
    type,
    storeName,
    storeCategory: findBrand(storeName)?.category ?? null,
    amountMinor,
    balanceMinor: amountMinor,
    currency,
    expiryDate,
    purchaseDate,
    code,
    pin,
    linkUrl: link,
    notes,
    barcodeFormat: code && /^[\x20-\x7e]+$/.test(code) ? 'code128' : 'qr',
    source: opts.source ?? 'receipt',
  });

  return {
    draft,
    lowConfidence: [...low],
    isCreditDocument: r.is_credit_document !== false,
    fieldsFound,
  };
}

/** Pulls the first JSON object out of free text (tolerates code fences / prose around it). */
export function extractJsonObject(text: string): RawExtraction | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? (parsed as RawExtraction) : null;
  } catch {
    // fall through
  }
  const start = trimmed.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1)) as RawExtraction;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
