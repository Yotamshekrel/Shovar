import type { SqlDriver } from './driver';

/**
 * Forward-only schema migrations, tracked with `PRAGMA user_version`.
 * Never edit a released migration; append a new one instead.
 */
export const MIGRATIONS: { version: number; sql: string }[] = [
  {
    version: 1,
    sql: `
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('gift_card','store_credit')),
  store_name TEXT NOT NULL,
  store_key TEXT NOT NULL,
  store_category TEXT,
  store_logo_uri TEXT,
  initial_amount_minor INTEGER,
  balance_minor INTEGER,
  currency TEXT NOT NULL DEFAULT 'ILS',
  expiry_date TEXT,
  purchase_date TEXT,
  code_enc TEXT,
  pin_enc TEXT,
  barcode_format TEXT NOT NULL DEFAULT 'code128',
  link_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired')),
  source TEXT NOT NULL DEFAULT 'manual',
  location_muted INTEGER NOT NULL DEFAULT 0,
  pinned_lat REAL,
  pinned_lng REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_items_status ON items(status, deleted_at);
CREATE INDEX IF NOT EXISTS idx_items_store_key ON items(store_key);
CREATE INDEX IF NOT EXISTS idx_items_updated ON items(updated_at);

CREATE TABLE IF NOT EXISTS balance_events (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  delta_minor INTEGER NOT NULL DEFAULT 0,
  balance_after_minor INTEGER,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_balance_events_item ON balance_events(item_id, created_at);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'receipt',
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_attachments_item ON attachments(item_id);

CREATE TABLE IF NOT EXISTS kv (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_places (
  id TEXT PRIMARY KEY NOT NULL,
  store_key TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  provider TEXT NOT NULL,
  cell_key TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_store_places_store ON store_places(store_key);
CREATE INDEX IF NOT EXISTS idx_store_places_cell ON store_places(cell_key);

CREATE TABLE IF NOT EXISTS store_place_queries (
  store_key TEXT NOT NULL,
  cell_key TEXT NOT NULL,
  provider TEXT NOT NULL,
  result_count INTEGER NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (store_key, cell_key)
);

CREATE TABLE IF NOT EXISTS location_alerts (
  store_key TEXT PRIMARY KEY NOT NULL,
  last_notified_at TEXT NOT NULL
);
`,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export interface MigrateOptions {
  /** Called once before any pending migration touches an existing (non-empty) database. */
  onBeforeMigrate?: (from: number, to: number) => Promise<void>;
}

/**
 * Brings the database to the latest schema without ever discarding data:
 * migrations only add or transform, run inside a transaction, and a database
 * written by a *newer* app version (e.g. after a downgrade) is left untouched.
 */
export async function migrate(db: SqlDriver, opts: MigrateOptions = {}): Promise<number> {
  await db.exec('PRAGMA foreign_keys = ON;');
  const row = await db.get<{ user_version: number }>('PRAGMA user_version;');
  let current = row?.user_version ?? 0;
  const latest = MIGRATIONS[MIGRATIONS.length - 1].version;
  if (current > latest) return current;

  const pending = MIGRATIONS.filter((m) => m.version > current);
  if (pending.length > 0 && current > 0 && opts.onBeforeMigrate) {
    try {
      await opts.onBeforeMigrate(current, latest);
    } catch (e) {
      // A failed safety copy must not block the app, but it should be visible in logs.
      console.warn('[db] pre-migration backup failed', e);
    }
  }
  for (const m of pending) {
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.exec(`PRAGMA user_version = ${m.version};`);
    });
    current = m.version;
  }
  return current;
}
