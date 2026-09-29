import type { SqlDriver } from '@/db/driver';

import type { PlaceResult, PlacesProviderName } from './types';

export const PLACES_TTL_DAYS = 30;

interface PlaceRow {
  id: string;
  store_key: string;
  name: string;
  address: string | null;
  lat: number;
  lng: number;
  provider: PlacesProviderName;
  cell_key: string;
  fetched_at: string;
}

export interface CachedPlace extends PlaceResult {
  storeKey: string;
  cellKey: string;
  fetchedAt: string;
}

/**
 * Store branch locations cached per (store, ~11 km cell). A lookup is recorded
 * even when nothing is found, so we don't hit the places API again for a month.
 */
export class PlacesCache {
  constructor(
    private readonly db: SqlDriver,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** True if this store was looked up in this cell within the TTL. */
  async isFresh(storeKey: string, cellKey: string, ttlDays = PLACES_TTL_DAYS): Promise<boolean> {
    const row = await this.db.get<{ fetched_at: string }>(
      'SELECT fetched_at FROM store_place_queries WHERE store_key = ? AND cell_key = ?',
      [storeKey, cellKey],
    );
    if (!row) return false;
    return this.now().getTime() - new Date(row.fetched_at).getTime() < ttlDays * 86_400_000;
  }

  async save(storeKey: string, cellKey: string, provider: PlacesProviderName, places: PlaceResult[]): Promise<void> {
    const at = this.now().toISOString();
    await this.db.transaction(async (tx) => {
      await tx.run('DELETE FROM store_places WHERE store_key = ? AND cell_key = ? AND provider != ?', [storeKey, cellKey, 'pinned']);
      for (const p of places) {
        await tx.run(
          `INSERT INTO store_places (id, store_key, name, address, lat, lng, provider, cell_key, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET store_key = excluded.store_key, name = excluded.name, address = excluded.address,
             lat = excluded.lat, lng = excluded.lng, cell_key = excluded.cell_key, fetched_at = excluded.fetched_at`,
          [`${storeKey}|${p.id}`, storeKey, p.name, p.address, p.lat, p.lng, provider, cellKey, at],
        );
      }
      await tx.run(
        `INSERT INTO store_place_queries (store_key, cell_key, provider, result_count, fetched_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(store_key, cell_key) DO UPDATE SET provider = excluded.provider, result_count = excluded.result_count, fetched_at = excluded.fetched_at`,
        [storeKey, cellKey, provider, places.length, at],
      );
    });
  }

  async placesFor(storeKeys: string[]): Promise<CachedPlace[]> {
    if (storeKeys.length === 0) return [];
    const marks = storeKeys.map(() => '?').join(',');
    const rows = await this.db.all<PlaceRow>(`SELECT * FROM store_places WHERE store_key IN (${marks})`, storeKeys);
    return rows.map((r) => ({
      id: r.id,
      storeKey: r.store_key,
      name: r.name,
      address: r.address,
      lat: r.lat,
      lng: r.lng,
      provider: r.provider,
      cellKey: r.cell_key,
      fetchedAt: r.fetched_at,
    }));
  }

  async clear(): Promise<void> {
    await this.db.exec('DELETE FROM store_places; DELETE FROM store_place_queries;');
  }

  // ------------------------------------------------------------ cooldowns

  async lastAlertAt(storeKey: string): Promise<Date | null> {
    const row = await this.db.get<{ last_notified_at: string }>('SELECT last_notified_at FROM location_alerts WHERE store_key = ?', [
      storeKey,
    ]);
    return row ? new Date(row.last_notified_at) : null;
  }

  /**
   * Atomically claims the right to alert for a store: returns false if an alert
   * was sent within the cooldown (e.g. two geofences of the same chain fired).
   */
  async tryClaimAlert(storeKey: string, cooldownHours: number): Promise<boolean> {
    const now = this.now();
    const threshold = new Date(now.getTime() - cooldownHours * 3_600_000).toISOString();
    let claimed = false;
    await this.db.transaction(async (tx) => {
      const row = await tx.get<{ last_notified_at: string }>('SELECT last_notified_at FROM location_alerts WHERE store_key = ?', [
        storeKey,
      ]);
      if (row && row.last_notified_at > threshold) return;
      await tx.run(
        'INSERT INTO location_alerts (store_key, last_notified_at) VALUES (?, ?) ON CONFLICT(store_key) DO UPDATE SET last_notified_at = excluded.last_notified_at',
        [storeKey, now.toISOString()],
      );
      claimed = true;
    });
    return claimed;
  }
}
