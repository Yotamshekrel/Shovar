import { getNetworkDef, networkStores, networksForPlatform } from '@/networks/registry';
import { storeLogo } from '@/networks/logos';
import { suggestBrands } from '@/search/searchIndex';
import { DEFAULT_SETTINGS, EXPIRY_REMINDER_HOUR } from '@/state/settings';
import { BRANDS } from '@/search/brands';
import { isAccentLike, storeColor } from '@/theme/color';
import { darkPalette, lightPalette } from '@/theme/tokens';

describe('store tiles never look like the green total card', () => {
  it('detects the app accent range', () => {
    expect(isAccentLike(lightPalette.primary)).toBe(true);
    expect(isAccentLike(darkPalette.primary)).toBe(true);
    expect(isAccentLike('#E6007E')).toBe(false);
    expect(isAccentLike('#0B3C5D')).toBe(false);
  });

  it('deepens green brand colors and leaves the others alone', () => {
    for (const b of BRANDS) expect(isAccentLike(storeColor(b.name))).toBe(false);
    expect(storeColor('Zara')).toBe('#111111');
  });

  it('never returns a tile color in the accent range for any name', () => {
    for (let i = 0; i < 300; i++) expect(isAccentLike(storeColor(`store ${i}`))).toBe(false);
  });
});

describe('store logos', () => {
  it('finds bundled logos by name in either language and via brand aliases', () => {
    expect(storeLogo('Zara')).not.toBeNull();
    expect(storeLogo('זארה')).toBe(storeLogo('Zara'));
    expect(storeLogo('totally unknown store name')).toBeNull();
    expect(storeLogo(null, undefined)).toBeNull();
  });
});

describe('gift card variants', () => {
  it('offers the new BuyMe and Swish variants with store lists', () => {
    expect(networksForPlatform('buyme').map((n) => n.id)).toContain('buyme_together');
    expect(networksForPlatform('nofshonit').map((n) => n.id)).toEqual([
      'nofshonit',
      'swish_tasty',
      'swish_dine_wine',
      'swish_birthday',
      'swish_baby',
      'swish_teacher',
      'swish_family',
      'swish_theatre',
      'swish_hotels_spa',
    ]);
    for (const n of ['buyme_together', 'swish_tasty', 'swish_baby']) {
      expect(getNetworkDef(n)).not.toBeNull();
      expect(networkStores(n).length).toBeGreaterThan(50);
    }
  });
});

describe('reminders', () => {
  it('always send expiry reminders at 10:00', () => {
    expect(EXPIRY_REMINDER_HOUR).toBe(10);
    expect('reminderHour' in DEFAULT_SETTINGS).toBe(false);
  });
});

describe('store suggestions', () => {
  it('does not offer unrelated brands next to an exact match', () => {
    expect(suggestBrands('BuyMe', 4).map((b) => b.id)).toEqual(['buyme']);
    expect(suggestBrands('Zara', 4).map((b) => b.id)).toEqual(['zara']);
  });
});
