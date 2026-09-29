import { type ExtractionResult, normalizeExtraction } from '@/extraction/normalize';
import type { RawExtraction } from '@/extraction/schema';
import { findBrandInText, parseReceiptText } from '@/extraction/textHeuristics';
import type { ItemSource } from '@/domain/types';
import { brandForHost } from '@/search/brands';
import { extractUrls, getQueryParam, parseUrl } from '@/utils/url';

import { type PageMeta, storeFromTitle } from './pageMeta';

export interface LinkAnalysisInput {
  url: string;
  /** Message the link was shared with (WhatsApp / email text), if any. */
  sharedText?: string | null;
  /** Page metadata when the page could be fetched. */
  page?: PageMeta | null;
  defaultCurrency?: string;
  source?: ItemSource;
  now?: Date;
}

/** Common query parameters gift card sites use for the amount. */
const AMOUNT_PARAMS = ['amount', 'value', 'sum', 'price', 'balance'];

/**
 * Builds a prefilled draft for a gift card link. Priority for the store:
 * a specific store named in the message/page (e.g. a BuyMe card *for Castro*)
 * → the link's own domain (zara.com → Zara) → the page title → the platform
 * (BuyMe, Tav Zahav, …). Amount/expiry/code come from the message and page text.
 */
export function analyzeLink(input: LinkAnalysisInput): ExtractionResult {
  const parsed = parseUrl(input.page?.finalUrl ?? input.url) ?? parseUrl(input.url);
  const url = parseUrl(input.url)?.href ?? input.url;
  const hostBrand = parsed ? brandForHost(parsed.hostname) : null;

  const textParts = [input.sharedText, input.page?.title, input.page?.description, input.page?.text].filter((s): s is string => !!s);
  const combined = textParts.join('\n');
  const fromText: RawExtraction = combined ? parseReceiptText(combined, { now: input.now }) : {};

  const mentioned = combined ? findBrandInText(combined) : null;
  let store: { name: string; confidence: number } | null = null;
  if (mentioned && !mentioned.platform) store = { name: mentioned.name, confidence: 0.85 };
  else if (hostBrand && !hostBrand.platform) store = { name: hostBrand.name, confidence: 0.9 };
  else {
    const titled = input.page ? storeFromTitle(input.page.title, input.page.siteName) : null;
    const platform = hostBrand ?? (mentioned?.platform ? mentioned : null);
    if (platform) store = { name: platform.name, confidence: 0.75 };
    else if (titled) store = { name: titled, confidence: 0.55 };
    else if (parsed) {
      // Last resort: the registrable part of the domain ("golda.co.il" → "Golda").
      const label = parsed.hostname.replace(/^www\./, '').split('.')[0];
      if (label && label.length >= 3) store = { name: label.charAt(0).toUpperCase() + label.slice(1), confidence: 0.4 };
    }
  }

  let amount = fromText.amount ?? null;
  let amountConfidence = (fromText.confidence as Record<string, number> | undefined)?.amount ?? 0;
  if (amount === null && parsed) {
    for (const p of AMOUNT_PARAMS) {
      const v = getQueryParam(parsed, p);
      if (v && /^\d+(?:\.\d{1,2})?$/.test(v)) {
        amount = Number(v);
        amountConfidence = 0.6;
        break;
      }
    }
  }

  const conf = (fromText.confidence ?? {}) as Record<string, number>;
  const raw: RawExtraction = {
    ...fromText,
    is_credit_document: true,
    // Links are almost always gift cards / vouchers unless the text says "credit".
    item_type: fromText.item_type === 'store_credit' && /זיכוי|credit/i.test(combined) ? 'store_credit' : 'gift_card',
    store_name: store?.name ?? null,
    amount,
    link: url,
    confidence: {
      ...conf,
      item_type: 0.8,
      store_name: store?.confidence ?? 0,
      amount: amountConfidence,
      currency: conf.currency ?? 0.5,
    },
  };

  return normalizeExtraction(raw, { defaultCurrency: input.defaultCurrency, source: input.source ?? 'link', now: input.now });
}

/** First http(s) URL in a shared text, if any. */
export function firstUrl(text: string | null | undefined): string | null {
  return extractUrls(text)[0] ?? null;
}
