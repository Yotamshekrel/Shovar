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

## M2 — Manual add / edit / detail / archive

- **One "+" entry point** opens a native form sheet with three choices (scan,
  link, manual). The scan option is visually primary because it's the most
  common flow.
- **Fast form.** Only the fields you need most are shown (type, store, amount +
  currency, expiry with one-tap "6 months / 1 year / 2 years / no expiry",
  code). Everything else is behind "More details". Store name offers known
  brands in either script as you type. The Save button is sticky so it's always
  one tap away.
- **"Balance" vs "amount".** `initial_amount` is the face value; `balance` is
  what's left. Logging usage ("I spent ₪40") or setting the remaining balance
  both write a history event. Reaching zero moves the card to the archive;
  "Move back to wallet" restores it.
- **Archive = used or expired.** Expired is derived from the expiry date at
  read time and also persisted by a sweep on refresh, so history records when
  it happened.
- **Tapping a gift card's link.** Tiles with a link get an "Open" pill that
  opens the link directly; tapping anywhere else opens the details (where the
  link is also the primary action when there is no code). This satisfies
  "tapping the item opens the link" without losing access to details.
- **Checkout view** renders the code as Code 128 (compact subset C for numeric
  codes), QR, or large text, on a white quiet zone, with screen brightness
  boosted and the screen kept awake. Bars are snapped to whole physical pixels.
  Both encoders are verified in tests by decoding with ZXing.
- **Attachments** are copied into the app's documents folder and stored by file
  name only (iOS changes the absolute container path between updates). PDFs
  open via the system share/"Open in…" sheet.

## M3 — Instant search

- **In-memory, layered fuzzy matcher** (no dependency), scoring each item's
  names — store name, known brand spellings in Hebrew/English, and notes at a
  lower weight:
  1. exact / prefix / word-prefix / substring on normalized text
     (case, niqqud, Hebrew final letters and punctuation folded),
  2. typo tolerance with Damerau–Levenshtein (1 typo from 4 chars, 2 from 6,
     3 from 9), also against a prefix for partially typed names,
  3. **cross-script phonetic skeletons**: both Hebrew and Latin names are
     reduced to consonant skeletons with ambiguous letters folded (p/f/פ,
     v/w/ב, k/c/q/ח/כ/ק, tz/צ …), so "קסטרו" ↔ "Castro", "גולדה" ↔ "Golda" and
     "מנגו" ↔ "Mango" match even for stores not in the brand dictionary.
  Short skeletons (≤3 consonants) only match exactly or by prefix to avoid
  false positives (e.g. "fox" must not match "Max Stock").
- ~13 ms per keystroke for 1,000 cards in Node; typical wallets are far smaller.
- **Search is its own route** (`/search`) that opens with a 150 ms fade and the
  keyboard already up, so it can be deep-linked from the home-screen quick
  action. Each result shows balance and expiry, and has a one-tap "use"
  button that goes straight to the checkout code. Enter opens the top hit. No
  results offers "Add a card for “…”" prefilled with the query.
- **Quick actions** (`expo-quick-actions`): "Find credit", "Scan receipt",
  "Add card", set dynamically with localized titles. A home-screen widget was
  left as a stretch goal (see README).
