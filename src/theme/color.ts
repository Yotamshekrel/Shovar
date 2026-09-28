import { brandColor } from '@/search/brands';

import { TILE_COLORS } from './tokens';

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** White or near-black text, whichever has better contrast on `bg`. */
export function readableOn(bg: string): string {
  return contrastRatio(bg, '#FFFFFF') >= contrastRatio(bg, '#0E1116') ? '#FFFFFF' : '#0E1116';
}

export function shade(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)));
  return `#${[f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}

/** Tile color for a store: brand color when known, otherwise a stable hashed palette color. */
export function storeColor(storeName: string): string {
  const brand = brandColor(storeName);
  if (brand) return brand;
  const key = storeName.trim().toLowerCase();
  return TILE_COLORS[hash(key) % TILE_COLORS.length];
}

export function storeInitials(storeName: string): string {
  const words = storeName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join('').toUpperCase();
  return (Array.from(words[0])[0] + Array.from(words[1])[0]).toUpperCase();
}
