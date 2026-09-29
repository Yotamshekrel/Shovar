import { nowIso } from '@/domain/dates';

import type { SqlDriver } from './driver';

/** JSON key-value store living in the same SQLite DB (readable from background tasks). */
export class KvRepository {
  constructor(private readonly db: SqlDriver) {}

  async get<T>(key: string): Promise<T | null> {
    const row = await this.db.get<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
    if (!row) return null;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await this.db.run(
      'INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
      [key, JSON.stringify(value), nowIso()],
    );
  }

  async remove(key: string): Promise<void> {
    await this.db.run('DELETE FROM kv WHERE key = ?', [key]);
  }
}
