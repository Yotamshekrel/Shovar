import { Directory, File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import type { SqlDriver, SqlExecutor, SqlValue } from './driver';

function wrap(db: SQLite.SQLiteDatabase): SqlExecutor {
  return {
    async exec(sql) {
      await db.execAsync(sql);
    },
    async run(sql, params: SqlValue[] = []) {
      const r = await db.runAsync(sql, params);
      return { changes: r.changes };
    },
    all<T>(sql: string, params: SqlValue[] = []) {
      return db.getAllAsync<T>(sql, params);
    },
    get<T>(sql: string, params: SqlValue[] = []) {
      return db.getFirstAsync<T>(sql, params);
    },
  };
}

/**
 * PERSISTENT IDENTIFIER — never rename. The database file name (like the bundle
 * id / package name, the keychain key names and the attachments folder) is what
 * ties an updated app to the data the previous version wrote.
 */
export const DATABASE_NAME = 'shvar.db';

export async function openExpoDriver(name = DATABASE_NAME): Promise<SqlDriver> {
  const db = await SQLite.openDatabaseAsync(name);
  if (Platform.OS !== 'web') {
    await db.execAsync('PRAGMA journal_mode = WAL;');
  }
  const base = wrap(db);
  return {
    ...base,
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      let result: T | undefined;
      if (Platform.OS === 'web') {
        await db.withTransactionAsync(async () => {
          result = await fn(base);
        });
      } else {
        await db.withExclusiveTransactionAsync(async (txn) => {
          result = await fn(wrap(txn));
        });
      }
      return result as T;
    },
  };
}

/**
 * Copies the database file next to itself before a schema migration runs
 * (`shvar.db.pre-v<from>.bak`, keeping only the most recent one), so a bad
 * migration can never cost the user their wallet. Native only.
 */
export async function backupDatabase(db: SqlDriver, from: number, name = DATABASE_NAME): Promise<void> {
  if (Platform.OS === 'web') return;
  await db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
  const dir = SQLite.defaultDatabaseDirectory;
  const base = dir.startsWith('file://') ? dir : `file://${dir}`;
  const source = new File(base, name);
  if (!source.exists) return;
  for (const f of new Directory(base).list()) {
    if (f instanceof File && f.name.startsWith(`${name}.pre-v`)) f.delete();
  }
  source.copy(new File(base, `${name}.pre-v${from}.bak`));
}
