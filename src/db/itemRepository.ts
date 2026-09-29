import { isPastExpiry, nowIso, todayIso } from '@/domain/dates';
import type {
  Attachment,
  AttachmentKind,
  BalanceEvent,
  BalanceEventType,
  BarcodeFormat,
  Item,
  ItemDraft,
  ItemSource,
  ItemStatus,
  ItemType,
} from '@/domain/types';
import { storeKey } from '@/search/brands';
import type { FieldCipher } from '@/security/fieldCipher';

import type { SqlDriver, SqlExecutor, SqlValue } from './driver';

interface ItemRow {
  id: string;
  type: ItemType;
  store_name: string;
  store_key: string;
  store_category: string | null;
  store_logo_uri: string | null;
  initial_amount_minor: number | null;
  balance_minor: number | null;
  currency: string;
  expiry_date: string | null;
  purchase_date: string | null;
  code_enc: string | null;
  pin_enc: string | null;
  barcode_format: BarcodeFormat;
  link_url: string | null;
  notes: string | null;
  status: ItemStatus;
  source: ItemSource;
  location_muted: number;
  pinned_lat: number | null;
  pinned_lng: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface EventRow {
  id: string;
  item_id: string;
  type: BalanceEventType;
  delta_minor: number;
  balance_after_minor: number | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface AttachmentRow {
  id: string;
  item_id: string;
  file_name: string;
  mime_type: string;
  kind: AttachmentKind;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface NewAttachment {
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
}

export type ItemPatch = Partial<ItemDraft> & {
  status?: ItemStatus;
  locationMuted?: boolean;
  pinnedLat?: number | null;
  pinnedLng?: number | null;
  storeLogoUri?: string | null;
};

export interface RepositoryDeps {
  db: SqlDriver;
  cipher: FieldCipher;
  newId: () => string;
  now?: () => string;
}

export class ItemRepository {
  private readonly db: SqlDriver;
  private readonly cipher: FieldCipher;
  private readonly newId: () => string;
  private readonly now: () => string;

  constructor(deps: RepositoryDeps) {
    this.db = deps.db;
    this.cipher = deps.cipher;
    this.newId = deps.newId;
    this.now = deps.now ?? nowIso;
  }

  // ---------------------------------------------------------------- mapping

  private decryptOrNull(value: string | null): string | null {
    if (!value) return null;
    try {
      return this.cipher.decrypt(value);
    } catch {
      // Key mismatch (e.g. restored DB on a new device). Surface as missing
      // rather than crashing the whole list.
      return null;
    }
  }

  private toItem(row: ItemRow, withSecrets: boolean): Item {
    return {
      id: row.id,
      type: row.type,
      storeName: row.store_name,
      storeCategory: row.store_category,
      storeLogoUri: row.store_logo_uri,
      initialAmountMinor: row.initial_amount_minor,
      balanceMinor: row.balance_minor,
      currency: row.currency,
      expiryDate: row.expiry_date,
      purchaseDate: row.purchase_date,
      code: withSecrets ? this.decryptOrNull(row.code_enc) : null,
      pin: withSecrets ? this.decryptOrNull(row.pin_enc) : null,
      barcodeFormat: row.barcode_format,
      linkUrl: row.link_url,
      notes: row.notes,
      status: row.status,
      source: row.source,
      locationMuted: row.location_muted === 1,
      pinnedLat: row.pinned_lat,
      pinnedLng: row.pinned_lng,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private static toEvent(row: EventRow): BalanceEvent {
    return {
      id: row.id,
      itemId: row.item_id,
      type: row.type,
      deltaMinor: row.delta_minor,
      balanceAfterMinor: row.balance_after_minor,
      note: row.note,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private static toAttachment(row: AttachmentRow): Attachment {
    return {
      id: row.id,
      itemId: row.item_id,
      fileName: row.file_name,
      mimeType: row.mime_type,
      kind: row.kind,
      width: row.width,
      height: row.height,
      sizeBytes: row.size_bytes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    };
  }

  private encryptOrNull(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? this.cipher.encrypt(trimmed) : null;
  }

  // ---------------------------------------------------------------- queries

  /** All non-deleted items. Secrets are decrypted only when asked for. */
  async listItems(opts: { withSecrets?: boolean; includeDeleted?: boolean } = {}): Promise<Item[]> {
    const rows = await this.db.all<ItemRow>(
      opts.includeDeleted
        ? 'SELECT * FROM items ORDER BY created_at DESC'
        : 'SELECT * FROM items WHERE deleted_at IS NULL ORDER BY created_at DESC',
    );
    return rows.map((r) => this.toItem(r, opts.withSecrets ?? false));
  }

  async listActiveItems(): Promise<Item[]> {
    const rows = await this.db.all<ItemRow>("SELECT * FROM items WHERE deleted_at IS NULL AND status = 'active'");
    const today = todayIso();
    return rows.map((r) => this.toItem(r, false)).filter((i) => !i.expiryDate || i.expiryDate >= today);
  }

  async getItem(id: string, opts: { withSecrets?: boolean } = { withSecrets: true }): Promise<Item | null> {
    const row = await this.db.get<ItemRow>('SELECT * FROM items WHERE id = ?', [id]);
    return row ? this.toItem(row, opts.withSecrets ?? true) : null;
  }

  async listEvents(itemId: string): Promise<BalanceEvent[]> {
    const rows = await this.db.all<EventRow>(
      'SELECT * FROM balance_events WHERE item_id = ? AND deleted_at IS NULL ORDER BY created_at DESC, rowid DESC',
      [itemId],
    );
    return rows.map(ItemRepository.toEvent);
  }

  async listAttachments(itemId: string): Promise<Attachment[]> {
    const rows = await this.db.all<AttachmentRow>(
      'SELECT * FROM attachments WHERE item_id = ? AND deleted_at IS NULL ORDER BY created_at ASC',
      [itemId],
    );
    return rows.map(ItemRepository.toAttachment);
  }

  async countAttachmentsByItem(): Promise<Map<string, number>> {
    const rows = await this.db.all<{ item_id: string; n: number }>(
      'SELECT item_id, COUNT(*) AS n FROM attachments WHERE deleted_at IS NULL GROUP BY item_id',
    );
    return new Map(rows.map((r) => [r.item_id, r.n]));
  }

  // ---------------------------------------------------------------- writes

  private async insertEvent(
    tx: SqlExecutor,
    itemId: string,
    type: BalanceEventType,
    deltaMinor: number,
    balanceAfterMinor: number | null,
    note: string | null,
    at: string,
  ): Promise<void> {
    await tx.run(
      `INSERT INTO balance_events (id, item_id, type, delta_minor, balance_after_minor, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [this.newId(), itemId, type, deltaMinor, balanceAfterMinor, note, at, at],
    );
  }

  async createItem(draft: ItemDraft, attachments: NewAttachment[] = []): Promise<Item> {
    const storeName = draft.storeName.trim();
    if (!storeName) throw new Error('Store name is required');
    const id = this.newId();
    const at = this.now();
    const initial = draft.amountMinor ?? draft.balanceMinor ?? null;
    const balance = draft.balanceMinor ?? draft.amountMinor ?? null;
    const status: ItemStatus = isPastExpiry(draft.expiryDate) ? 'expired' : balance === 0 ? 'used' : 'active';

    await this.db.transaction(async (tx) => {
      await tx.run(
        `INSERT INTO items (id, type, store_name, store_key, store_category, initial_amount_minor, balance_minor, currency,
          expiry_date, purchase_date, code_enc, pin_enc, barcode_format, link_url, notes, status, source,
          location_muted, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          id,
          draft.type,
          storeName,
          storeKey(storeName),
          draft.storeCategory,
          initial,
          balance,
          draft.currency,
          draft.expiryDate,
          draft.purchaseDate,
          this.encryptOrNull(draft.code),
          this.encryptOrNull(draft.pin),
          draft.barcodeFormat,
          draft.linkUrl?.trim() || null,
          draft.notes?.trim() || null,
          status,
          draft.source,
          at,
          at,
        ],
      );
      await this.insertEvent(tx, id, 'created', balance ?? 0, balance, null, at);
      for (const a of attachments) {
        await this.insertAttachment(tx, id, a, at);
      }
    });
    const item = await this.getItem(id);
    if (!item) throw new Error('Failed to create item');
    return item;
  }

  private async insertAttachment(tx: SqlExecutor, itemId: string, a: NewAttachment, at: string): Promise<string> {
    const id = this.newId();
    await tx.run(
      `INSERT INTO attachments (id, item_id, file_name, mime_type, kind, width, height, size_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, itemId, a.fileName, a.mimeType, a.kind, a.width ?? null, a.height ?? null, a.sizeBytes ?? null, at, at],
    );
    return id;
  }

  async addAttachment(itemId: string, a: NewAttachment): Promise<Attachment> {
    const at = this.now();
    let id = '';
    await this.db.transaction(async (tx) => {
      id = await this.insertAttachment(tx, itemId, a, at);
      await tx.run('UPDATE items SET updated_at = ? WHERE id = ?', [at, itemId]);
    });
    const row = await this.db.get<AttachmentRow>('SELECT * FROM attachments WHERE id = ?', [id]);
    if (!row) throw new Error('Failed to add attachment');
    return ItemRepository.toAttachment(row);
  }

  async removeAttachment(attachmentId: string): Promise<void> {
    const at = this.now();
    await this.db.run('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE id = ?', [at, at, attachmentId]);
  }

  /**
   * Updates editable fields. A balance change made through the edit form is
   * recorded as an "adjustment" so history stays complete.
   */
  async updateItem(id: string, patch: ItemPatch): Promise<Item> {
    const current = await this.getItem(id, { withSecrets: false });
    if (!current) throw new Error(`Item ${id} not found`);
    const at = this.now();
    const sets: string[] = [];
    const params: SqlValue[] = [];
    const set = (col: string, value: SqlValue) => {
      sets.push(`${col} = ?`);
      params.push(value);
    };

    if (patch.type !== undefined) set('type', patch.type);
    if (patch.storeName !== undefined) {
      const name = patch.storeName.trim();
      if (!name) throw new Error('Store name is required');
      set('store_name', name);
      set('store_key', storeKey(name));
    }
    if (patch.storeCategory !== undefined) set('store_category', patch.storeCategory);
    if (patch.storeLogoUri !== undefined) set('store_logo_uri', patch.storeLogoUri);
    if (patch.amountMinor !== undefined) set('initial_amount_minor', patch.amountMinor);
    if (patch.currency !== undefined) set('currency', patch.currency);
    if (patch.expiryDate !== undefined) set('expiry_date', patch.expiryDate);
    if (patch.purchaseDate !== undefined) set('purchase_date', patch.purchaseDate);
    if (patch.code !== undefined) set('code_enc', this.encryptOrNull(patch.code));
    if (patch.pin !== undefined) set('pin_enc', this.encryptOrNull(patch.pin));
    if (patch.barcodeFormat !== undefined) set('barcode_format', patch.barcodeFormat);
    if (patch.linkUrl !== undefined) set('link_url', patch.linkUrl?.trim() || null);
    if (patch.notes !== undefined) set('notes', patch.notes?.trim() || null);
    if (patch.source !== undefined) set('source', patch.source);
    if (patch.locationMuted !== undefined) set('location_muted', patch.locationMuted ? 1 : 0);
    if (patch.pinnedLat !== undefined) set('pinned_lat', patch.pinnedLat);
    if (patch.pinnedLng !== undefined) set('pinned_lng', patch.pinnedLng);

    const balanceChanged = patch.balanceMinor !== undefined && patch.balanceMinor !== current.balanceMinor;
    if (balanceChanged) set('balance_minor', patch.balanceMinor ?? null);

    // Re-derive status only when the expiry date or balance actually changed (unless set explicitly).
    // Editing e.g. notes on an archived card must not move it back to the wallet.
    const expiryChanged = patch.expiryDate !== undefined && patch.expiryDate !== current.expiryDate;
    let nextStatus = patch.status;
    if (nextStatus === undefined && (expiryChanged || balanceChanged)) {
      const expiry = expiryChanged ? patch.expiryDate! : current.expiryDate;
      const balance = balanceChanged ? (patch.balanceMinor ?? null) : current.balanceMinor;
      if (isPastExpiry(expiry)) nextStatus = 'expired';
      else if (balance === 0) nextStatus = 'used';
      else if (current.status === 'expired' && expiryChanged) nextStatus = 'active';
      else if (current.status === 'used' && balanceChanged) nextStatus = 'active';
    }
    if (nextStatus !== undefined && nextStatus !== current.status) set('status', nextStatus);

    if (sets.length === 0) return (await this.getItem(id))!;
    set('updated_at', at);

    await this.db.transaction(async (tx) => {
      await tx.run(`UPDATE items SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
      if (balanceChanged) {
        const after = patch.balanceMinor ?? null;
        await this.insertEvent(tx, id, 'adjustment', (after ?? 0) - (current.balanceMinor ?? 0), after, null, at);
      }
      if (nextStatus !== undefined && nextStatus !== current.status) {
        const type: BalanceEventType = nextStatus === 'active' ? 'reactivated' : nextStatus === 'used' ? 'marked_used' : 'expired';
        await this.insertEvent(tx, id, type, 0, balanceChanged ? (patch.balanceMinor ?? null) : current.balanceMinor, null, at);
      }
    });
    return (await this.getItem(id))!;
  }

  /** Logs a partial use. Reaching zero moves the item to the archive. */
  async recordUsage(id: string, spentMinor: number, note: string | null = null): Promise<Item> {
    if (!Number.isInteger(spentMinor) || spentMinor <= 0) throw new Error('Usage amount must be a positive integer');
    const current = await this.getItem(id, { withSecrets: false });
    if (!current) throw new Error(`Item ${id} not found`);
    if (current.balanceMinor == null) throw new Error('Item has no tracked balance');
    const spent = Math.min(spentMinor, current.balanceMinor);
    const after = current.balanceMinor - spent;
    const at = this.now();
    await this.db.transaction(async (tx) => {
      await tx.run('UPDATE items SET balance_minor = ?, status = ?, updated_at = ? WHERE id = ?', [
        after,
        after === 0 ? 'used' : current.status,
        at,
        id,
      ]);
      await this.insertEvent(tx, id, 'usage', -spent, after, note?.trim() || null, at);
      if (after === 0 && current.status !== 'used') {
        await this.insertEvent(tx, id, 'marked_used', 0, 0, null, at);
      }
    });
    return (await this.getItem(id))!;
  }

  /** Sets the remaining balance directly (e.g. after checking it online). */
  async setBalance(id: string, balanceMinor: number, note: string | null = null): Promise<Item> {
    if (!Number.isInteger(balanceMinor) || balanceMinor < 0) throw new Error('Balance must be a non-negative integer');
    const current = await this.getItem(id, { withSecrets: false });
    if (!current) throw new Error(`Item ${id} not found`);
    const at = this.now();
    const nextStatus: ItemStatus = balanceMinor === 0 ? 'used' : isPastExpiry(current.expiryDate) ? 'expired' : 'active';
    await this.db.transaction(async (tx) => {
      await tx.run('UPDATE items SET balance_minor = ?, status = ?, updated_at = ? WHERE id = ?', [balanceMinor, nextStatus, at, id]);
      await this.insertEvent(tx, id, 'adjustment', balanceMinor - (current.balanceMinor ?? 0), balanceMinor, note?.trim() || null, at);
      if (nextStatus !== current.status) {
        const type: BalanceEventType = nextStatus === 'active' ? 'reactivated' : nextStatus === 'used' ? 'marked_used' : 'expired';
        await this.insertEvent(tx, id, type, 0, balanceMinor, null, at);
      }
    });
    return (await this.getItem(id))!;
  }

  /** Marks the item fully used: balance goes to zero and it moves to the archive. */
  async markUsed(id: string): Promise<Item> {
    const current = await this.getItem(id, { withSecrets: false });
    if (!current) throw new Error(`Item ${id} not found`);
    const at = this.now();
    await this.db.transaction(async (tx) => {
      await tx.run(
        "UPDATE items SET status = 'used', balance_minor = CASE WHEN balance_minor IS NULL THEN NULL ELSE 0 END, updated_at = ? WHERE id = ?",
        [at, id],
      );
      await this.insertEvent(tx, id, 'marked_used', -(current.balanceMinor ?? 0), current.balanceMinor == null ? null : 0, null, at);
    });
    return (await this.getItem(id))!;
  }

  /** Brings an archived item back to the active wallet. */
  async reactivate(id: string, balanceMinor?: number | null): Promise<Item> {
    const current = await this.getItem(id, { withSecrets: false });
    if (!current) throw new Error(`Item ${id} not found`);
    const at = this.now();
    const nextBalance =
      balanceMinor !== undefined ? balanceMinor : current.balanceMinor === 0 ? current.initialAmountMinor : current.balanceMinor;
    await this.db.transaction(async (tx) => {
      await tx.run("UPDATE items SET status = 'active', balance_minor = ?, updated_at = ? WHERE id = ?", [nextBalance, at, id]);
      await this.insertEvent(tx, id, 'reactivated', (nextBalance ?? 0) - (current.balanceMinor ?? 0), nextBalance, null, at);
    });
    return (await this.getItem(id))!;
  }

  /** Moves active items whose expiry date has passed to "expired". Returns affected ids. */
  async expireOverdue(now: Date = new Date()): Promise<string[]> {
    const today = todayIso(now);
    const rows = await this.db.all<{ id: string; balance_minor: number | null }>(
      "SELECT id, balance_minor FROM items WHERE deleted_at IS NULL AND status = 'active' AND expiry_date IS NOT NULL AND expiry_date < ?",
      [today],
    );
    if (rows.length === 0) return [];
    const at = this.now();
    await this.db.transaction(async (tx) => {
      for (const r of rows) {
        await tx.run("UPDATE items SET status = 'expired', updated_at = ? WHERE id = ?", [at, r.id]);
        await this.insertEvent(tx, r.id, 'expired', 0, r.balance_minor, null, at);
      }
    });
    return rows.map((r) => r.id);
  }

  /** Soft delete (tombstone) so a future sync can propagate the deletion. */
  async deleteItem(id: string): Promise<void> {
    const at = this.now();
    await this.db.transaction(async (tx) => {
      await tx.run('UPDATE items SET deleted_at = ?, updated_at = ?, code_enc = NULL, pin_enc = NULL WHERE id = ?', [at, at, id]);
      await tx.run('UPDATE attachments SET deleted_at = ?, updated_at = ? WHERE item_id = ?', [at, at, id]);
    });
  }

  async setLocationMuted(id: string, muted: boolean): Promise<Item> {
    return this.updateItem(id, { locationMuted: muted });
  }

  async deleteAll(): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.exec('DELETE FROM attachments; DELETE FROM balance_events; DELETE FROM items; DELETE FROM location_alerts;');
    });
  }
}
