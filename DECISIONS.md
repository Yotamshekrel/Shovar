# Shvar — Decisions & trade-offs

This file records the key technical choices made while building Shvar, and why.
It is updated per milestone.

## M1 — Foundation

- **Expo SDK 57 + Expo Router, TypeScript strict.** Routes live in `src/app/`,
  everything else in `src/` (domain, db, services, UI). Scaffolded from the
  official `create-expo-app` default template and trimmed.
- **Money as integer minor units** (`amountMinor`, agorot/cents). Avoids float
  drift when logging partial usage. Formatting via `Intl.NumberFormat`, whole
  amounts shown without decimals (₪120, not ₪120.00).
- **Date-only values as `YYYY-MM-DD` strings** in local time. Expiry means "valid
  through that day"; an item becomes expired the day after.
- **SQLite via `expo-sqlite`, behind a tiny `SqlDriver` interface.** The same
  repositories and migrations run in Jest against `sql.js` (real SQLite in wasm),
  so the data layer is tested against real SQL semantics, not mocks.
- **Forward-only migrations tracked with `PRAGMA user_version`.**
- **Sync-ready schema.** Every table has a UUID `id`, `created_at`, `updated_at`
  and a `deleted_at` tombstone (deletes are soft). A future sync/backup adapter
  can page changes by `updated_at` and propagate deletions without a schema
  rewrite. Secrets stay encrypted inside sync payloads (end-to-end by default).
- **Field-level encryption for codes and PINs.** AES-256-GCM (`@noble/ciphers`,
  audited, pure JS) with a random 96-bit nonce per value and a versioned payload
  (`v1:…`). The 256-bit data key is generated on first launch and stored in the
  iOS Keychain / Android Keystore via `expo-secure-store`
  (`AFTER_FIRST_UNLOCK`, so background geofence tasks can still open the DB and
  the key migrates with encrypted device backups). Only ciphertext is written to
  SQLite; list queries don't decrypt at all. SQLCipher (whole-DB encryption)
  was considered but it doesn't run in Expo Go and would complicate testing; it
  can be enabled later with the `useSQLCipher` plugin flag.
- **Balance history as an append-only `balance_events` table** (`created`,
  `usage`, `adjustment`, `marked_used`, `expired`, `reactivated`), each with the
  signed delta and resulting balance.
- **Store keys.** Items carry a canonical `store_key`: known brands map to
  `brand:<id>` (so "Zara", "ZARA" and "זארה" share a places cache and location
  cooldown), otherwise `name:<normalized>`.
- **State: `zustand`.** The whole active wallet (tens–hundreds of rows) is held
  in memory, which makes search and filtering instant. Mutations go through the
  repository and then refresh the store; side-effect modules (notifications,
  geofences) subscribe to changes.
- **Design system.** Own lightweight primitives (Text, Button, TextField, Chip,
  Segmented, ListRow…) with light/dark palettes. Wallet-style gradient tiles use
  the brand color when the store is known, otherwise a stable hashed color; text
  color is chosen by WCAG contrast.
- **i18n.** Own ~60-line i18n layer: English and Hebrew dictionaries, Hebrew is
  type-checked for key parity (`Record<StringKey, string>`). Layout direction
  follows the language via `I18nManager.forceRTL` + a one-time reload guarded
  against reload loops (Expo Go resets RTL).
- **Web is a development preview only.** It's used to render and screenshot
  screens during development (expo-sqlite web + COOP/COEP headers in
  `metro.config.js`). Native-only features degrade to no-ops on web and the web
  key store is not hardware-backed.
