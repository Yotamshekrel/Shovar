import { normalizeText } from './normalize';

/**
 * Cross-script phonetic "consonant skeletons".
 *
 * Hebrew is mostly written without vowels, so the most reliable way to match
 * "Zara" with "זארה" or "Castro" with "קסטרו" is to reduce both to the same
 * consonant skeleton (`zr`, `kstr`). Letters that are ambiguous between
 * scripts are folded into one class (p/f/פ → p, v/w/b/ב → b, k/c/q/ח/כ/ק → k,
 * s/ס/ש → s, t/ט/ת → t, tz/ts/צ → c).
 *
 * The skeleton is intentionally lossy: it is used as one signal in the fuzzy
 * scorer, never as the only one.
 */

const HEBREW_MAP: Record<string, string> = {
  ב: 'b',
  ג: 'g',
  ד: 'd',
  ז: 'z',
  ח: 'k',
  ט: 't',
  כ: 'k',
  ל: 'l',
  מ: 'm',
  נ: 'n',
  ס: 's',
  פ: 'p',
  צ: 'c',
  ק: 'k',
  ר: 'r',
  ש: 's',
  ת: 't',
  // Vowel carriers / gutturals: dropped (handled in hebrewWordSkeleton).
  א: '',
  ע: '',
};

function hebrewWordSkeleton(word: string): string {
  let out = '';
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const next = word[i + 1];
    if (ch === 'ו') {
      // "וו" or a word-initial ו is a consonant (v), otherwise a vowel (o/u).
      if (next === 'ו') {
        out += 'b';
        i++;
      } else if (i === 0) {
        out += 'b';
      }
      continue;
    }
    if (ch === 'י') {
      // Word-initial י is a consonant (y), otherwise a vowel; either way it
      // carries little signal across scripts, so keep only the initial one.
      continue;
    }
    if (ch === 'ה') {
      if (i === 0) out += 'h';
      continue;
    }
    out += HEBREW_MAP[ch] ?? (/[0-9]/.test(ch) ? ch : '');
  }
  return out;
}

// "C" (uppercase) is an internal marker for the tz/ts sound (Hebrew צ) so the
// later c→k/s rule doesn't touch it.
const LATIN_DIGRAPHS: [RegExp, string][] = [
  [/ck/g, 'k'],
  [/sch/g, 's'],
  [/tch/g, 'C'],
  [/tz|ts/g, 'C'],
  [/sh/g, 's'],
  [/ch|kh/g, 'k'],
  [/ph/g, 'p'],
  [/th/g, 't'],
  [/zh/g, 'z'],
  [/qu/g, 'k'],
  [/x/g, 'ks'],
];

function latinWordSkeleton(word: string): string {
  let w = word;
  for (const [re, rep] of LATIN_DIGRAPHS) w = w.replace(re, rep);
  let out = '';
  for (let i = 0; i < w.length; i++) {
    const ch = w[i];
    const next = w[i + 1];
    switch (ch) {
      case 'a':
      case 'e':
      case 'i':
      case 'o':
      case 'u':
      case 'y':
        break;
      case 'h':
        if (i === 0) out += 'h';
        break;
      case 'C':
        out += 'c';
        break;
      case 'c':
        out += next === 'e' || next === 'i' || next === 'y' ? 's' : 'k';
        break;
      case 'q':
        out += 'k';
        break;
      case 'f':
        out += 'p';
        break;
      case 'v':
      case 'w':
        out += 'b';
        break;
      case 'j':
        out += 'g';
        break;
      default:
        if (/[a-z0-9]/.test(ch)) out += ch;
    }
  }
  return out;
}

function collapseRepeats(s: string): string {
  return s.replace(/(.)\1+/g, '$1');
}

/** Phonetic skeleton of a whole phrase (words concatenated). */
export function skeleton(input: string): string {
  const normalized = normalizeText(input);
  if (!normalized) return '';
  const parts = normalized.split(' ').map((word) => {
    // Mixed-script words are rare; handle each char class separately.
    if (/[א-ת]/.test(word)) return hebrewWordSkeleton(word.replace(/[a-z]/g, ''));
    return latinWordSkeleton(word);
  });
  return collapseRepeats(parts.join(''));
}

/** Phonetic skeleton per word, useful for token-level matching. */
export function wordSkeletons(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .filter(Boolean)
    .map((w) => skeleton(w))
    .filter(Boolean);
}
