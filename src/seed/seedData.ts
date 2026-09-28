import { addDays, todayIso } from '@/domain/dates';
import { emptyDraft, type ItemDraft } from '@/domain/types';

export interface SeedEntry {
  draft: ItemDraft;
  /** Optional partial usages to demonstrate balance history (minor units). */
  usages?: { spentMinor: number; note?: string }[];
  markUsed?: boolean;
}

/** Demo wallet showing every feature: mixed types, currencies, expiry states, links and codes. */
export function buildSeed(today = todayIso()): SeedEntry[] {
  return [
    {
      draft: emptyDraft({
        type: 'store_credit',
        storeName: 'Zara',
        storeCategory: 'fashion',
        amountMinor: 18000,
        currency: 'ILS',
        expiryDate: addDays(today, 9),
        purchaseDate: addDays(today, -80),
        code: '4470 2291 8830 12',
        barcodeFormat: 'code128',
        notes: 'Returned a jacket',
        source: 'seed',
      }),
      usages: [{ spentMinor: 6000, note: 'T-shirt' }],
    },
    {
      draft: emptyDraft({
        type: 'gift_card',
        storeName: 'BuyMe',
        storeCategory: 'gift_platform',
        amountMinor: 30000,
        currency: 'ILS',
        expiryDate: addDays(today, 410),
        linkUrl: 'https://buyme.co.il/giftcard/demo',
        code: 'BM-7F3K-22QX',
        barcodeFormat: 'qr',
        notes: 'Birthday gift from the team',
        source: 'seed',
      }),
    },
    {
      draft: emptyDraft({
        type: 'store_credit',
        storeName: 'סופר-פארם',
        storeCategory: 'pharmacy',
        amountMinor: 8990,
        currency: 'ILS',
        expiryDate: addDays(today, 2),
        code: '2900012345678',
        barcodeFormat: 'code128',
        source: 'seed',
      }),
    },
    {
      draft: emptyDraft({
        type: 'store_credit',
        storeName: 'Castro',
        storeCategory: 'fashion',
        amountMinor: 24900,
        currency: 'ILS',
        expiryDate: addDays(today, 45),
        code: 'CS-99120-44',
        source: 'seed',
      }),
    },
    {
      draft: emptyDraft({
        type: 'gift_card',
        storeName: 'IKEA',
        storeCategory: 'home',
        amountMinor: 50000,
        currency: 'ILS',
        expiryDate: null,
        code: '6275 9800 1234 5678',
        pin: '4821',
        source: 'seed',
      }),
      usages: [{ spentMinor: 12950, note: 'Shelves' }],
    },
    {
      draft: emptyDraft({
        type: 'gift_card',
        storeName: 'Amazon',
        storeCategory: 'department',
        amountMinor: 5000,
        currency: 'USD',
        expiryDate: null,
        code: 'AQ7K-L2MN-P9RT',
        barcodeFormat: 'text',
        linkUrl: 'https://www.amazon.com/gc/redeem',
        source: 'seed',
      }),
    },
    {
      draft: emptyDraft({
        type: 'store_credit',
        storeName: 'שופרסל',
        storeCategory: 'groceries',
        amountMinor: 4500,
        currency: 'ILS',
        expiryDate: addDays(today, 25),
        source: 'seed',
      }),
    },
    {
      draft: emptyDraft({
        type: 'store_credit',
        storeName: 'Fox',
        storeCategory: 'fashion',
        amountMinor: 12000,
        currency: 'ILS',
        expiryDate: addDays(today, 120),
        source: 'seed',
      }),
      markUsed: true,
    },
    {
      draft: emptyDraft({
        type: 'gift_card',
        storeName: 'Steimatzky',
        storeCategory: 'books',
        amountMinor: 10000,
        currency: 'ILS',
        expiryDate: addDays(today, -12),
        source: 'seed',
      }),
    },
  ];
}
