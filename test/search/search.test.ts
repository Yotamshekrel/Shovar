import { emptyDraft, type Item } from '@/domain/types';
import { findBrand, storeKey } from '@/search/brands';
import { editDistance, prepareName, prepareQuery, scoreName } from '@/search/fuzzy';
import { compact, normalizeText } from '@/search/normalize';
import { skeleton } from '@/search/phonetic';
import { buildIndex, searchItems, suggestBrands } from '@/search/searchIndex';

let seq = 0;
function item(storeName: string, extra: Partial<Item> = {}): Item {
  const d = emptyDraft({ storeName, amountMinor: 10000 });
  seq += 1;
  return {
    id: `id-${seq}`,
    type: d.type,
    storeName,
    storeCategory: null,
    storeLogoUri: null,
    initialAmountMinor: 10000,
    balanceMinor: 10000,
    currency: 'ILS',
    expiryDate: null,
    purchaseDate: null,
    code: null,
    pin: null,
    barcodeFormat: 'code128',
    linkUrl: null,
    notes: null,
    status: 'active',
    source: 'manual',
    locationMuted: false,
    pinnedLat: null,
    pinnedLng: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
    ...extra,
  };
}

const wallet: Item[] = [
  item('Zara'),
  item('Castro'),
  item('סופר-פארם'),
  item('IKEA'),
  item('H&M'),
  item('מסעדת הדג'),
  item('Yochananof'),
  item('Mango'),
  item('Max Stock'),
  item('Golda'),
  item('Lior Books', { notes: 'Birthday voucher from Dana' }),
  item('Fox', { status: 'used', balanceMinor: 0 }),
];
const index = buildIndex(wallet);

function top(query: string): string | undefined {
  return searchItems(index, query)[0]?.item.storeName;
}

function names(query: string): string[] {
  return searchItems(index, query).map((r) => r.item.storeName);
}

describe('normalization', () => {
  it('folds case, niqqud, final letters and punctuation', () => {
    expect(normalizeText('  ZARA  ')).toBe('zara');
    expect(normalizeText('שָׁלוֹם')).toBe('שלומ');
    expect(normalizeText('סופר-פארם')).toBe('סופר פארמ');
    expect(compact('H & M')).toBe('hm');
    expect(normalizeText('Café')).toBe('cafe');
  });

  it('builds matching cross-script skeletons', () => {
    expect(skeleton('Zara')).toBe(skeleton('זארה'));
    expect(skeleton('Castro')).toBe(skeleton('קסטרו'));
    expect(skeleton('Super Pharm')).toBe(skeleton('סופר פארם'));
    expect(skeleton('Shufersal')).toBe(skeleton('שופרסל'));
    expect(skeleton('Victory')).toBe(skeleton('ויקטורי'));
    expect(skeleton('Mango')).toBe(skeleton('מנגו'));
    expect(skeleton('Steimatzky')).toBe(skeleton('סטימצקי'));
    expect(skeleton('Golda')).toBe(skeleton('גולדה'));
    expect(skeleton('Home Center')).toBe(skeleton('הום סנטר'));
  });

  it('computes edit distance with transpositions', () => {
    expect(editDistance('zara', 'zara')).toBe(0);
    expect(editDistance('zaar', 'zara')).toBe(1);
    expect(editDistance('ikae', 'ikea')).toBe(1);
    expect(editDistance('castro', 'kastro')).toBe(1);
    expect(editDistance('abc', 'xyz', 1)).toBeGreaterThan(1);
  });
});

describe('search — exact, partial and typos', () => {
  it.each([
    ['zara', 'Zara'],
    ['ZARA', 'Zara'],
    ['za', 'Zara'],
    ['cas', 'Castro'],
    ['zaar', 'Zara'],
    ['ikae', 'IKEA'],
    ['kastro', 'Castro'],
    ['castor', 'Castro'],
    ['mngo', 'Mango'],
    ['yohananof', 'Yochananof'],
    ['h&m', 'H&M'],
    ['hm', 'H&M'],
    ['stock', 'Max Stock'],
    ['max st', 'Max Stock'],
    ['books', 'Lior Books'],
  ])('"%s" → %s', (query, expected) => {
    expect(top(query)).toBe(expected);
  });
});

describe('search — Hebrew and English names', () => {
  it.each([
    ['זארה', 'Zara'],
    ['זרה', 'Zara'],
    ['זאר', 'Zara'],
    ['קסטרו', 'Castro'],
    ['איקאה', 'IKEA'],
    ['super pharm', 'סופר-פארם'],
    ['superpharm', 'סופר-פארם'],
    ['סופר', 'סופר-פארם'],
    ['סופרפארם', 'סופר-פארם'],
    ['הדג', 'מסעדת הדג'],
    ['מסעדת', 'מסעדת הדג'],
    ['גולדה', 'Golda'],
    ['ליאור', 'Lior Books'],
    ['יוחננוף', 'Yochananof'],
    ['מנגו', 'Mango'],
    ['מקס סטוק', 'Max Stock'],
  ])('"%s" → %s', (query, expected) => {
    expect(top(query)).toBe(expected);
  });
});

describe('search — precision', () => {
  it('returns nothing for unrelated stores', () => {
    expect(names('nike')).toEqual([]);
    expect(names('shoes')).toEqual([]);
    expect(names('אדידס')).toEqual([]);
    expect(names('')).toEqual([]);
    expect(names('   ')).toEqual([]);
  });

  it('does not confuse short phonetically-close names', () => {
    expect(names('fox')).toEqual(['Fox']);
  });

  it('matches notes with lower priority', () => {
    const r = searchItems(index, 'dana');
    expect(r[0]?.item.storeName).toBe('Lior Books');
    expect(r[0]?.score).toBeLessThan(0.7);
  });

  it('ranks active items before archived at equal relevance', () => {
    const idx = buildIndex([item('Zara', { status: 'used', balanceMinor: 0 }), item('Zara', { balanceMinor: 5000 })]);
    const r = searchItems(idx, 'zara');
    expect(r.map((x) => x.active)).toEqual([true, false]);
  });

  it('flags archived matches as inactive', () => {
    const r = searchItems(index, 'fox');
    expect(r[0]).toMatchObject({ active: false });
  });

  it('scores exact above prefix above fuzzy', () => {
    const q = prepareQuery('zara');
    expect(scoreName(q, prepareName('Zara'))).toBe(1);
    expect(scoreName(prepareQuery('zar'), prepareName('Zara'))).toBeGreaterThan(scoreName(prepareQuery('zaar'), prepareName('Zara')));
  });

  it('is fast enough for instant search on a large wallet', () => {
    const big = buildIndex(Array.from({ length: 1000 }, (_, i) => item(`Store number ${i}`)).concat(wallet));
    const t0 = Date.now();
    for (let i = 0; i < 20; i++) searchItems(big, 'zaar');
    expect((Date.now() - t0) / 20).toBeLessThan(50);
  });
});

describe('brands', () => {
  it('finds brands across spellings', () => {
    expect(findBrand('ZARA')?.id).toBe('zara');
    expect(findBrand('זארה')?.id).toBe('zara');
    expect(findBrand('Super Pharm')?.id).toBe('superpharm');
    expect(findBrand('סופר-פארם')?.id).toBe('superpharm');
    expect(findBrand('Unknown Place')).toBeNull();
  });

  it('derives stable store keys', () => {
    expect(storeKey('Zara')).toBe(storeKey('זארה'));
    expect(storeKey('My Shop')).toBe('name:myshop');
  });

  it('suggests brands while typing in either script', () => {
    expect(suggestBrands('זאר')[0]?.id).toBe('zara');
    expect(suggestBrands('shuf')[0]?.id).toBe('shufersal');
    expect(suggestBrands('סופר פ')[0]?.id).toBe('superpharm');
    expect(suggestBrands('z')).toEqual([]);
  });
});
