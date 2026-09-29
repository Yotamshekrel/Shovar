import { randomUUID } from 'node:crypto';

import { migrate } from '@/db/migrations';
import type { Item } from '@/domain/types';
import { cellCenter, cellKey, distanceMeters, isValidCoordinate, roundDistance } from '@/location/geo';
import { REFRESH_REGION_ID, maxRegionsFor, parseStoreRegionId, planGeofences, storeRegionId } from '@/location/geofencePlanner';
import { nearbyStores, nearestCredit } from '@/location/nearest';
import { eligibleItemsForStore, formatDistance, nearbyNotificationContent } from '@/location/nearbyAlert';
import { createGooglePlacesProvider } from '@/location/places/google';
import { buildOverpassQuery, createOverpassProvider } from '@/location/places/overpass';
import { PlacesCache } from '@/location/places/placesCache';
import { storeQueries } from '@/location/storeQueries';
import { storeKey } from '@/search/brands';

import { createTestDriver } from '../support/sqljsDriver';

// Real places in Tel Aviv.
const AZRIELI = { lat: 32.0741, lng: 34.7922 };
const DIZENGOFF_CENTER = { lat: 32.0754, lng: 34.7753 };
const RAMAT_AVIV_MALL = { lat: 32.1123, lng: 34.7957 };
const JERUSALEM = { lat: 31.7683, lng: 35.2137 };

function item(storeName: string, p: Partial<Item> = {}): Item {
  return {
    id: randomUUID(),
    type: 'store_credit',
    storeName,
    storeCategory: null,
    storeLogoUri: null,
    initialAmountMinor: 12000,
    balanceMinor: 12000,
    currency: 'ILS',
    expiryDate: null,
    purchaseDate: null,
    code: null,
    pin: null,
    barcodeFormat: 'code128',
    linkUrl: null,
    notes: null,
    status: 'active',
    source: 'manual',
    locationMuted: false,
    pinnedLat: null,
    pinnedLng: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    deletedAt: null,
    ...p,
  };
}

describe('geo', () => {
  it('computes great-circle distances', () => {
    expect(distanceMeters(AZRIELI, DIZENGOFF_CENTER)).toBeGreaterThan(1500);
    expect(distanceMeters(AZRIELI, DIZENGOFF_CENTER)).toBeLessThan(1700);
    expect(distanceMeters(AZRIELI, JERUSALEM) / 1000).toBeCloseTo(52.3, 0);
    expect(distanceMeters(AZRIELI, AZRIELI)).toBe(0);
  });

  it('buckets positions into ~11 km cache cells', () => {
    expect(cellKey(AZRIELI)).toBe(cellKey(DIZENGOFF_CENTER));
    expect(cellKey(AZRIELI)).not.toBe(cellKey(JERUSALEM));
    expect(distanceMeters(cellCenter(cellKey(AZRIELI)), AZRIELI)).toBeLessThan(8000);
  });

  it('rounds distances for notifications', () => {
    expect(roundDistance(147)).toEqual({ value: 150, unit: 'm' });
    expect(roundDistance(3)).toEqual({ value: 10, unit: 'm' });
    expect(roundDistance(1234)).toEqual({ value: 1.2, unit: 'km' });
    expect(formatDistance('en', 147)).toBe('150m');
    expect(formatDistance('he', 1234)).toBe('1.2 ק״מ');
    expect(isValidCoordinate({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidCoordinate(AZRIELI)).toBe(true);
  });
});

describe('planGeofences (nearest N + refresh boundary)', () => {
  const zara = storeKey('Zara');
  const many = Array.from({ length: 40 }, (_, i) => ({
    storeKey: i % 2 ? zara : storeKey('Castro'),
    placeId: `p${i}`,
    lat: AZRIELI.lat + i * 0.002,
    lng: AZRIELI.lng,
  }));

  it('respects the iOS limit of 20 regions (19 stores + refresh)', () => {
    const plan = planGeofences(AZRIELI, many, { maxRegions: maxRegionsFor('ios'), radiusM: 150 });
    expect(plan.regions).toHaveLength(20);
    expect(plan.storeRegions).toBe(19);
    expect(plan.regions.filter((r) => r.identifier === REFRESH_REGION_ID)).toHaveLength(1);
  });

  it('registers the nearest branches first', () => {
    const plan = planGeofences(AZRIELI, many, { maxRegions: 5, radiusM: 150 });
    const ids = plan.regions.filter((r) => r.identifier !== REFRESH_REGION_ID).map((r) => parseStoreRegionId(r.identifier)?.placeId);
    expect(ids).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(plan.regions.every((r) => r.identifier === REFRESH_REGION_ID || (r.radius === 150 && r.notifyOnEnter && !r.notifyOnExit))).toBe(
      true,
    );
  });

  it('sizes the refresh region from the furthest monitored branch (clamped)', () => {
    const plan = planGeofences(AZRIELI, many, { maxRegions: 5, radiusM: 150 });
    const refresh = plan.regions.find((r) => r.identifier === REFRESH_REGION_ID)!;
    expect(refresh).toMatchObject({ latitude: AZRIELI.lat, longitude: AZRIELI.lng, notifyOnEnter: false, notifyOnExit: true });
    expect(refresh.radius).toBe(1000); // furthest is ~670 m → half is below the 1 km minimum
    const none = planGeofences(AZRIELI, [], { maxRegions: 20, radiusM: 150 });
    expect(none.regions).toHaveLength(1);
    expect(none.refreshRadius).toBe(5000);
  });

  it('ignores far-away branches, duplicates and invalid coordinates', () => {
    const plan = planGeofences(
      AZRIELI,
      [
        { storeKey: zara, placeId: 'a', ...DIZENGOFF_CENTER },
        { storeKey: zara, placeId: 'a', ...DIZENGOFF_CENTER },
        { storeKey: zara, placeId: 'far', ...JERUSALEM },
        { storeKey: zara, placeId: 'bad', lat: Number.NaN, lng: 1 },
      ],
      { maxRegions: 20, radiusM: 200 },
    );
    expect(plan.storeRegions).toBe(1);
  });

  it('round-trips region identifiers, including ids with separators', () => {
    const id = storeRegionId('name:my shop', 'osm:node/123');
    expect(parseStoreRegionId(id)).toEqual({ storeKey: 'name:my shop', placeId: 'osm:node/123' });
    expect(parseStoreRegionId(REFRESH_REGION_ID)).toBeNull();
  });
});

describe('PlacesCache (SQLite)', () => {
  async function setup(now = new Date('2026-09-28T10:00:00Z')) {
    const db = await createTestDriver();
    await migrate(db);
    let clock = now;
    const cache = new PlacesCache(db, () => clock);
    return { cache, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  }

  it('stores branches per store/cell and expires lookups after the TTL', async () => {
    const { cache, advance } = await setup();
    const cell = cellKey(AZRIELI);
    expect(await cache.isFresh('brand:zara', cell)).toBe(false);
    await cache.save('brand:zara', cell, 'osm', [{ id: 'osm:node/1', name: 'Zara', address: null, ...AZRIELI, provider: 'osm' }]);
    expect(await cache.isFresh('brand:zara', cell)).toBe(true);
    expect(await cache.placesFor(['brand:zara'])).toHaveLength(1);
    // Empty results are remembered too.
    await cache.save('brand:castro', cell, 'osm', []);
    expect(await cache.isFresh('brand:castro', cell)).toBe(true);
    advance(31 * 86_400_000);
    expect(await cache.isFresh('brand:zara', cell)).toBe(false);
  });

  it('replaces results for the same cell on re-query', async () => {
    const { cache } = await setup();
    const cell = cellKey(AZRIELI);
    await cache.save('brand:zara', cell, 'osm', [{ id: 'osm:node/1', name: 'Zara', address: null, ...AZRIELI, provider: 'osm' }]);
    await cache.save('brand:zara', cell, 'osm', [
      { id: 'osm:node/2', name: 'Zara', address: 'Dizengoff', ...DIZENGOFF_CENTER, provider: 'osm' },
    ]);
    const places = await cache.placesFor(['brand:zara', 'brand:other']);
    expect(places.map((p) => p.address)).toEqual(['Dizengoff']);
  });

  it('enforces the per-store notification cooldown atomically', async () => {
    const { cache, advance } = await setup();
    expect(await cache.tryClaimAlert('brand:zara', 12)).toBe(true);
    expect(await cache.tryClaimAlert('brand:zara', 12)).toBe(false);
    expect(await cache.tryClaimAlert('brand:castro', 12)).toBe(true);
    advance(11 * 3_600_000);
    expect(await cache.tryClaimAlert('brand:zara', 12)).toBe(false);
    advance(2 * 3_600_000);
    expect(await cache.tryClaimAlert('brand:zara', 12)).toBe(true);
    expect(await cache.lastAlertAt('brand:zara')).not.toBeNull();
  });
});

describe('nearby reminder content', () => {
  it('groups Hebrew and English spellings of the same store and skips muted/used cards', () => {
    const items = [
      item('Zara', { balanceMinor: 8000 }),
      item('זארה', { balanceMinor: 4000 }),
      item('Zara', { locationMuted: true }),
      item('Zara', { status: 'used', balanceMinor: 0 }),
      item('Castro'),
    ];
    const eligible = eligibleItemsForStore(items, storeKey('Zara'));
    expect(eligible.map((i) => i.balanceMinor)).toEqual([8000, 4000]);
  });

  it('writes "You have ₪120 credit at Zara, 150m away."', () => {
    const c = nearbyNotificationContent(eligibleItemsForStore([item('Zara')], storeKey('Zara')), 147, 'en', 'en-US');
    expect(c).toMatchObject({ title: 'Credit nearby', body: 'You have ₪120 credit at Zara, 150m away.' });
    expect(c?.data.url).toMatch(/^\/item\//);
  });

  it('sums multiple cards per currency and localizes to Hebrew', () => {
    const items = [
      item('Zara', { balanceMinor: 5000 }),
      item('Zara', { balanceMinor: 7000 }),
      item('Zara', { balanceMinor: 2000, currency: 'USD' }),
    ];
    const en = nearbyNotificationContent(items, 400, 'en', 'en-US');
    expect(en?.body).toBe('You have ₪120 + $20 credit at Zara, 400m away.');
    const he = nearbyNotificationContent([item('זארה')], 150, 'he', 'he-IL');
    expect(he?.title).toBe('זיכוי בקרבת מקום');
    expect(he?.body).toContain('ב־זארה');
    expect(he?.body).toContain('150 מ׳');
  });

  it('handles cards without an amount', () => {
    const c = nearbyNotificationContent([item('Spa', { balanceMinor: null, type: 'gift_card' })], 200, 'en', 'en-US');
    expect(c?.body).toBe('You have a gift card for Spa, 200m away.');
    expect(nearbyNotificationContent([], 100, 'en', 'en-US')).toBeNull();
  });
});

describe('store queries and nearest credit', () => {
  it('builds one query per store with every known spelling', () => {
    const q = storeQueries([item('Zara'), item('זארה'), item('My Shop'), item('Castro', { locationMuted: true })]);
    expect([...q.keys()].sort()).toEqual(['brand:zara', 'name:myshop']);
    expect(q.get('brand:zara')?.names).toEqual(expect.arrayContaining(['Zara', 'זארה']));
  });

  it('finds the closest branch per card, including pinned locations', () => {
    const a = item('Zara');
    const b = item('Local Shop', { pinnedLat: AZRIELI.lat + 0.001, pinnedLng: AZRIELI.lng });
    const c = item('Castro');
    const result = nearestCredit(
      [a, b, c],
      [
        { storeKey: storeKey('Zara'), ...DIZENGOFF_CENTER },
        { storeKey: storeKey('Zara'), ...RAMAT_AVIV_MALL },
        { storeKey: storeKey('Castro'), ...JERUSALEM },
      ],
      AZRIELI,
    );
    expect(result.map((r) => r.item.storeName)).toEqual(['Local Shop', 'Zara']);
    expect(result[1].distanceM).toBeLessThan(1700);
  });
});

describe('places providers', () => {
  it('Google Places: sends the text query with a location bias and filters far results', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fakeFetch = async (url: string, init?: RequestInit) => {
      calls.push({ url, init: init! });
      return new Response(
        JSON.stringify({
          places: [
            {
              id: 'A',
              displayName: { text: 'ZARA Azrieli' },
              formattedAddress: 'Derech Menachem Begin 132',
              location: { latitude: AZRIELI.lat, longitude: AZRIELI.lng },
            },
            { id: 'B', displayName: { text: 'ZARA Jerusalem' }, location: { latitude: JERUSALEM.lat, longitude: JERUSALEM.lng } },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const provider = createGooglePlacesProvider('test-key', fakeFetch);
    const res = await provider.searchStore({ storeKey: 'brand:zara', names: ['Zara', 'זארה'] }, DIZENGOFF_CENTER, 12000);
    expect(res).toEqual([
      {
        id: 'google:A',
        name: 'ZARA Azrieli',
        address: 'Derech Menachem Begin 132',
        lat: AZRIELI.lat,
        lng: AZRIELI.lng,
        provider: 'google',
      },
    ]);
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['X-Goog-Api-Key']).toBe('test-key');
    expect(headers['X-Goog-FieldMask']).toContain('places.location');
    const body = JSON.parse(String(calls[0].init.body));
    expect(body.textQuery).toBe('Zara');
    expect(body.locationBias.circle.radius).toBe(12000);
  });

  it('Overpass: matches name/brand/localized names around the area', async () => {
    const q = buildOverpassQuery(['Zara', 'זארה', 'H&M (TLV)'], AZRIELI, 12000);
    expect(q).toContain('nwr["brand"~"^(Zara|זארה|H&M \\\\(TLV\\\\))$",i](around:12000,32.07410,34.79220);');
    expect(q).toContain('nwr["name:he"~');
    const fakeFetch = async () =>
      new Response(
        JSON.stringify({
          elements: [
            {
              type: 'node',
              id: 1,
              lat: AZRIELI.lat,
              lon: AZRIELI.lng,
              tags: { name: 'Zara', 'addr:street': 'Begin', 'addr:housenumber': '132', 'addr:city': 'Tel Aviv' },
            },
            { type: 'way', id: 2, center: { lat: DIZENGOFF_CENTER.lat, lon: DIZENGOFF_CENTER.lng }, tags: { brand: 'Zara' } },
            { type: 'node', id: 3, lat: JERUSALEM.lat, lon: JERUSALEM.lng },
          ],
        }),
        { status: 200 },
      );
    const res = await createOverpassProvider(fakeFetch, ['https://test/api']).searchStore(
      { storeKey: 'brand:zara', names: ['Zara'] },
      AZRIELI,
      12000,
    );
    expect(res.map((r) => r.id)).toEqual(['osm:node/1', 'osm:way/2']);
    expect(res[0].address).toBe('Begin 132, Tel Aviv');
  });

  it('falls back to the next Overpass instance and sends a User-Agent', async () => {
    const seen: string[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      seen.push(url);
      expect((init?.headers as Record<string, string>)['User-Agent']).toMatch(/^Shovar\//);
      if (url.includes('primary')) return new Response('busy', { status: 429 });
      return new Response(JSON.stringify({ elements: [{ type: 'node', id: 9, lat: AZRIELI.lat, lon: AZRIELI.lng }] }), { status: 200 });
    };
    const res = await createOverpassProvider(fetchImpl, ['https://primary/api', 'https://mirror/api']).searchStore(
      { storeKey: 'brand:zara', names: ['Zara'] },
      AZRIELI,
      1000,
    );
    expect(seen).toEqual(['https://primary/api', 'https://mirror/api']);
    expect(res.map((r) => r.id)).toEqual(['osm:node/9']);
  });

  it('surfaces errors when every instance fails so the caller can retry later', async () => {
    const failing = async () => new Response('nope', { status: 429 });
    await expect(
      createOverpassProvider(failing, ['https://a', 'https://b']).searchStore({ storeKey: 'x', names: ['x'] }, AZRIELI, 1000),
    ).rejects.toThrow('429');
  });
});

describe('nearbyStores (what’s around me)', () => {
  it('groups cards per store, uses the closest branch and drops far stores', () => {
    const z1 = item('Zara', { balanceMinor: 5000 });
    const z2 = item('Zara', { balanceMinor: 2000 });
    const far = item('Castro', { balanceMinor: 1000 });
    const places = [
      { storeKey: storeKey('Zara'), address: 'Azrieli', ...AZRIELI },
      { storeKey: storeKey('Zara'), address: 'Ramat Aviv', ...RAMAT_AVIV_MALL },
      { storeKey: storeKey('Castro'), address: 'Jerusalem', ...JERUSALEM },
    ];
    const res = nearbyStores([z1, z2, far], places, DIZENGOFF_CENTER);
    expect(res).toHaveLength(1);
    expect(res[0].items).toHaveLength(2);
    expect(res[0].address).toBe('Azrieli');
    expect(res[0].distanceM).toBeLessThan(2000);
  });
});
