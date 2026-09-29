import initSqlJs, { type Database } from 'sql.js';

import type { SqlDriver, SqlExecutor, SqlValue } from '@/db/driver';

let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null;

function executor(db: Database): SqlExecutor {
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params: SqlValue[] = []) {
      db.run(sql, params);
      return { changes: db.getRowsModified() };
    },
    async all<T>(sql: string, params: SqlValue[] = []) {
      const stmt = db.prepare(sql);
      try {
        stmt.bind(params);
        const rows: T[] = [];
        while (stmt.step()) rows.push(stmt.getAsObject() as T);
        return rows;
      } finally {
        stmt.free();
      }
    },
    async get<T>(sql: string, params: SqlValue[] = []) {
      const rows = await this.all<T>(sql, params);
      return rows[0] ?? null;
    },
  };
}

/** In-memory SQLite (wasm) implementing the same driver contract as expo-sqlite. */
export async function createTestDriver(): Promise<SqlDriver & { raw: Database }> {
  SQL ??= await initSqlJs();
  const db = new SQL.Database();
  const base = executor(db);
  return {
    ...base,
    raw: db,
    async transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T> {
      db.exec('BEGIN');
      try {
        const result = await fn(base);
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
