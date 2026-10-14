import { randomUUID } from 'node:crypto';

import { ItemRepository } from '@/db/itemRepository';
import { migrate } from '@/db/migrations';
import { emptyDraft, type Item } from '@/domain/types';
import { planGeofences } from '@/location/geofencePlanner';
import { eligibleItemsForStore, nearbyNotificationContent } from '@/location/nearbyAlert';
import { nearbyStores, nearestCredit } from '@/location/nearest';
import { storeQueries } from '@/location/storeQueries';
import { NO_NETWORK, canonicalStoreKey, defaultNetworkId, networkIdFor, networkStores, networksForPlatform } from '@/networks/registry';
import { buildIndex, searchItems } from '@/search/searchIndex';

import { createTestDriver } from '../support/sqljsDriver';
import { createTestCipher } from '../support/testCipher';

const HERE = { lat: 32.0741, lng: 34.7922 };
const NEAR = { lat: 32.0755, lng: 34.7922 }; // ~150 m north
const FAR = { lat: 32.2, lng: 34.9 };

function item(storeName: string, p: Partial<Item> = {}): Item {
  return {
    id: randomUUID(),
    type: 'gift_card',
    storeName,
    storeCategory: null,
    storeLogoUri: null,
    initialAmountMinor: 20000,
    balanceMinor: 20000,
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

const place = (storeKey: string, at = NEAR, id = `${storeKey}-1`) => ({ storeKey, id, address: 'Dizengoff 1', lat: at.lat, lng: at.lng });

describe('network registry', () => {
  it('gives every platform with a store list a default network and card types', () => {
    expect(defaultNetworkId('buyme')).toBe('buyme_all');
    expect(networksForPlatform('buyme').map((n) => n.id)).toEqual(['buyme_all', 'buyme_total', 'buyme_style', 'buyme_brunch']);
    expect(networksForPlatform('max')).toHaveLength(4);
    expect(defaultNetworkId('zara')).toBeNull();
  });

  it('resolves a card’s network: explicit choice, platform default, opt-out, or none', () => {
    expect(networkIdFor({ storeName: 'BuyMe', network: null })).toBe('buyme_all');
    expect(networkIdFor({ storeName: 'ביימי', network: 'buyme_total' })).toBe('buyme_total');
    expect(networkIdFor({ storeName: 'תו הזהב', network: undefined })).toBe('tavzahav');
    expect(networkIdFor({ storeName: 'BuyMe', network: NO_NETWORK })).toBeNull();
    expect(networkIdFor({ storeName: 'Zara', network: null })).toBeNull();
    // A platform without a scraped list (Tav HaMutag) behaves like a plain card.
    expect(networkIdFor({ storeName: 'תו המותג', network: null })).toBeNull();
    expect(networkIdFor({ storeName: 'Zara', network: 'nonsense' })).toBeNull();
  });

  it('collapses Hebrew, English and sub-brand spellings of one store into one key', () => {
    expect(canonicalStoreKey('קסטרו')).toBe('brand:castro');
    expect(canonicalStoreKey('CASTRO')).toBe('brand:castro');
    const tavZahav = networkStores('tavzahav').map((s) => s.key);
    expect(tavZahav).toContain('brand:castro');
    expect(tavZahav.filter((k) => k === 'brand:fox')).toHaveLength(1); // "פוקס גברים/נשים/ילדים" are one chain
    expect(networkStores('buyme_all').map((s) => s.key)).toContain('brand:castro');
  });

  it('only looks up physical chains — not booking-only venues or the long tail of big lists', () => {
    const all = networkStores('buyme_all');
    const total = networkStores('buyme_total');
    expect(all.length).toBeGreaterThan(1000);
    const located = all.filter((s) => s.locatable);
    expect(located.length).toBeGreaterThan(20);
    expect(located.length).toBeLessThan(all.length / 5);
    expect(all.find((s) => s.name === 'ASA Izakaya')?.locatable).toBe(false); // needs a booking
    expect(located.map((s) => s.key)).toContain('brand:castro');
    expect(total.every((s) => s.locatable)).toBe(true); // curated chain list
  });
});

describe('BuyMe Brunch', () => {
  it('lists the brunch venues; cafes are looked up, booking-only restaurants are not', () => {
    const stores = networkStores('buyme_brunch');
    expect(stores).toHaveLength(60);
    expect(stores.find((s) => s.name === 'קפה גרג')?.locatable).toBe(true); // "selected branches of the Cafe Greg chain"
    expect(stores.find((s) => s.name === 'Mashya')?.locatable).toBe(false); // needs a booking
    expect(networkStores('buyme_brunch').find((s) => s.name === 'קפה קפה')?.key).toBe('brand:cafecafe');
  });

  it('finds a brunch card by one of its venues', () => {
    const brunch = item('BuyMe', { network: 'buyme_brunch' });
    // Cross-script: the Hebrew spelling finds a venue the list writes in Latin letters.
    expect(searchItems(buildIndex([brunch]), 'טימותי')[0]?.via).toBe('Timothy Cafe');
    expect(searchItems(buildIndex([brunch]), 'קפה בוקה')[0]?.item).toBe(brunch);
  });
});

describe('store queries for multi-store cards', () => {
  it('searches the network’s stores, never the platform name', () => {
    const q = storeQueries([item('BuyMe')]);
    expect(q.has('brand:buyme')).toBe(false);
    expect(q.get('brand:castro')?.names).toEqual(expect.arrayContaining(['Castro', 'קסטרו']));
    expect(q.size).toBeGreaterThan(50);
  });

  it('ranks the stores of your own cards first, then well-known chains', () => {
    const q = [...storeQueries([item('BuyMe'), item('Zara')]).values()];
    expect(q[0]).toMatchObject({ storeKey: 'brand:zara', rank: 0 });
    expect(q.slice(1).every((x) => (x.rank ?? 0) > 0)).toBe(true);
    // Chains listed by many networks come before one-off venues.
    const rank = (k: string) => q.find((x) => x.storeKey === k)!.rank!;
    expect(rank('brand:castro')).toBeLessThanOrEqual(rank(q[q.length - 1].storeKey));
  });

  it('skips muted, used and zero-balance multi-store cards', () => {
    expect(storeQueries([item('BuyMe', { locationMuted: true }), item('BuyMe', { balanceMinor: 0 })]).size).toBe(0);
  });

  it('a platform without a list is still looked up by its own name', () => {
    expect([...storeQueries([item('תו המותג')]).keys()]).toEqual(['brand:tavhamutag']);
  });
});

describe('around me with multi-store cards', () => {
  it('shows the store you are near, with the card that works there', () => {
    const buyme = item('BuyMe');
    const stores = nearbyStores([buyme], [place('brand:castro'), place('brand:fox', FAR)], HERE);
    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({ storeKey: 'brand:castro', storeNameEn: 'Castro', storeNameHe: 'קסטרו', address: 'Dizengoff 1' });
    expect(stores[0].items).toEqual([buyme]);
    expect(stores[0].distanceM).toBeLessThan(300);
  });

  it('merges a store-specific card and a multi-store card at the same store, specific card first', () => {
    const buyme = item('BuyMe');
    const castro = item('Castro', { balanceMinor: 5000 });
    const [store] = nearbyStores([buyme, castro], [place('brand:castro')], HERE);
    expect(store.items.map((i) => i.storeName)).toEqual(['Castro', 'BuyMe']);
    expect(store.storeName).toBe('Castro');
  });

  it('does not pin a location onto every store of a network', () => {
    const buyme = item('BuyMe', { pinnedLat: NEAR.lat, pinnedLng: NEAR.lng });
    expect(nearbyStores([buyme], [], HERE)).toEqual([]);
  });

  it('nearest credit reports where the multi-store card works', () => {
    const buyme = item('BuyMe');
    const [hit] = nearestCredit([buyme], [place('brand:castro')], HERE);
    expect(hit.item).toBe(buyme);
    expect(hit.group.nameEn).toBe('Castro');
    expect(hit.group.direct).toBe(false);
    expect(nearestCredit([buyme], [place('brand:castro', FAR)], HERE)).toEqual([]);
  });
});

describe('nearby reminders', () => {
  it('a geofence at a Castro branch alerts for a BuyMe card and names Castro', () => {
    const buyme = item('BuyMe');
    const other = item('Zara');
    const muted = item('BuyMe', { locationMuted: true });
    const eligible = eligibleItemsForStore([buyme, other, muted], 'brand:castro');
    expect(eligible).toEqual([buyme]);
    const content = nearbyNotificationContent(eligible, 150, 'en', 'en-US', 'Castro');
    expect(content?.body).toContain('at Castro');
    expect(content?.body).not.toContain('BuyMe');
    expect(eligibleItemsForStore([buyme], 'brand:zara')).toEqual([]);
  });

  it('prefers branches of stores you hold a card for when geofence slots are scarce', () => {
    const c = (storeKey: string, lat: number, distanceWeight?: number) => ({
      storeKey,
      placeId: `${storeKey}-p`,
      lat,
      lng: HERE.lng,
      distanceWeight,
    });
    const plan = planGeofences(HERE, [c('brand:castro', HERE.lat + 0.001, 2), c('brand:zara', HERE.lat + 0.0015)], {
      maxRegions: 2,
      radiusM: 150,
    });
    expect(plan.regions.map((r) => r.identifier)).toContain('store|brand:zara|brand:zara-p');
    expect(plan.regions.map((r) => r.identifier)).not.toContain('store|brand:castro|brand:castro-p');
  });
});

describe('search with multi-store cards', () => {
  const buyme = item('BuyMe');
  const tavZahav = item('תו הזהב');
  const zara = item('Zara');

  it('finds a card by any store it works at, in either language', () => {
    const index = buildIndex([buyme, zara]);
    for (const q of ['castro', 'קסטרו', 'Castro']) {
      const [hit] = searchItems(index, q);
      expect(hit.item).toBe(buyme);
      expect(hit.via).toBe('Castro · קסטרו');
    }
    expect(searchItems(index, 'zara').map((r) => r.item)).toEqual([zara]);
  });

  it('ranks a card for the store itself above a multi-store card that also works there', () => {
    const castro = item('Castro');
    const results = searchItems(buildIndex([buyme, tavZahav, castro]), 'castro');
    expect(results).toHaveLength(3);
    expect(results[0].item).toBe(castro);
    expect(results[0].via).toBeNull();
    expect(results.slice(1).every((r) => r.via)).toBe(true);
  });

  it('does not match on typos or unrelated names (long lists would be full of false hits)', () => {
    const index = buildIndex([buyme]);
    expect(searchItems(index, 'zzzqxv')).toEqual([]);
    expect(searchItems(index, 'castrp')).toEqual([]);
  });

  it('respects the card type: a STYLE card does not match a store only TOTAL lists', () => {
    const style = item('BuyMe', { network: 'buyme_style' });
    const total = item('BuyMe', { network: 'buyme_total' });
    const onlyTotal = networkStores('buyme_total').find((s) => s.nameEn && !networkStores('buyme_style').some((x) => x.key === s.key));
    expect(onlyTotal).toBeDefined();
    const results = searchItems(buildIndex([style, total]), onlyTotal!.nameEn!);
    expect(results.map((r) => r.item)).toEqual([total]);
  });
});

describe('persistence', () => {
  it('stores the card type and lets it be changed', async () => {
    const db = await createTestDriver();
    await migrate(db);
    const repo = new ItemRepository({ db, cipher: createTestCipher(), newId: randomUUID });
    const plain = await repo.createItem(emptyDraft({ storeName: 'Zara', amountMinor: 1000 }));
    expect(plain.network).toBeNull();
    const created = await repo.createItem(emptyDraft({ storeName: 'BuyMe', amountMinor: 20000, network: 'buyme_style' }));
    expect(created.network).toBe('buyme_style');
    expect((await repo.updateItem(created.id, { network: null })).network).toBeNull();
    expect((await repo.updateItem(created.id, { network: 'buyme_total' })).network).toBe('buyme_total');
  });
});
