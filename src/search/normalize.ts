/**
 * Text normalization shared by search, store keys and store detection.
 *
 * - lowercases, strips Latin accents and Hebrew niqqud / cantillation marks
 * - folds Hebrew final letters (ך→כ, ם→מ, ן→נ, ף→פ, ץ→צ)
 * - turns punctuation (including geresh/gershayim and "&") into spaces
 */

const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

// Hebrew points & cantillation (U+0591–U+05C7) and Latin combining marks (U+0300–U+036F).
const COMBINING = /[\u0300-\u036f\u0591-\u05c7]/g;
const NON_WORD = /[^a-z0-9\u05d0-\u05ea\s]/g;

/** NFKD splits accented Latin letters so the marks can be stripped; skip it if the engine lacks it. */
function safeNormalize(input: string): string {
  try {
    return typeof input.normalize === 'function' ? input.normalize('NFKD') : input;
  } catch {
    return input;
  }
}

export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  let s = safeNormalize(input).replace(COMBINING, '').toLowerCase();
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
  return /[\u05d0-\u05ea]/.test(s);
}

export function hasLatin(s: string): boolean {
  return /[a-z]/i.test(s);
}
