import { applySaved, parseList, parseManifest, syncCatalog, type CatalogManifest, type SavedCatalog } from '@/networks/catalog';
import { BUNDLED_HASHES } from '@/networks/lists';
import { allNetworkDefs, applyCatalog, getNetworkDef, networkStores, networksForPlatform } from '@/networks/registry';

const BASE = 'https://example.test/catalog/v1';
const DAY = 24 * 60 * 60 * 1000;

const manifest = (over: Partial<CatalogManifest> = {}): CatalogManifest => ({
  schema: 1,
  updated: '2026-11-01',
  networks: [{ id: 'buyme_fresh', platform: 'buyme', label: { en: 'BuyMe Fresh', he: 'BuyMe פרש' }, sources: ['buyme_fresh'] }],
  lists: { buyme_fresh: { hash: 'abc', count: 2 } },
  ...over,
});
const freshList = { stores: [['חנות חדשה', 'New Shop', 0], ['מסעדה חדשה', null, 2]] };

function deps(files: Record<string, unknown>, saved: { current: SavedCatalog | null }, now = 1_000 * DAY) {
  const requested: string[] = [];
  return {
    requested,
    d: {
      baseUrl: BASE,
      fetchJson: async (url: string) => {
        requested.push(url);
        if (!(url in files)) throw new Error('404');
        return files[url];
      },
      load: async () => saved.current,
      save: async (c: SavedCatalog) => {
        saved.current = c;
      },
      now: () => now,
      bundledHashes: BUNDLED_HASHES,
      apply: applyCatalog,
    },
  };
}

afterEach(() => applyCatalog(null));

describe('bundled catalog', () => {
  it('has every card family the issuers sell, each with a store list', () => {
    for (const id of ['buyme_chef', 'buyme_baby', 'buyme_vacation', 'buyme_yng', 'buyme_pets', 'azrieli', 'hz_giftzone', 'hz_allin', 'swish_family']) {
      expect(getNetworkDef(id)).not.toBeNull();
      expect(networkStores(id).length).toBeGreaterThan(5);
    }
    expect(networksForPlatform('hitechzone').length).toBeGreaterThanOrEqual(10);
    expect(networksForPlatform('azrieli')).toHaveLength(1);
    for (const n of allNetworkDefs()) expect(BUNDLED_HASHES[n.sources[0]!]).toBeDefined();
  });
});

describe('catalog parsing', () => {
  it('rejects unknown schemas and keeps only well-formed cards', () => {
    expect(parseManifest({ ...manifest(), schema: 2 })).toBeNull();
    const m = parseManifest({ ...manifest(), networks: [...manifest().networks, { id: 'Bad Id', platform: 'x' }, 7] });
    expect(m?.networks.map((n) => n.id)).toEqual(['buyme_fresh']);
  });

  it('accepts a list only when every row is valid', () => {
    expect(parseList(freshList)?.stores).toHaveLength(2);
    expect(parseList({ stores: [['ok', null, 0], ['bad', null, 9]] })).toBeNull();
    expect(parseList({ stores: [['', null, 0]] })).toBeNull();
    expect(parseList({ stores: 'nope' })).toBeNull();
  });
});

describe('catalog sync', () => {
  it('downloads new lists, applies them and keeps them for the next start', async () => {
    const saved = { current: null as SavedCatalog | null };
    const { d, requested } = deps({ [`${BASE}/manifest.json`]: manifest(), [`${BASE}/lists/buyme_fresh.json`]: freshList }, saved);

    expect(await syncCatalog(d)).toBe('updated');
    // Only the new list is downloaded; the bundled ones were not touched.
    expect(requested).toEqual([`${BASE}/manifest.json`, `${BASE}/lists/buyme_fresh.json`]);
    expect(getNetworkDef('buyme_fresh')?.label.en).toBe('BuyMe Fresh');
    expect(networkStores('buyme_fresh').map((s) => s.name)).toContain('חנות חדשה');

    applyCatalog(null);
    expect(getNetworkDef('buyme_fresh')).toBeNull();
    await applySaved({ load: d.load, apply: d.apply, bundledHashes: d.bundledHashes });
    expect(networkStores('buyme_fresh')).toHaveLength(2);
  });

  it('replaces the stores of a bundled card when its list changed', async () => {
    const saved = { current: null as SavedCatalog | null };
    const m = manifest({
      networks: [{ id: 'azrieli', platform: 'azrieli', label: { en: 'Azrieli Gift Card', he: 'עזריאלי' }, sources: ['azrieli'] }],
      lists: { azrieli: { hash: 'new-hash', count: 1 } },
    });
    const { d } = deps({ [`${BASE}/manifest.json`]: m, [`${BASE}/lists/azrieli.json`]: { stores: [['חנות יחידה', null, 0]] } }, saved);
    expect(networkStores('azrieli').length).toBeGreaterThan(50);
    await syncCatalog(d);
    expect(networkStores('azrieli').map((s) => s.name)).toEqual(['חנות יחידה']);
  });

  it('does not download a list the app already ships', async () => {
    const saved = { current: null as SavedCatalog | null };
    const m = manifest({
      networks: [{ id: 'azrieli', platform: 'azrieli', label: { en: 'A', he: 'א' }, sources: ['azrieli'] }],
      lists: { azrieli: { hash: BUNDLED_HASHES.azrieli!, count: 152 } },
    });
    const { d, requested } = deps({ [`${BASE}/manifest.json`]: m }, saved);
    expect(await syncCatalog(d)).toBe('updated');
    expect(requested).toEqual([`${BASE}/manifest.json`]);
  });

  it('checks at most twice a day', async () => {
    const saved = { current: null as SavedCatalog | null };
    const files = { [`${BASE}/manifest.json`]: manifest(), [`${BASE}/lists/buyme_fresh.json`]: freshList };
    await syncCatalog(deps(files, saved, 1_000 * DAY).d);
    const again = deps(files, saved, 1_000 * DAY + 60_000);
    expect(await syncCatalog(again.d)).toBe('fresh');
    expect(again.requested).toEqual([]);
    expect(await syncCatalog(deps(files, saved, 1_001 * DAY).d)).toBe('unchanged');
  });

  it('keeps working data when the download fails or is malformed', async () => {
    const saved = { current: null as SavedCatalog | null };
    expect(await syncCatalog(deps({}, saved).d)).toBe('failed');
    expect(await syncCatalog(deps({ [`${BASE}/manifest.json`]: { schema: 9 } }, saved).d)).toBe('failed');
    // A card whose list is broken is not offered at all.
    const bad = deps({ [`${BASE}/manifest.json`]: manifest(), [`${BASE}/lists/buyme_fresh.json`]: { stores: [[1]] } }, saved);
    await syncCatalog(bad.d);
    expect(getNetworkDef('buyme_fresh')).toBeNull();
    expect(getNetworkDef('buyme_all')).not.toBeNull();
  });
});
