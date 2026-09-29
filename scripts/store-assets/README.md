Regenerates `docs/store-assets/` (store screenshots + Play feature graphic).

1. `CI=1 npx expo start --web --port 8099` (dev server; the demo wallet is seeded from `src/services/demoSeed.ts`, dev builds only).
2. In a scratch folder: `npm i playwright-core sharp`, copy these scripts there, then run `node capture-part1.mjs && node capture-part2.mjs && node compose.mjs`.
   (Paths inside point at `/opt/pw-browsers/chromium` and `/home/user/Shovar`; adjust for your machine.)
