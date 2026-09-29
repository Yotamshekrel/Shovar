import { addMonths } from '@/domain/dates';
import { analyzeLink, firstUrl } from '@/links/analyzeLink';
import { decodeEntities, parsePageMeta, storeFromTitle } from '@/links/pageMeta';

const NOW = new Date(2026, 8, 28);

describe('parsePageMeta', () => {
  it('reads title, Open Graph tags and visible text', () => {
    const html = `<!doctype html><html><head>
      <title>Ignored &amp; replaced</title>
      <meta property="og:title" content="Gift Card | Golda &#8211; Ice Cream">
      <meta content="Golda" property="og:site_name">
      <meta name="description" content="A ₪150 gift card">
      <style>.x{color:red}</style><script>var amount = 999;</script>
      </head><body><h1>Your gift</h1><p>Value: ₪150</p><p>Code: GLD-7781-22</p></body></html>`;
    const meta = parsePageMeta(html, 'https://golda.co.il/gift/1');
    expect(meta.title).toBe('Gift Card | Golda – Ice Cream');
    expect(meta.siteName).toBe('Golda');
    expect(meta.description).toBe('A ₪150 gift card');
    expect(meta.text).toContain('Value: ₪150');
    expect(meta.text).not.toContain('999');
    expect(meta.finalUrl).toBe('https://golda.co.il/gift/1');
  });

  it('decodes entities', () => {
    expect(decodeEntities('a &amp; b &#x5D0; &quot;c&quot; &nbsp;')).toBe('a & b א "c"  ');
  });

  it('picks a store-like segment from titles', () => {
    expect(storeFromTitle('Gift Card | Golda – Buy online', null)).toBe('Golda');
    expect(storeFromTitle('כרטיס מתנה - מסעדת הדג', null)).toBe('מסעדת הדג');
    expect(storeFromTitle('Home', 'Renuar')).toBe('Renuar');
    expect(storeFromTitle(null, null)).toBeNull();
  });
});

describe('analyzeLink', () => {
  it('detects the store from a brand domain', () => {
    const r = analyzeLink({ url: 'https://www.zara.com/il/en/giftcard?amount=250', now: NOW });
    expect(r.draft).toMatchObject({
      type: 'gift_card',
      storeName: 'Zara',
      linkUrl: 'https://www.zara.com/il/en/giftcard?amount=250',
      amountMinor: 25000,
      source: 'link',
    });
  });

  it('prefers a specific store named in the message over the gift platform', () => {
    const text = 'קיבלת שובר מתנה לקסטרו על סך 200 ₪ דרך BuyMe! למימוש: https://buyme.co.il/gift/XYZ';
    const r = analyzeLink({ url: 'https://buyme.co.il/gift/XYZ', sharedText: text, source: 'share', now: NOW });
    expect(r.draft).toMatchObject({ storeName: 'Castro', amountMinor: 20000, currency: 'ILS', type: 'gift_card', source: 'share' });
  });

  it('falls back to the platform when no store is named', () => {
    const r = analyzeLink({ url: 'https://buyme.co.il/gift/ABC', sharedText: 'Happy birthday! https://buyme.co.il/gift/ABC', now: NOW });
    expect(r.draft.storeName).toBe('BuyMe');
    expect(r.draft.amountMinor).toBeNull();
    expect(r.lowConfidence).toContain('amountMinor');
  });

  it('uses page metadata for unknown sites', () => {
    const page = parsePageMeta(
      '<title>Gift Card | Golda</title><body>Value ₪150. Valid for 12 months.</body>',
      'https://gift.golda.co.il/c/1',
    );
    const r = analyzeLink({ url: 'https://gift.golda.co.il/c/1', page, now: NOW });
    expect(r.draft).toMatchObject({ storeName: 'Golda', amountMinor: 15000, expiryDate: addMonths('2026-09-28', 12) });
  });

  it('uses the domain name as a last resort, flagged for review', () => {
    const r = analyzeLink({ url: 'https://mysterystore.example/v/1', now: NOW });
    expect(r.draft.storeName).toBe('Mysterystore');
    expect(r.lowConfidence).toContain('storeName');
  });

  it('keeps store credit links as credits', () => {
    const r = analyzeLink({ url: 'https://example.com/c', sharedText: 'Your store credit: ₪80 at Fox https://example.com/c', now: NOW });
    expect(r.draft).toMatchObject({ type: 'store_credit', storeName: 'Fox', amountMinor: 8000 });
  });

  it('finds the first link in a message', () => {
    expect(firstUrl('see https://a.co/x and https://b.co/y')).toBe('https://a.co/x');
    expect(firstUrl('no links')).toBeNull();
  });
});

describe('share-sheet deep link routing', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { redirectSystemPath } = require('@/app/+native-intent') as typeof import('@/app/+native-intent');

  it('routes expo-sharing URLs to the share handler', () => {
    expect(redirectSystemPath({ path: 'shovar://expo-sharing?data=1', initial: true })).toBe('/handle-share');
    expect(redirectSystemPath({ path: 'expo-sharing://share', initial: false })).toBe('/handle-share');
  });

  it('leaves other links untouched', () => {
    expect(redirectSystemPath({ path: '/item/abc', initial: false })).toBe('/item/abc');
    expect(redirectSystemPath({ path: 'shovar://search', initial: true })).toBe('shovar://search');
  });
});

describe('decideShare', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { decideShare } = require('@/links/shareDecision') as typeof import('@/links/shareDecision');

  it('handles shared text/links immediately', () => {
    expect(decideShare([{ shareType: 'text', value: 'Gift: https://buyme.co.il/g/1' }], [], true)).toEqual({
      kind: 'text',
      text: 'Gift: https://buyme.co.il/g/1',
      url: 'https://buyme.co.il/g/1',
    });
    expect(decideShare([{ shareType: 'url', value: 'https://zara.com/gc' }], [], false)).toMatchObject({
      kind: 'text',
      url: 'https://zara.com/gc',
    });
  });

  it('waits for file resolution, then imports images and PDFs', () => {
    const shared = [{ shareType: 'image' as const, value: 'file:///x.jpg' }];
    expect(decideShare(shared, [], true)).toEqual({ kind: 'wait' });
    const resolved = [
      {
        ...shared[0],
        contentType: 'image' as const,
        contentUri: 'file:///x.jpg',
        contentMimeType: 'image/jpeg',
        contentSize: 10,
        originalName: 'x.jpg',
      },
    ];
    expect(decideShare(shared, resolved, false)).toMatchObject({
      kind: 'file',
      attachment: { uri: 'file:///x.jpg', mimeType: 'image/jpeg', kind: 'screenshot' },
    });
    const pdf = [
      {
        shareType: 'file' as const,
        value: 'file:///r.pdf',
        contentType: 'file' as const,
        contentUri: 'file:///r.pdf',
        contentMimeType: 'application/pdf',
        contentSize: 1,
        originalName: 'r.pdf',
      },
    ];
    expect(decideShare(pdf, pdf, false)).toMatchObject({ kind: 'file', attachment: { kind: 'document' } });
  });

  it('rejects unsupported files and reports empty shares', () => {
    const zip = [
      {
        shareType: 'file' as const,
        value: 'file:///a.zip',
        contentType: 'file' as const,
        contentUri: 'file:///a.zip',
        contentMimeType: 'application/zip',
        contentSize: 1,
        originalName: 'a.zip',
      },
    ];
    expect(decideShare(zip, zip, false)).toEqual({ kind: 'unsupported' });
    expect(decideShare([], [], false)).toEqual({ kind: 'nothing' });
  });
});
