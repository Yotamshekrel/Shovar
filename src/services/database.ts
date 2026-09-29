import * as Crypto from 'expo-crypto';

import type { SqlDriver } from '@/db/driver';
import { backupDatabase, openExpoDriver } from '@/db/expoDriver';
import { ItemRepository } from '@/db/itemRepository';
import { KvRepository } from '@/db/kvRepository';
import { migrate } from '@/db/migrations';
import { getFieldCipher } from '@/security/keyStore';

export interface Services {
  db: SqlDriver;
  items: ItemRepository;
  kv: KvRepository;
}

let servicesPromise: Promise<Services> | null = null;

/**
 * Lazily opens the database, runs migrations and wires repositories.
 * Safe to call from UI code and from background tasks (same JS runtime).
 */
export function getServices(): Promise<Services> {
  servicesPromise ??= (async () => {
    const db = await openExpoDriver();
    await migrate(db, { onBeforeMigrate: (from) => backupDatabase(db, from) });
    const cipher = await getFieldCipher();
    return {
      db,
      items: new ItemRepository({ db, cipher, newId: () => Crypto.randomUUID() }),
      kv: new KvRepository(db),
    };
  })().catch((e) => {
    servicesPromise = null;
    throw e;
  });
  return servicesPromise;
}
