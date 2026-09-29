import { randomUUID } from 'node:crypto';

import { ItemRepository } from '@/db/itemRepository';
import { KvRepository } from '@/db/kvRepository';
import { LATEST_VERSION, MIGRATIONS, migrate } from '@/db/migrations';
import { emptyDraft } from '@/domain/types';
import { SETTINGS_KEY, sanitizeSettings } from '@/state/settings';

import { createTestDriver } from '../support/sqljsDriver';
import { createTestCipher } from '../support/testCipher';

/** An "app update" that ships a new schema version on top of the current one. */
const FUTURE = { version: LATEST_VERSION + 1, sql: 'ALTER TABLE items ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;' };

afterEach(() => {
  while (MIGRATIONS[MIGRATIONS.length - 1].version > LATEST_VERSION) MIGRATIONS.pop();
});

describe('updating the app keeps the user’s data', () => {
  it('preserves items, encrypted codes, history and settings across a schema migration', async () => {
    const db = await createTestDriver();
    await migrate(db);
    const cipher = createTestCipher(); // same key before and after the update
    const before = new ItemRepository({ db, cipher, newId: randomUUID });
    const item = await before.createItem(emptyDraft({ storeName: 'Zara', amountMinor: 12000, code: '4470-2291', pin: '1234' }), [
      { fileName: 'r.jpg', mimeType: 'image/jpeg', kind: 'receipt' },
    ]);
    await before.recordUsage(item.id, 2500, 'T-shirt');
    await new KvRepository(db).set(SETTINGS_KEY, { language: 'he', onboardingDone: true, biometricLock: true });

    // --- the app is updated: a new migration ships ---
    MIGRATIONS.push(FUTURE);
    const backedUp: [number, number][] = [];
    expect(await migrate(db, { onBeforeMigrate: async (from, to) => void backedUp.push([from, to]) })).toBe(FUTURE.version);
    expect(backedUp).toEqual([[LATEST_VERSION, FUTURE.version]]);

    const after = new ItemRepository({ db, cipher, newId: randomUUID });
    const kept = await after.getItem(item.id);
    expect(kept).toMatchObject({ storeName: 'Zara', balanceMinor: 9500, code: '4470-2291', pin: '1234' });
    expect((await after.listEvents(item.id)).map((e) => e.type)).toEqual(['usage', 'created']);
    expect(await after.listAttachments(item.id)).toHaveLength(1);
    expect(await db.get('SELECT favorite FROM items WHERE id = ?', [item.id])).toEqual({ favorite: 0 });

    const settings = sanitizeSettings(await new KvRepository(db).get(SETTINGS_KEY));
    expect(settings).toMatchObject({ language: 'he', onboardingDone: true, biometricLock: true });
    // Settings added by a newer version take their defaults instead of wiping the old ones.
    expect(settings.expiryReminderDays).toEqual([14, 3]);
  });

  it('is a no-op (and takes no backup) when the database is already current', async () => {
    const db = await createTestDriver();
    await migrate(db);
    const backup = jest.fn();
    expect(await migrate(db, { onBeforeMigrate: backup })).toBe(LATEST_VERSION);
    expect(backup).not.toHaveBeenCalled();
  });

  it('does not back up a brand-new database', async () => {
    const db = await createTestDriver();
    const backup = jest.fn();
    await migrate(db, { onBeforeMigrate: backup });
    expect(backup).not.toHaveBeenCalled();
  });

  it('never blocks the update if the safety backup fails', async () => {
    const db = await createTestDriver();
    await migrate(db);
    MIGRATIONS.push(FUTURE);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(migrate(db, { onBeforeMigrate: async () => Promise.reject(new Error('disk full')) })).resolves.toBe(FUTURE.version);
    warn.mockRestore();
  });

  it('rolls a failing migration back completely, leaving the data as it was', async () => {
    const db = await createTestDriver();
    await migrate(db);
    const repo = new ItemRepository({ db, cipher: createTestCipher(), newId: randomUUID });
    const item = await repo.createItem(emptyDraft({ storeName: 'Fox', amountMinor: 5000 }));
    MIGRATIONS.push({
      version: FUTURE.version,
      sql: 'ALTER TABLE items ADD COLUMN ok INTEGER; ALTER TABLE no_such_table ADD COLUMN x INTEGER;',
    });
    await expect(migrate(db)).rejects.toThrow();
    expect((await db.get<{ user_version: number }>('PRAGMA user_version;'))?.user_version).toBe(LATEST_VERSION);
    expect((await repo.getItem(item.id))?.storeName).toBe('Fox');
    expect(await db.all('SELECT name FROM pragma_table_info("items") WHERE name = "ok"')).toEqual([]);
  });

  it('leaves a database from a newer app version untouched (downgrade safety)', async () => {
    const db = await createTestDriver();
    await migrate(db);
    await db.exec(`PRAGMA user_version = ${LATEST_VERSION + 5};`);
    expect(await migrate(db)).toBe(LATEST_VERSION + 5);
    expect(await db.get('SELECT name FROM sqlite_master WHERE name = "items"')).not.toBeNull();
  });
});
