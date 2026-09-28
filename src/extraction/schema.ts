/**
 * Structured output contract for receipt / voucher extraction.
 *
 * Sent to the model as a JSON schema (`output_config.format`) so the response
 * is guaranteed to parse. Every field is nullable: the model is told to return
 * null rather than guess, and to report its confidence per field so the review
 * screen can highlight what needs a second look.
 */

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };

export const CONFIDENCE_FIELDS = ['item_type', 'store_name', 'amount', 'currency', 'issue_date', 'expiry_date', 'code'] as const;
export type ConfidenceField = (typeof CONFIDENCE_FIELDS)[number];

export const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    is_credit_document: {
      type: 'boolean',
      description: 'True if the document is a store credit / return credit note, gift card, voucher or coupon with monetary value.',
    },
    item_type: { type: 'string', enum: ['store_credit', 'gift_card', 'unknown'] },
    store_name: {
      ...nullableString,
      description: 'Brand / store name as customers know it (e.g. "Zara", "שופרסל"), not the legal company name. Keep the original script.',
    },
    amount: { ...nullableNumber, description: 'Credit / card value (remaining balance if shown), as a plain number without currency.' },
    currency: { ...nullableString, description: 'ISO 4217 code, e.g. ILS, USD, EUR.' },
    issue_date: { ...nullableString, description: 'Date the receipt / voucher was issued, YYYY-MM-DD.' },
    expiry_date: {
      ...nullableString,
      description:
        'Last valid date, YYYY-MM-DD. If only a validity period is printed (e.g. "valid for 1 year"), compute it from the issue date.',
    },
    code: { ...nullableString, description: 'Voucher code, card number or barcode number needed to redeem. Exactly as printed.' },
    pin: { ...nullableString, description: 'PIN / security code if printed separately.' },
    link: { ...nullableString, description: 'Redemption or balance URL if printed.' },
    notes: {
      ...nullableString,
      description: 'One short line of useful context (e.g. "Return of 2 items", branch name). Same language as the document.',
    },
    confidence: {
      type: 'object',
      description: 'Confidence 0.0–1.0 for each extracted field. Use < 0.6 when the value is guessed, partially legible or inferred.',
      properties: Object.fromEntries(CONFIDENCE_FIELDS.map((f) => [f, { type: 'number' }])),
      required: [...CONFIDENCE_FIELDS],
      additionalProperties: false,
    },
  },
  required: [
    'is_credit_document',
    'item_type',
    'store_name',
    'amount',
    'currency',
    'issue_date',
    'expiry_date',
    'code',
    'pin',
    'link',
    'notes',
    'confidence',
  ],
  additionalProperties: false,
} as const;

/** Raw model output (validated/normalized by `normalizeExtraction`). */
export interface RawExtraction {
  is_credit_document?: unknown;
  item_type?: unknown;
  store_name?: unknown;
  amount?: unknown;
  currency?: unknown;
  issue_date?: unknown;
  expiry_date?: unknown;
  code?: unknown;
  pin?: unknown;
  link?: unknown;
  notes?: unknown;
  confidence?: Partial<Record<ConfidenceField, unknown>> | unknown;
}

export const EXTRACTION_SYSTEM_PROMPT = `You read photos, screenshots and PDFs of receipts, return/credit notes, gift cards and vouchers for a personal wallet app used mostly in Israel (Hebrew and English documents).

Extract only what is printed or can be computed with certainty. Return null for anything missing; never invent values.
- store_name: the brand customers would search for. Prefer the logo/brand over the legal entity (e.g. "Zara" not "Inditex Israel Ltd"; "שופרסל" not "שופרסל בע״מ").
- amount: the credit or card value. On a return/credit note use the credited amount, not the original purchase total. Use the remaining balance when one is shown.
- currency: ₪, ש״ח, NIS → ILS.
- Dates: Israeli documents are day-first (DD/MM/YYYY). Output YYYY-MM-DD.
- expiry_date: look for תוקף, בתוקף עד, ניתן למימוש עד, valid until, expires, exp. If a period is given ("valid for 12 months") compute it from issue_date.
- code: the redemption code / card number / barcode digits exactly as printed (keep dashes), not an invoice or transaction number unless it is clearly what is used to redeem.
- item_type: "store_credit" for return credits / credit notes (זיכוי, תעודת זיכוי), "gift_card" for gift cards and vouchers (כרטיס מתנה, שובר, תו קנייה).
Set confidence honestly per field.`;

export function extractionUserPrompt(todayIso: string): string {
  return `Today is ${todayIso}. Extract the wallet details from this document.`;
}
