/**
 * Core domain model for Shvar.
 *
 * Money is always stored as integer minor units (agorot / cents) to avoid
 * floating point drift. Dates without a time component (expiry, purchase)
 * are stored as ISO `YYYY-MM-DD` strings; timestamps are full ISO strings.
 *
 * Every persisted entity carries `id` (UUID), `createdAt`, `updatedAt` and an
 * optional `deletedAt` tombstone so that a sync/backup layer can be added later
 * without a schema rewrite (see DECISIONS.md).
 */

export type ItemType = 'gift_card' | 'store_credit';
export type ItemStatus = 'active' | 'used' | 'expired';
export type ItemSource = 'manual' | 'receipt' | 'link' | 'share' | 'seed';
export type BarcodeFormat = 'code128' | 'qr' | 'text';

export const ITEM_TYPES: readonly ItemType[] = ['gift_card', 'store_credit'];
export const ITEM_STATUSES: readonly ItemStatus[] = ['active', 'used', 'expired'];

export interface SyncMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface Item extends SyncMeta {
  type: ItemType;
  storeName: string;
  storeCategory: string | null;
  storeLogoUri: string | null;
  /** Face value at creation, in minor units. */
  initialAmountMinor: number | null;
  /** Remaining balance, in minor units. */
  balanceMinor: number | null;
  /** ISO 4217 currency code, e.g. ILS, USD, EUR. */
  currency: string;
  /** YYYY-MM-DD or null when the item does not expire. */
  expiryDate: string | null;
  /** YYYY-MM-DD, date on the receipt / issue date. */
  purchaseDate: string | null;
  /** Decrypted code / card number. Only present in memory, never stored in plaintext. */
  code: string | null;
  /** Decrypted PIN. Only present in memory, never stored in plaintext. */
  pin: string | null;
  barcodeFormat: BarcodeFormat;
  linkUrl: string | null;
  notes: string | null;
  status: ItemStatus;
  source: ItemSource;
  /** When true, no location reminders for this item. */
  locationMuted: boolean;
  /** Pinned manual location (e.g. a small local shop the places API does not know). */
  pinnedLat: number | null;
  pinnedLng: number | null;
}

export type BalanceEventType = 'created' | 'usage' | 'adjustment' | 'marked_used' | 'expired' | 'reactivated';

export interface BalanceEvent extends SyncMeta {
  itemId: string;
  type: BalanceEventType;
  /** Signed change in minor units (negative for usage). */
  deltaMinor: number;
  /** Balance after this event (null when the item has no tracked balance). */
  balanceAfterMinor: number | null;
  note: string | null;
}

export type AttachmentKind = 'receipt' | 'screenshot' | 'document';

export interface Attachment extends SyncMeta {
  itemId: string;
  /** File name inside the app's attachments directory (relative, survives container moves). */
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
}

/** Fields the user can edit on an item (used by forms and the review screen). */
export interface ItemDraft {
  type: ItemType;
  storeName: string;
  storeCategory: string | null;
  amountMinor: number | null;
  balanceMinor: number | null;
  currency: string;
  expiryDate: string | null;
  purchaseDate: string | null;
  code: string | null;
  pin: string | null;
  barcodeFormat: BarcodeFormat;
  linkUrl: string | null;
  notes: string | null;
  source: ItemSource;
}

export function emptyDraft(overrides: Partial<ItemDraft> = {}): ItemDraft {
  return {
    type: 'store_credit',
    storeName: '',
    storeCategory: null,
    amountMinor: null,
    balanceMinor: null,
    currency: 'ILS',
    expiryDate: null,
    purchaseDate: null,
    code: null,
    pin: null,
    barcodeFormat: 'code128',
    linkUrl: null,
    notes: null,
    source: 'manual',
    ...overrides,
  };
}
