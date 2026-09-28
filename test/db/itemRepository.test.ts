import { randomUUID } from 'node:crypto';

import type { SqlDriver } from '@/db/driver';
import { ItemRepository } from '@/db/itemRepository';
import { KvRepository } from '@/db/kvRepository';
import { LATEST_VERSION, migrate } from '@/db/migrations';
import { addDays, todayIso } from '@/domain/dates';
import { emptyDraft } from '@/domain/types';

import { createTestDriver } from '../support/sqljsDriver';
import { createTestCipher } from '../support/testCipher';

async function setup() {
  const db = await createTestDriver();
  await migrate(db);
  const repo = new ItemRepository({ db, cipher: createTestCipher(), newId: randomUUID });
  return { db, repo };
}

describe('migrations', () => {
  it('migrates a fresh database to the latest version and is idempotent', async () => {
    const db: SqlDriver = await createTestDriver();
    expect(await migrate(db)).toBe(LATEST_VERSION);
    expect(await migrate(db)).toBe(LATEST_VERSION);
    const tables = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    expect(tables.map((t) => t.name)).toEqual(
      expect.arrayContaining(['items', 'balance_events', 'attachments', 'kv', 'store_places', 'store_place_queries', 'location_alerts']),
    );
  });
});

describe('ItemRepository', () => {
  it('creates an item with a created event and store key', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(
      emptyDraft({ storeName: '  Zara ', amountMinor: 12000, currency: 'ILS', code: '1234-5678', pin: '9999' }),
    );
    expect(item.storeName).toBe('Zara');
    expect(item.balanceMinor).toBe(12000);
    expect(item.initialAmountMinor).toBe(12000);
    expect(item.status).toBe('active');
    expect(item.code).toBe('1234-5678');
    expect(item.pin).toBe('9999');
    const events = await repo.listEvents(item.id);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'created', deltaMinor: 12000, balanceAfterMinor: 12000 });
  });

  it('never stores codes or PINs in plaintext', async () => {
    const { repo, db } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Castro', amountMinor: 5000, code: 'SECRET-CODE-42', pin: '4321' }));
    const raw = await db.get<{ code_enc: string; pin_enc: string }>('SELECT code_enc, pin_enc FROM items WHERE id = ?', [item.id]);
    expect(raw?.code_enc).toMatch(/^v1:/);
    expect(raw?.code_enc).not.toContain('SECRET');
    expect(raw?.pin_enc).not.toContain('4321');
    const dump = JSON.stringify(await db.all('SELECT * FROM items'));
    expect(dump).not.toContain('SECRET-CODE-42');
  });

  it('omits secrets from list queries unless requested', async () => {
    const { repo } = await setup();
    await repo.createItem(emptyDraft({ storeName: 'Fox', amountMinor: 1000, code: 'ABC' }));
    expect((await repo.listItems())[0].code).toBeNull();
    expect((await repo.listItems({ withSecrets: true }))[0].code).toBe('ABC');
  });

  it('canonicalizes store keys across Hebrew/English brand spellings', async () => {
    const { repo, db } = await setup();
    await repo.createItem(emptyDraft({ storeName: 'ZARA', amountMinor: 100 }));
    await repo.createItem(emptyDraft({ storeName: 'זארה', amountMinor: 100 }));
    await repo.createItem(emptyDraft({ storeName: 'My Local Shop', amountMinor: 100 }));
    const keys = (await db.all<{ store_key: string }>('SELECT store_key FROM items ORDER BY rowid')).map((r) => r.store_key);
    expect(keys).toEqual(['brand:zara', 'brand:zara', 'name:mylocalshop']);
  });

  it('rejects an empty store name', async () => {
    const { repo } = await setup();
    await expect(repo.createItem(emptyDraft({ storeName: '   ' }))).rejects.toThrow('Store name is required');
  });

  it('logs partial usage and archives when the balance reaches zero', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'IKEA', amountMinor: 20000 }));
    const afterFirst = await repo.recordUsage(item.id, 7550, 'Lamp');
    expect(afterFirst.balanceMinor).toBe(12450);
    expect(afterFirst.status).toBe('active');

    const afterSecond = await repo.recordUsage(item.id, 99999);
    expect(afterSecond.balanceMinor).toBe(0);
    expect(afterSecond.status).toBe('used');

    const events = await repo.listEvents(item.id);
    expect(events.map((e) => e.type)).toEqual(['marked_used', 'usage', 'usage', 'created']);
    expect(events[2]).toMatchObject({ deltaMinor: -7550, balanceAfterMinor: 12450, note: 'Lamp' });
    expect(events[1]).toMatchObject({ deltaMinor: -12450, balanceAfterMinor: 0 });
  });

  it('rejects invalid usage amounts', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Golf', amountMinor: 1000 }));
    await expect(repo.recordUsage(item.id, 0)).rejects.toThrow();
    await expect(repo.recordUsage(item.id, 10.5)).rejects.toThrow();
    const noBalance = await repo.createItem(emptyDraft({ storeName: 'Spa voucher' }));
    await expect(repo.recordUsage(noBalance.id, 100)).rejects.toThrow('no tracked balance');
  });

  it('sets balance directly with an adjustment event', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Nike', amountMinor: 30000 }));
    const updated = await repo.setBalance(item.id, 25000, 'Checked online');
    expect(updated.balanceMinor).toBe(25000);
    const [latest] = await repo.listEvents(item.id);
    expect(latest).toMatchObject({ type: 'adjustment', deltaMinor: -5000, balanceAfterMinor: 25000, note: 'Checked online' });
  });

  it('marks used and reactivates', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Mango', amountMinor: 15000 }));
    const used = await repo.markUsed(item.id);
    expect(used.status).toBe('used');
    expect(used.balanceMinor).toBe(0);
    const back = await repo.reactivate(item.id);
    expect(back.status).toBe('active');
    expect(back.balanceMinor).toBe(15000);
  });

  it('marks items created with a past expiry as expired, and sweeps overdue items', async () => {
    const { repo } = await setup();
    const past = await repo.createItem(emptyDraft({ storeName: 'Old', amountMinor: 100, expiryDate: addDays(todayIso(), -1) }));
    expect(past.status).toBe('expired');

    const soon = await repo.createItem(emptyDraft({ storeName: 'Soon', amountMinor: 100, expiryDate: todayIso() }));
    expect(soon.status).toBe('active');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(await repo.expireOverdue(tomorrow)).toEqual([soon.id]);
    expect((await repo.getItem(soon.id))?.status).toBe('expired');
    expect(await repo.expireOverdue(tomorrow)).toEqual([]);
  });

  it('updates fields, re-encrypts secrets and records balance adjustments', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Fox', amountMinor: 10000, code: 'OLD' }));
    const updated = await repo.updateItem(item.id, { storeName: 'פוקס', code: 'NEW', balanceMinor: 8000, notes: '  gift  ' });
    expect(updated.storeName).toBe('פוקס');
    expect(updated.code).toBe('NEW');
    expect(updated.balanceMinor).toBe(8000);
    expect(updated.notes).toBe('gift');
    const [latest] = await repo.listEvents(item.id);
    expect(latest).toMatchObject({ type: 'adjustment', deltaMinor: -2000 });

    const cleared = await repo.updateItem(item.id, { code: null });
    expect(cleared.code).toBeNull();
  });

  it('moving expiry into the future reactivates an expired item', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'X', amountMinor: 100, expiryDate: addDays(todayIso(), -3) }));
    expect(item.status).toBe('expired');
    const updated = await repo.updateItem(item.id, { expiryDate: addDays(todayIso(), 30) });
    expect(updated.status).toBe('active');
  });

  it('keeps archived cards archived when unrelated fields are edited', async () => {
    const { repo } = await setup();
    const voucher = await repo.createItem(emptyDraft({ storeName: 'Spa', expiryDate: addDays(todayIso(), 60) }));
    await repo.markUsed(voucher.id);
    // The edit form sends every field back, including the unchanged expiry date.
    const edited = await repo.updateItem(voucher.id, { notes: 'Used on my birthday', expiryDate: voucher.expiryDate, balanceMinor: null });
    expect(edited.status).toBe('used');

    const credit = await repo.createItem(emptyDraft({ storeName: 'Fox', amountMinor: 5000 }));
    await repo.recordUsage(credit.id, 5000);
    const renamed = await repo.updateItem(credit.id, { storeName: 'FOX', balanceMinor: 0 });
    expect(renamed.status).toBe('used');
    // Topping the balance back up does reactivate it.
    expect((await repo.updateItem(credit.id, { balanceMinor: 2000 })).status).toBe('active');
  });

  it('soft-deletes items and their attachments, wiping secrets', async () => {
    const { repo, db } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Zara', amountMinor: 100, code: 'C' }), [
      { fileName: 'a.jpg', mimeType: 'image/jpeg', kind: 'receipt' },
    ]);
    expect(await repo.listAttachments(item.id)).toHaveLength(1);
    await repo.deleteItem(item.id);
    expect(await repo.listItems()).toHaveLength(0);
    expect(await repo.listItems({ includeDeleted: true })).toHaveLength(1);
    expect(await repo.listAttachments(item.id)).toHaveLength(0);
    const raw = await db.get<{ code_enc: string | null; deleted_at: string | null }>(
      'SELECT code_enc, deleted_at FROM items WHERE id = ?',
      [item.id],
    );
    expect(raw?.code_enc).toBeNull();
    expect(raw?.deleted_at).not.toBeNull();
  });

  it('manages attachments', async () => {
    const { repo } = await setup();
    const item = await repo.createItem(emptyDraft({ storeName: 'Castro', amountMinor: 100 }));
    const a = await repo.addAttachment(item.id, { fileName: 'r.pdf', mimeType: 'application/pdf', kind: 'document', sizeBytes: 1234 });
    expect(a).toMatchObject({ itemId: item.id, fileName: 'r.pdf', kind: 'document', sizeBytes: 1234 });
    expect((await repo.countAttachmentsByItem()).get(item.id)).toBe(1);
    await repo.removeAttachment(a.id);
    expect(await repo.listAttachments(item.id)).toHaveLength(0);
  });

  it('lists only active, unexpired items for reminders', async () => {
    const { repo } = await setup();
    await repo.createItem(emptyDraft({ storeName: 'A', amountMinor: 100 }));
    const used = await repo.createItem(emptyDraft({ storeName: 'B', amountMinor: 100 }));
    await repo.markUsed(used.id);
    await repo.createItem(emptyDraft({ storeName: 'C', amountMinor: 100, expiryDate: addDays(todayIso(), -1) }));
    expect((await repo.listActiveItems()).map((i) => i.storeName)).toEqual(['A']);
  });

  it('rolls back a failed transaction', async () => {
    const { repo, db } = await setup();
    await expect(
      db.transaction(async (tx) => {
        await tx.run("INSERT INTO kv (key, value, updated_at) VALUES ('x', '1', 'now')");
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await db.get('SELECT * FROM kv WHERE key = ?', ['x'])).toBeNull();
    expect(repo).toBeDefined();
  });
});

describe('KvRepository', () => {
  it('stores JSON values', async () => {
    const { db } = await setup();
    const kv = new KvRepository(db);
    expect(await kv.get('settings')).toBeNull();
    await kv.set('settings', { a: 1, b: [1, 2] });
    expect(await kv.get('settings')).toEqual({ a: 1, b: [1, 2] });
    await kv.set('settings', { a: 2 });
    expect(await kv.get('settings')).toEqual({ a: 2 });
    await kv.remove('settings');
    expect(await kv.get('settings')).toBeNull();
  });
});
