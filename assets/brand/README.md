# Shovar brand

**Wordmark.** `shovar` in lowercase Unbounded Bold (Latin) and `שובר` in Rubik Bold (Hebrew). Both are outlined to SVG paths, so no font is needed anywhere the logo appears.

**Mark.** A white lowercase `s` (Unbounded Bold) on the green gradient, at half the tile height. It is the app icon, the favicon and the avatar.

**Colors.**

| Token | Hex | Use |
| --- | --- | --- |
| Brand green | `#0A7A5C` | Wordmark on light, splash background, Android adaptive background fallback |
| Gradient start | `#16A87A` | Top-left of the mark and app icon |
| Gradient end | `#075E46` | Bottom-right of the mark and app icon |
| Mint (dark mode wordmark) | `#3DD6A3` | Wordmark on dark surfaces (`colors.primary` in dark theme) |

**Files.**

- `mark.svg` is the rounded tile. `lockup-en.svg` / `lockup-he.svg` pair it with the wordmark.
- `wordmark-{en,he}-{green,white}.svg` are the bare wordmarks. Use white on the green gradient or photos, green on light surfaces.
- App icons, the Android adaptive layers, the splash and the favicon live in `assets/images/`.
- Play store art lives in `docs/store-assets/android/`.
- In the app, import `ShovarMark`, `ShovarWordmark` and `ShovarLogo` from `src/components/brand/ShovarBrand.tsx` (path data is in `src/brand/paths.ts`).

**Rules.** Keep the wordmark lowercase in English. Clear space on every side is at least the height of the `o`. Don't stretch, outline, recolor outside the table above, or set the name in another font.

**Regenerate.** Everything above is produced by `scripts/brand/build-brand.mjs`; see the header of that file for setup. Fonts are SIL Open Font License 1.1 (Unbounded by NaN, Rubik by Hubert & Fischer, via Google Fonts).
