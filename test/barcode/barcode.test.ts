import { BarcodeFormat, BinaryBitmap, Code128Reader, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from '@zxing/library';

import { CODE128_PATTERNS, barcodePayload, canEncodeCode128, code128Values, encodeCode128 } from '@/barcode/code128';
import { encodeQr } from '@/barcode/qr';

/** Rasterizes bar widths into a luminance buffer (white quiet zones). */
function rasterizeBarcode(widths: number[], scale = 3, height = 60) {
  const quiet = 12;
  const modules = widths.reduce((a, b) => a + b, 0) + quiet * 2;
  const w = modules * scale;
  const lum = new Uint8ClampedArray(w * height).fill(255);
  let x = quiet;
  widths.forEach((bw, i) => {
    if (i % 2 === 0) {
      for (let px = x * scale; px < (x + bw) * scale; px++) for (let y = 0; y < height; y++) lum[y * w + px] = 0;
    }
    x += bw;
  });
  return new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, w, height)));
}

function rasterizeQr(text: string, scale = 6) {
  const m = encodeQr(text);
  const margin = 4;
  const size = (m.size + margin * 2) * scale;
  const lum = new Uint8ClampedArray(size * size).fill(255);
  for (let y = 0; y < m.size; y++)
    for (let x = 0; x < m.size; x++)
      if (m.isDark(x, y))
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) lum[((y + margin) * scale + dy) * size + (x + margin) * scale + dx] = 0;
  return new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(lum, size, size)));
}

describe('Code 128', () => {
  it('has a well-formed pattern table', () => {
    expect(CODE128_PATTERNS).toHaveLength(107);
    expect(new Set(CODE128_PATTERNS).size).toBe(107);
    CODE128_PATTERNS.forEach((p, i) => {
      const modules = [...p].reduce((a, c) => a + Number(c), 0);
      expect(modules).toBe(i === 106 ? 13 : 11);
    });
  });

  it('uses subset C for numeric codes (compact)', () => {
    const values = code128Values('123456');
    expect(values[0]).toBe(105);
    expect(values.slice(1, 4)).toEqual([12, 34, 56]);
  });

  it('switches to subset B for the trailing digit of odd-length numbers', () => {
    const values = code128Values('12345');
    expect(values.slice(0, 5)).toEqual([105, 12, 34, 100, 21]);
  });

  it.each(['44702291883012', '4470229188301', '2900012345678', 'BM-7F3K-22QX', 'AQ7K-L2MN-P9RT', 'PJJ123C', 'gift card 42'])(
    'produces a scannable barcode for "%s" (decoded by ZXing)',
    (text) => {
      const result = new Code128Reader().decode(rasterizeBarcode(encodeCode128(text)));
      expect(result.getText()).toBe(text);
      expect(result.getBarcodeFormat()).toBe(BarcodeFormat.CODE_128);
    },
  );

  it('rejects non-ASCII content (falls back to QR in the UI)', () => {
    expect(canEncodeCode128('קוד')).toBe(false);
    expect(canEncodeCode128('')).toBe(false);
    expect(() => encodeCode128('קוד')).toThrow();
  });

  it('normalizes typed numeric codes', () => {
    expect(barcodePayload('4470 2291 8830 12')).toBe('44702291883012');
    expect(barcodePayload('1234-5678')).toBe('12345678');
    expect(barcodePayload('BM-7F3K 22QX')).toBe('BM-7F3K22QX');
  });
});

describe('QR', () => {
  it.each(['BM-7F3K-22QX', 'https://buyme.co.il/giftcard/demo', 'קוד מתנה 123'])('round-trips "%s" through ZXing', (text) => {
    expect(new QRCodeReader().decode(rasterizeQr(text)).getText()).toBe(text);
  });
});
