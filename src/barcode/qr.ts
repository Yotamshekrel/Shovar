// qrcode's core encoder is pure JS; importing it directly avoids the
// Node/canvas renderers in the package entry point.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const QR = require('qrcode/lib/core/qrcode') as {
  create: (text: string, opts?: { errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H' }) => {
    modules: { size: number; data: Uint8Array | boolean[] };
  };
};

export interface QrMatrix {
  size: number;
  isDark: (x: number, y: number) => boolean;
}

export function encodeQr(text: string): QrMatrix {
  const { modules } = QR.create(text, { errorCorrectionLevel: 'M' });
  const { size, data } = modules;
  return { size, isDark: (x, y) => !!data[y * size + x] };
}

/** SVG path ("M x y h1 v1 h-1 z" per dark module, merged per row run). */
export function qrPath(m: QrMatrix): string {
  let d = '';
  for (let y = 0; y < m.size; y++) {
    let x = 0;
    while (x < m.size) {
      if (!m.isDark(x, y)) {
        x++;
        continue;
      }
      const start = x;
      while (x < m.size && m.isDark(x, y)) x++;
      d += `M${start} ${y}h${x - start}v1h${start - x}z`;
    }
  }
  return d;
}
