/**
 * Text normalization shared by search, store keys and store detection.
 *
 * - lowercases, strips Latin accents and Hebrew niqqud / cantillation marks
 * - folds Hebrew final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ)
 * - turns punctuation (including geresh/gershayim and "&") into spaces
 */

const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

// Hebrew points & cantillation (U+0591–U+05C7) and Latin combining marks (U+0300–U+036F).
const COMBINING = /[̀-֑ͯ-ׇ]/g;
const NON_WORD = /[^a-z0-9א-ת\s]/g;

export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  let s = input.normalize('NFKD').replace(COMBINING, '').toLowerCase();
  s = s.replace(/[ךםןףץ]/g, (c) => FINALS[c] ?? c);
  s = s.replace(NON_WORD, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/** Normalized text with all whitespace removed ("H & M" → "hm"). */
export function compact(input: string | null | undefined): string {
  return normalizeText(input).replace(/\s+/g, '');
}

export function tokens(input: string | null | undefined): string[] {
  const n = normalizeText(input);
  return n ? n.split(' ') : [];
}

export function hasHebrew(s: string): boolean {
  return /[א-ת]/.test(s);
}

export function hasLatin(s: string): boolean {
  return /[a-z]/i.test(s);
}
