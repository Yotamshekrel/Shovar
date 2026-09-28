/**
 * Minimal Code 128 encoder (subsets B and C) producing bar/space module widths.
 * Numeric codes use subset C (two digits per symbol) for a compact barcode that
 * scans well at checkout; everything else printable-ASCII uses subset B.
 */

// Module widths (bar, space, bar, space, bar, space) for values 0–106.
export const CODE128_PATTERNS: string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];

const START_B = 104;
const START_C = 105;
const CODE_B = 100;
const STOP = 106;

/** True when every character can be represented in Code 128 subset B/C. */
export function canEncodeCode128(text: string): boolean {
  return text.length > 0 && text.length <= 48 && /^[\x20-\x7e]+$/.test(text);
}

/** Symbol values including start, checksum and stop. */
export function code128Values(input: string): number[] {
  const text = input;
  if (!canEncodeCode128(text)) throw new Error('Unsupported characters for Code 128');
  const values: number[] = [];
  const numeric = /^\d+$/.test(text) && text.length >= 4;
  if (numeric) {
    values.push(START_C);
    const pairs = text.length - (text.length % 2);
    for (let i = 0; i < pairs; i += 2) values.push(Number(text.slice(i, i + 2)));
    if (text.length % 2 === 1) {
      values.push(CODE_B);
      values.push(text.charCodeAt(text.length - 1) - 32);
    }
  } else {
    values.push(START_B);
    for (const ch of text) values.push(ch.charCodeAt(0) - 32);
  }
  let sum = values[0];
  for (let i = 1; i < values.length; i++) sum += values[i] * i;
  values.push(sum % 103);
  values.push(STOP);
  return values;
}

/**
 * Alternating bar/space widths (in modules), starting with a bar, without
 * quiet zones. Callers should leave ≥10 modules of white space on each side.
 */
export function encodeCode128(text: string): number[] {
  const widths: number[] = [];
  for (const v of code128Values(text)) {
    for (const ch of CODE128_PATTERNS[v]) widths.push(Number(ch));
  }
  return widths;
}

/** Code 128 is only practical for short codes; normalizes spaces/dashes people type. */
export function barcodePayload(code: string): string {
  const compact = code.replace(/\s+/g, '');
  return /^[\d-]+$/.test(compact) ? compact.replace(/-/g, '') : compact;
}
