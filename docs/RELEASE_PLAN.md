# Shovar — store release plan (Google Play + App Store)

Status legend: ✅ done in this branch · 👤 needs you (accounts/legal/decisions) · 🔨 build

## A. Legal & policy requirements

| # | Requirement | Status |
|---|---|---|
| A1 | Public **privacy policy URL** (both stores mandatory; must cover AI upload, location, third parties) — `docs/privacy/index.html`, English + Hebrew | ✅ written · 👤 enable GitHub Pages (Settings → Pages → *main* / `/docs`) so `https://yotamshekrel.github.io/Shovar/privacy/` is live |
| A2 | In-app links to privacy policy, contact, data-source & license notices (Settings → About) | ✅ |
| A3 | **OpenStreetMap ODbL attribution** ("© OpenStreetMap contributors") — required because we use Overpass/Photon | ✅ Settings → About → Data sources |
| A4 | Open-source license notices for bundled packages (`src/legal/licenses.json`, regenerate with `node scripts/generate-licenses.mjs`) | ✅ |
| A5 | **Prominent disclosure for background location** (Google Play policy) shown before the OS prompt, stating purpose + "even when the app is closed"; accurate claim on what is sent | ✅ updated wording (EN/HE) |
| A6 | AI/third-party data-sharing consent (Apple 5.1.1/5.1.2, Play User Data) | ✅ already existed (consent before first AI read, toggle in Settings) |
| A7 | In-app data deletion (Play/Apple account-deletion rules don't apply — no accounts — but "Delete all data" exists) | ✅ existing |
| A8 | Export compliance: the app ships its own AES-256-GCM, so the conservative answer is used: `ITSAppUsesNonExemptEncryption=true` (standard, mass-market encryption → self-classification, no licence needed). In App Store Connect answer: uses encryption → standard algorithms → qualifies for exemption; France needs the declaration or exclude France. Send the annual BIS self-classification email (by 1 Feb) once live. | ✅ set · 👤 answer the questionnaire |
| A9 | Developer identity: Google Play requires verified identity (and, for new *personal* accounts, a closed test with ≥12 testers for 14 days before production); Apple requires a paid Developer Program membership ($99/yr); individual sellers' name is public (Israeli "trader" status under EU DSA if you sell in the EU — irrelevant for a free app, but the store asks) | 👤 |

## B. Platform technical requirements

| # | Requirement | Status |
|---|---|---|
| B1 | iOS **privacy manifest** (`PrivacyInfo.xcprivacy`): required-reason APIs + collected data types (coarse location, photos, other user content; not linked, no tracking) | ✅ `app.json → ios.privacyManifests` |
| B2 | Android: strip unneeded permissions (mic, overlay, legacy storage) | ✅ `android.blockedPermissions` |
| B3 | Android auto-backup disabled (encrypted DB would restore without its Keystore key and be unreadable) | ✅ `android.allowBackup=false` |
| B4 | Android **AAB** for Play (`production` profile `app-bundle`), APK for internal testing (`preview`) | ✅ `eas.json` |
| B5 | Play submit config (internal track, draft) | ✅ `eas.json` submit |
| B9 | Phone-only on iOS (`supportsTablet=false`) so no iPad screenshots are required | ✅ |
| B10 | Store screenshots (EN + HE, Play 1080×1920, iOS 6.9" and 6.5") + Play feature graphic + 512 icon: `docs/store-assets/` | ✅ |
| B6 | Icons 1024², adaptive icon layers, splash | ✅ already present |
| B7 | Bundle id / package `com.shvar.wallet` — never change (data persistence) | ✅ untouched |
| B8 | Production AI backend: **no Anthropic key may be bundled**. Deploy `server/extraction-proxy.mjs` (add rate limiting) and set `EXPO_PUBLIC_ANTHROPIC_BASE_URL` in the EAS *production* environment; otherwise the store build ships with AI reading unavailable unless users paste their own key | 👤 decision |

## C. Store console work (cannot be done from code)

See `docs/store-listing.md` for copy-paste text: descriptions (EN/HE), Play Data Safety answers, Apple App Privacy answers, content-rating answers, background-location declaration text, review notes.

1. 👤 Create the app in Play Console and App Store Connect (bundle id `com.shvar.wallet`).
2. 👤 Upload screenshots (phone; iPad if `supportsTablet` stays true; 6.9"/6.5" iPhone sets).
3. 👤 Fill Data Safety / App Privacy / content rating / target audience (not for children).
4. 👤 Play: **Background location declaration** + a short demo video of the feature.
5. 👤 Apple: review notes explaining how to test nearby reminders and the demo flow.
6. 👤 `eas credentials` / first `eas submit` (Apple ID + App Store Connect API key; Play service-account JSON).

## D. Build & verification

- 🔨 `preview` Android APK from this branch for on-device testing (installable directly).
- iOS device builds need your Apple Developer account (device registration + signing); run `npx eas-cli build -p ios --profile production` interactively once.
- Checks run: typecheck, lint, 219 unit tests.
