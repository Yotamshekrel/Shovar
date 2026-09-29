import { addMonths } from '@/domain/dates';
import { canonicalStoreName, extractJsonObject, normalizeExtraction } from '@/extraction/normalize';
import { EXTRACTION_SCHEMA } from '@/extraction/schema';
import { findBrandInText, parseReceiptText } from '@/extraction/textHeuristics';

const NOW = new Date(2026, 8, 28); // 2026-09-28

const fullRaw = {
  is_credit_document: true,
  item_type: 'store_credit',
  store_name: 'Zara',
  amount: 180,
  currency: 'ILS',
  issue_date: '2026-08-14',
  expiry_date: '2027-08-14',
  code: '4470-2291-8830',
  pin: null,
  link: null,
  notes: 'Return of 2 items',
  confidence: { item_type: 0.95, store_name: 0.98, amount: 0.97, currency: 0.99, issue_date: 0.9, expiry_date: 0.92, code: 0.93 },
};

describe('normalizeExtraction (model output → form draft)', () => {
  it('maps a confident extraction with no highlighted fields', () => {
    const r = normalizeExtraction(fullRaw, { now: NOW });
    expect(r.draft).toMatchObject({
      type: 'store_credit',
      storeName: 'Zara',
      storeCategory: 'fashion',
      amountMinor: 18000,
      balanceMinor: 18000,
      currency: 'ILS',
      purchaseDate: '2026-08-14',
      expiryDate: '2027-08-14',
      code: '4470-2291-8830',
      notes: 'Return of 2 items',
      barcodeFormat: 'code128',
      source: 'receipt',
    });
    expect(r.lowConfidence).toEqual([]);
    expect(r.isCreditDocument).toBe(true);
    expect(r.fieldsFound).toBe(4);
  });

  it('highlights low-confidence and missing fields', () => {
    const r = normalizeExtraction(
      { ...fullRaw, store_name: null, code: 'X1Y2', confidence: { ...fullRaw.confidence, code: 0.4, expiry_date: 0.55 } },
      { now: NOW },
    );
    expect(r.lowConfidence).toEqual(expect.arrayContaining(['storeName', 'code', 'expiryDate']));
    expect(r.lowConfidence).not.toContain('amountMinor');
    expect(r.draft.storeName).toBe('');
  });

  it('accepts percent confidences and string numbers', () => {
    const r = normalizeExtraction(
      { ...fullRaw, amount: '₪1,250.50', confidence: { ...fullRaw.confidence, amount: 95, store_name: '0.9' } },
      { now: NOW },
    );
    expect(r.draft.amountMinor).toBe(125050);
    expect(r.lowConfidence).not.toContain('amountMinor');
  });

  it('normalizes currency symbols and falls back to the default currency', () => {
    expect(normalizeExtraction({ ...fullRaw, currency: '₪' }, { now: NOW }).draft.currency).toBe('ILS');
    expect(normalizeExtraction({ ...fullRaw, currency: 'nis' }, { now: NOW }).draft.currency).toBe('ILS');
    expect(normalizeExtraction({ ...fullRaw, currency: '$' }, { now: NOW }).draft.currency).toBe('USD');
    const missing = normalizeExtraction({ ...fullRaw, currency: null }, { now: NOW, defaultCurrency: 'EUR' });
    expect(missing.draft.currency).toBe('EUR');
    expect(missing.lowConfidence).toContain('amountMinor');
  });

  it('parses loose date formats and flags implausible dates', () => {
    const r = normalizeExtraction({ ...fullRaw, issue_date: '14/08/2026', expiry_date: '14.08.27' }, { now: NOW });
    expect(r.draft.purchaseDate).toBe('2026-08-14');
    expect(r.draft.expiryDate).toBe('2027-08-14');

    const swapped = normalizeExtraction({ ...fullRaw, issue_date: '2026-08-14', expiry_date: '2026-01-01' }, { now: NOW });
    expect(swapped.lowConfidence).toContain('expiryDate');

    const future = normalizeExtraction({ ...fullRaw, issue_date: '2027-03-01', expiry_date: '2028-03-01' }, { now: NOW });
    expect(future.lowConfidence).toContain('purchaseDate');

    const far = normalizeExtraction({ ...fullRaw, expiry_date: '2099-01-01' }, { now: NOW });
    expect(far.lowConfidence).toContain('expiryDate');
  });

  it('drops zero/negative amounts and invalid links, cleans text', () => {
    const r = normalizeExtraction({ ...fullRaw, amount: 0, link: 'not a url', notes: '  null ', code: '  AB 12  ' }, { now: NOW });
    expect(r.draft.amountMinor).toBeNull();
    expect(r.lowConfidence).toContain('amountMinor');
    expect(r.draft.linkUrl).toBeNull();
    expect(r.draft.notes).toBeNull();
    expect(r.draft.code).toBe('AB 12');
  });

  it('uses QR for codes that Code 128 cannot encode', () => {
    expect(normalizeExtraction({ ...fullRaw, code: 'קוד-123' }, { now: NOW }).draft.barcodeFormat).toBe('qr');
  });

  it('survives garbage input', () => {
    const r = normalizeExtraction(null, { now: NOW });
    expect(r.draft.storeName).toBe('');
    expect(r.lowConfidence).toEqual(expect.arrayContaining(['type', 'storeName', 'amountMinor']));
    expect(normalizeExtraction({ item_type: 'banana', amount: {} } as never, { now: NOW }).draft.type).toBe('store_credit');
  });

  it('reports non-credit documents', () => {
    expect(normalizeExtraction({ ...fullRaw, is_credit_document: false }, { now: NOW }).isCreditDocument).toBe(false);
  });
});

describe('canonicalStoreName', () => {
  it.each([
    ['ZARA', 'Zara'],
    ['זארה', 'זארה'],
    ['שופרסל בע"מ', 'שופרסל'],
    ['Castro Ltd.', 'Castro'],
    ['GOLDA ICE CREAM', 'Golda Ice Cream'],
    ['KSP', 'KSP'],
    ['"Lior Books"', 'Lior Books'],
  ])('%s → %s', (input, expected) => {
    expect(canonicalStoreName(input)).toBe(expected);
  });
});

describe('extractJsonObject', () => {
  it('reads plain, fenced and embedded JSON', () => {
    expect(extractJsonObject('{"store_name":"Zara"}')).toEqual({ store_name: 'Zara' });
    expect(extractJsonObject('```json\n{"store_name":"Zara","notes":"a } b"}\n```')).toEqual({ store_name: 'Zara', notes: 'a } b' });
    expect(extractJsonObject('Here you go: {"a":{"b":1}} thanks')).toEqual({ a: { b: 1 } });
    expect(extractJsonObject('no json')).toBeNull();
    expect(extractJsonObject('{broken')).toBeNull();
  });
});

describe('extraction schema', () => {
  it('requires every property and forbids extra ones (structured outputs rules)', () => {
    const props = Object.keys(EXTRACTION_SCHEMA.properties);
    expect([...EXTRACTION_SCHEMA.required].sort()).toEqual(props.sort());
    expect(EXTRACTION_SCHEMA.additionalProperties).toBe(false);
    expect(EXTRACTION_SCHEMA.properties.confidence.additionalProperties).toBe(false);
    // Unsupported JSON-schema constraints must not be used.
    const json = JSON.stringify(EXTRACTION_SCHEMA);
    expect(json).not.toMatch(/minimum|maximum|minLength|maxLength/);
  });
});

describe('parseReceiptText (on-device OCR / shared text)', () => {
  it('reads an Israeli credit note', () => {
    const text = `ZARA
זארה ישראל בע"מ
סניף עזריאלי ת"א
תעודת זיכוי
תאריך: 14/08/2026 18:32
מס' שובר: 4470-2291-8830
סכום הזיכוי: 180.00 ש"ח
בתוקף עד 14/08/2027`;
    const r = normalizeExtraction(parseReceiptText(text, { now: NOW }), { now: NOW });
    expect(r.draft).toMatchObject({
      type: 'store_credit',
      storeName: 'Zara',
      amountMinor: 18000,
      currency: 'ILS',
      purchaseDate: '2026-08-14',
      expiryDate: '2027-08-14',
      code: '4470-2291-8830',
    });
  });

  it('reads an English gift card', () => {
    const text = `Amazon.com Gift Card
Amount: $50.00
Claim code: AQ7K-L2MN-P9RT
Expires: Never`;
    const r = normalizeExtraction(parseReceiptText(text, { now: NOW }), { now: NOW });
    expect(r.draft).toMatchObject({
      type: 'gift_card',
      storeName: 'Amazon',
      amountMinor: 5000,
      currency: 'USD',
      code: 'AQ7K-L2MN-P9RT',
      expiryDate: null,
    });
  });

  it('reads a shared WhatsApp gift message with a validity period', () => {
    const text = 'היי! קיבלת גיפט קארד BuyMe על סך 200 ₪ 🎁 לצפייה במתנה: https://buyme.co.il/gift/ABC123 בתוקף ל-5 שנים';
    const r = normalizeExtraction(parseReceiptText(text, { now: NOW }), { now: NOW, source: 'share' });
    expect(r.draft).toMatchObject({
      type: 'gift_card',
      storeName: 'BuyMe',
      amountMinor: 20000,
      currency: 'ILS',
      linkUrl: 'https://buyme.co.il/gift/ABC123',
      expiryDate: addMonths('2026-09-28', 60),
      source: 'share',
    });
  });

  it('prefers the credit line over the receipt total, and computes day periods', () => {
    const text = `סופר-פארם
קבלה מס' 123456
תאריך 01.09.2026
סה"כ 349.90
זיכוי ללקוח 89.90 ₪
תוקף הזיכוי: 30 יום`;
    const r = normalizeExtraction(parseReceiptText(text, { now: NOW }), { now: NOW });
    expect(r.draft).toMatchObject({ storeName: 'Super-Pharm', amountMinor: 8990, purchaseDate: '2026-09-01', expiryDate: '2026-10-01' });
  });

  it('does not mistake dates, times or phone numbers for amounts', () => {
    const text = `Golda
Tel 03-5551234
12.05.26 14:30
Store credit 45 NIS`;
    const r = normalizeExtraction(parseReceiptText(text, { now: NOW }), { now: NOW });
    expect(r.draft.amountMinor).toBe(4500);
    expect(r.draft.storeName).toBe('Golda');
    expect(r.draft.purchaseDate).toBe('2026-05-12');
  });

  it('finds a standalone barcode number and a PIN', () => {
    const text = `Castro gift card
Value ₪250
6275 9800 1234 5678
PIN: 4821`;
    const raw = parseReceiptText(text, { now: NOW });
    expect(raw.code).toBe('6275 9800 1234 5678');
    expect(raw.pin).toBe('4821');
    expect(raw.store_name).toBe('Castro');
  });

  it('marks unrelated text as not a credit document', () => {
    const raw = parseReceiptText('Hello, see you tomorrow at 7', { now: NOW });
    expect(raw.is_credit_document).toBe(false);
    expect(raw.amount).toBeNull();
  });

  it('spots brand names with Hebrew prefixes', () => {
    expect(findBrandInText('יש לך זיכוי בזארה')?.id).toBe('zara');
    expect(findBrandInText('Visit IKEA Netanya')?.id).toBe('ikea');
    expect(findBrandInText('nothing here')).toBeNull();
  });
});
