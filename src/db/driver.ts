/**
 * Minimal async SQL driver contract. The app uses expo-sqlite on device; tests
 * run the exact same repositories and migrations against sql.js (real SQLite
 * compiled to wasm). Keeping this seam small also makes it straightforward to
 * add a sync layer later without touching screens.
 */
export type SqlValue = string | number | null;

export interface SqlExecutor {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<{ changes: number }>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | null>;
}

export interface SqlDriver extends SqlExecutor {
  /** Runs `fn` inside a transaction; only statements issued through `tx` are part of it. */
  transaction<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}
