// Regenerates every brand asset from the Unbounded (Latin) + Rubik (Hebrew) typefaces.
//
// The wordmarks are outlined to SVG paths, so nothing in the app, site or store graphics needs
// a font at runtime. Outputs:
//   src/brand/paths.ts              path data used by src/components/brand/ShovarBrand.tsx
//   assets/brand/*.svg              wordmarks (green / white), mark, lockups
//   assets/images/*.png             app icon, Android adaptive layers, splash, favicon
//   docs/mark.svg, docs/store-assets/android/{play-icon-512.png,feature-graphic/*.png}
//
// Tooling is not a project dependency. Install it once anywhere and point BRAND_TOOLS at it:
//   mkdir /tmp/brandtools && cd /tmp/brandtools && npm init -y &&
//   npm i opentype.js @resvg/resvg-js @expo-google-fonts/unbounded @expo-google-fonts/rubik
//   BRAND_TOOLS=/tmp/brandtools node scripts/brand/build-brand.mjs
//
// Fonts are SIL OFL 1.1 (Unbounded: NaN / Google Fonts, Rubik: Hubert & Fischer / Google Fonts).

import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const tools = process.env.BRAND_TOOLS;
if (!tools) throw new Error('Set BRAND_TOOLS to the folder where opentype.js, @resvg/resvg-js and the font packages are installed.');
const req = createRequire(path.join(path.resolve(tools), 'x.js'));
const opentype = req('opentype.js');
const { Resvg } = req('@resvg/resvg-js');
const fontsDir = path.join(path.resolve(tools), 'node_modules/@expo-google-fonts');
const load = (pkg, file) => {
  const buf = readFileSync(path.join(fontsDir, pkg, file.split('_')[1], `${file}.ttf`));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const unbounded = load('unbounded', 'Unbounded_700Bold');
const rubikBold = load('rubik', 'Rubik_700Bold');
const rubikMedium = load('rubik', 'Rubik_500Medium');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = (...p) => {
  const f = path.join(root, ...p);
  mkdirSync(path.dirname(f), { recursive: true });
  return f;
};

const GREEN = '#0A7A5C';
const GRAD_A = '#16A87A';
const GRAD_B = '#075E46';
const round = (n) => Math.round(n * 100) / 100;

/** Outline `text` (already in visual left-to-right order) and normalise it to start at 0,0. */
function outline(font, text, { size = 200, letterSpacing = 0, pairs = {} } = {}) {
  // Manual layout (advance + pair kerning): opentype.js 2 chokes on these fonts' GSUB tables.
  const scale = size / font.unitsPerEm;
  const p = new opentype.Path();
  let x = 0;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  glyphs.forEach((g, i) => {
    p.extend(g.getPath(x, 0, size));
    x += g.advanceWidth * scale + letterSpacing * size;
    if (glyphs[i + 1]) x += font.getKerningValue(g, glyphs[i + 1]) * scale + (pairs[text[i] + text[i + 1]] ?? 0) * size;
  });
  const b = p.getBoundingBox();
  p.commands.forEach((c) => {
    for (const k of ['x', 'x1', 'x2']) if (k in c) c[k] -= b.x1;
    for (const k of ['y', 'y1', 'y2']) if (k in c) c[k] -= b.y1;
  });
  // opentype.js's own toPathData emits NaN for some Hebrew glyphs, so serialise by hand.
  const n = (v) => String(Math.round(v * 100) / 100);
  const d = p.commands
    .map((c) => {
      switch (c.type) {
        case 'M':
        case 'L':
          return `${c.type}${n(c.x)} ${n(c.y)}`;
        case 'Q':
          return `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
        case 'C':
          return `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
        default:
          return 'Z';
      }
    })
    .join('');
  if (/NaN/.test(d)) throw new Error(`NaN in outline for "${text}"`);
  return { d, w: round(b.x2 - b.x1), h: round(b.y2 - b.y1) };
}

const en = outline(unbounded, 'shovar', { letterSpacing: 0.012, pairs: { va: 0.012, ar: 0.065 } });
// Hebrew has no shaping needs here, so reversing the string gives the visual order.
const he = outline(rubikBold, [...'שובר'].reverse().join(''), { letterSpacing: 0 });
const sGlyph = outline(unbounded, 's');

const place = (o, x, y, scale) => `<path transform="translate(${round(x)} ${round(y)}) scale(${round(scale)})" d="${o.d}"/>`;
const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${defs}${body}</svg>`;
const gradDef = (id = 'g') =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${GRAD_A}"/><stop offset="1" stop-color="${GRAD_B}"/></linearGradient></defs>`;

/** The "s" centred in a size x size box, `frac` of the box tall. */
function sMark(size, frac, fill) {
  const k = (size * frac) / sGlyph.h;
  return `<g fill="${fill}">${place(sGlyph, (size - sGlyph.w * k) / 2, (size - sGlyph.h * k) / 2, k)}</g>`;
}

const tile = (size, frac, { radius = 0, glyph = '#fff' } = {}) =>
  svg(size, size, `<rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>${sMark(size, frac, glyph)}`, gradDef());

/** Encode an 8-bit RGB PNG (no alpha channel): the App Store rejects icons that have one. */
function encodeRgbPng(width, height, rgba) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    const row = y * (width * 3 + 1);
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw[row + 1 + x * 3] = rgba[i];
      raw[row + 2 + x * 3] = rgba[i + 1];
      raw[row + 3 + x * 3] = rgba[i + 2];
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 2, 0, 0, 0], 8); // 8-bit, truecolor, deflate, no filter, no interlace
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const png = (svgText, file, width, { opaque = false } = {}) => {
  const img = new Resvg(svgText, { fitTo: { mode: 'width', value: width } }).render();
  if (!opaque) return writeFileSync(out(file), img.asPng());
  const px = img.pixels; // a getter that copies, so read it once
  for (let i = 3; i < px.length; i += 4) if (px[i] !== 255) throw new Error(`${file} is not fully opaque`);
  writeFileSync(out(file), encodeRgbPng(img.width, img.height, px));
};

// ---------- src/brand/paths.ts ----------
const art = (o) => `{\n  d: '${o.d}',\n  width: ${o.w},\n  height: ${o.h},\n}`;
writeFileSync(
  out('src/brand/paths.ts'),
  `// Generated by scripts/brand/build-brand.mjs. Do not edit by hand.
// "shovar" in Unbounded Bold and the Hebrew in Rubik Bold, outlined (no runtime font needed).

export const BRAND = {
  green: '${GREEN}',
  gradientFrom: '${GRAD_A}',
  gradientTo: '${GRAD_B}',
} as const;

export interface PathArt {
  d: string;
  width: number;
  height: number;
}

export const WORDMARK_EN: PathArt = ${art(en)};

export const WORDMARK_HE: PathArt = ${art(he)};

/** The "s" from the app icon, in glyph units. ShovarMark scales it to half the tile height. */
export const MARK_S: PathArt = ${art(sGlyph)};
`,
);

// ---------- SVG brand files ----------
const wordmark = (o, fill) => svg(round(o.w), round(o.h), `<path fill="${fill}" d="${o.d}"/>`);
writeFileSync(out('assets/brand/wordmark-en-green.svg'), wordmark(en, GREEN));
writeFileSync(out('assets/brand/wordmark-en-white.svg'), wordmark(en, '#FFFFFF'));
writeFileSync(out('assets/brand/wordmark-he-green.svg'), wordmark(he, GREEN));
writeFileSync(out('assets/brand/wordmark-he-white.svg'), wordmark(he, '#FFFFFF'));
const markSvg = tile(64, 0.5, { radius: 16 });
writeFileSync(out('assets/brand/mark.svg'), markSvg);
writeFileSync(out('docs/mark.svg'), markSvg);

function lockup(o, fill, frac) {
  const H = 64;
  const wh = H * frac; // wordmark height next to the 64px tile
  const k = wh / o.h;
  const gap = 18;
  const W = round(H + gap + o.w * k);
  const tileBody = `<rect width="${H}" height="${H}" rx="16" fill="url(#g)"/>${sMark(H, 0.5, '#fff')}`;
  return svg(W, H, `${tileBody}<g fill="${fill}">${place(o, H + gap, (H - o.h * k) / 2, k)}</g>`, gradDef());
}
writeFileSync(out('assets/brand/lockup-en.svg'), lockup(en, GREEN, 0.5));
writeFileSync(out('assets/brand/lockup-he.svg'), lockup(he, GREEN, 0.42));

// ---------- app icons ----------
png(tile(1024, 0.5), 'assets/images/icon.png', 1024, { opaque: true });
png(svg(1024, 1024, '<rect width="1024" height="1024" fill="url(#g)"/>', gradDef()), 'assets/images/android-icon-background.png', 1024, { opaque: true });
png(svg(1024, 1024, sMark(1024, 0.42, '#fff')), 'assets/images/android-icon-foreground.png', 1024);
png(svg(1024, 1024, sMark(1024, 0.42, '#000')), 'assets/images/android-icon-monochrome.png', 1024);
png(svg(512, 512, sMark(512, 0.62, '#fff')), 'assets/images/splash-icon.png', 512);
png(tile(96, 0.5, { radius: 24 }), 'assets/images/favicon.png', 48);
png(tile(512, 0.5), 'docs/store-assets/android/play-icon-512.png', 512, { opaque: true });

// ---------- Play feature graphic (1024x500) ----------
const tagline = {
  en: outline(rubikMedium, 'Your store credit wallet'),
  he: outline(rubikMedium, [...'ארנק הזיכויים שלך'].reverse().join('')),
};
for (const lang of ['en', 'he']) {
  const word = lang === 'en' ? en : he;
  const W = 1024;
  const H = 500;
  const icon = 230;
  const gap = 52;
  const wk = lang === 'en' ? 92 / word.h : 96 / word.h; // wordmark height 92 / 96 px
  const wordH = word.h * wk;
  const tk = 34 / tagline[lang].h;
  const tagH = tagline[lang].h * tk;
  const textW = Math.max(word.w * wk, tagline[lang].w * tk);
  const total = icon + gap + textW;
  const x0 = (W - total) / 2;
  const iconX = lang === 'en' ? x0 : x0 + textW + gap;
  const textX = lang === 'en' ? x0 + icon + gap : x0;
  const blockH = wordH + 30 + tagH;
  const ty = (H - blockH) / 2;
  const align = (w) => (lang === 'en' ? textX : textX + textW - w); // Hebrew hugs the icon side
  const body =
    `<rect width="${W}" height="${H}" fill="url(#bg)"/>` +
    `<g transform="translate(${round(iconX)} ${(H - icon) / 2})"><rect width="${icon}" height="${icon}" rx="52" fill="url(#g)"/>${sMark(icon, 0.5, '#fff')}</g>` +
    `<g fill="#fff">${place(word, align(word.w * wk), ty, wk)}</g>` +
    `<g fill="#fff" fill-opacity=".9">${place(tagline[lang], align(tagline[lang].w * tk), ty + wordH + 30, tk)}</g>`;
  const defs =
    gradDef() +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="#0F9E78"/><stop offset="1" stop-color="#065A43"/></linearGradient></defs>`;
  png(svg(W, H, body, defs), `docs/store-assets/android/feature-graphic/${lang}.png`, W, { opaque: true });
}

console.log(`wordmark en ${en.w}x${en.h}, he ${he.w}x${he.h}, s ${sGlyph.w}x${sGlyph.h}`);
