import type { StringKey } from '@/i18n/en';
import { isValidHttpUrl, parseUrl } from '@/utils/url';

import { isValidIsoDate } from './dates';
import { parseAmountToMinor } from './money';
import type { BarcodeFormat, ItemDraft, ItemSource, ItemType } from './types';

/** Raw form state: amounts are strings exactly as typed. */
export interface ItemFormValues {
  type: ItemType;
  storeName: string;
  storeCategory: string | null;
  amount: string;
  balance: string;
  currency: string;
  expiryDate: string | null;
  purchaseDate: string | null;
  code: string;
  pin: string;
  barcodeFormat: BarcodeFormat;
  linkUrl: string;
  notes: string;
  source: ItemSource;
}

export type FormErrors = Partial<Record<keyof ItemFormValues, StringKey>>;

export function validateItemForm(v: ItemFormValues): { errors: FormErrors; draft: ItemDraft | null } {
  const errors: FormErrors = {};
  const storeName = v.storeName.trim();
  if (!storeName) errors.storeName = 'form.error.store';

  const amountMinor = v.amount.trim() ? parseAmountToMinor(v.amount, v.currency) : null;
  if (v.amount.trim() && amountMinor === null) errors.amount = 'form.error.amount';

  const balanceMinor = v.balance.trim() ? parseAmountToMinor(v.balance, v.currency) : null;
  if (v.balance.trim() && balanceMinor === null) errors.balance = 'form.error.amount';
  else if (balanceMinor !== null && amountMinor !== null && balanceMinor > amountMinor) errors.balance = 'form.error.balance';

  const link = v.linkUrl.trim();
  if (link && !isValidHttpUrl(link)) errors.linkUrl = 'form.error.link';

  if (Object.keys(errors).length > 0) return { errors, draft: null };

  return {
    errors,
    draft: {
      type: v.type,
      storeName,
      storeCategory: v.storeCategory,
      amountMinor,
      balanceMinor: balanceMinor ?? amountMinor,
      currency: v.currency,
      expiryDate: isValidIsoDate(v.expiryDate) ? v.expiryDate : null,
      purchaseDate: isValidIsoDate(v.purchaseDate) ? v.purchaseDate : null,
      code: v.code.trim() || null,
      pin: v.pin.trim() || null,
      barcodeFormat: v.barcodeFormat,
      linkUrl: link ? parseUrl(link)!.href : null,
      notes: v.notes.trim() || null,
      source: v.source,
    },
  };
}
