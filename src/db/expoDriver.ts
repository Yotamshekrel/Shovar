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

export async function openExpoDriver(name = 'shvar.db'): Promise<SqlDriver> {
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
