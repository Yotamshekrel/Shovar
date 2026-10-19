import { BRAND, WORDMARK_EN, WORDMARK_HE } from '@/brand/paths';

describe('brand paths', () => {
  const arts = { WORDMARK_EN, WORDMARK_HE };

  it.each(Object.entries(arts))('%s is a finite, non-empty outline', (_name, art) => {
    expect(art.d.startsWith('M')).toBe(true);
    expect(art.d).not.toMatch(/NaN|undefined|Infinity/);
    expect(art.width).toBeGreaterThan(0);
    expect(art.height).toBeGreaterThan(0);
  });

  it('keeps the wordmarks wide and short', () => {
    expect(WORDMARK_EN.width / WORDMARK_EN.height).toBeGreaterThan(4);
    expect(WORDMARK_HE.width / WORDMARK_HE.height).toBeGreaterThan(2);
  });

  it('keeps the brand green', () => {
    expect(BRAND.green).toBe('#0A7A5C');
  });
});
