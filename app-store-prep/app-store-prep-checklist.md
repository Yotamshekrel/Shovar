# Shovar — store requirement checklists

Audited 2026-10-14 · Expo SDK 57 · RN 0.86 · `com.shvar.wallet` · v1.0.0
Legend: ✅ done · ⏳ partial · ❌ missing · ⚠️ manual check

## App Store (iOS)

| Category | Requirement | Status | Evidence / note |
|---|---|---|---|
| Identity | Bundle ID | ✅ | `com.shvar.wallet` (`app.json`) |
| Identity | Version / build number | ✅ | `1.0.0`; `eas.json` `appVersionSource: remote` + `autoIncrement` |
| Assets | 1024² icon, no alpha | ✅ | `assets/images/icon.png` 1024×1024 RGB |
| Assets | iPhone 6.9" screenshots | ✅ | 4 EN + 4 HE, 1320×2868 |
| Assets | iPhone 6.5" screenshots | ✅ | 4 EN + 4 HE, 1284×2778 |
| Assets | iPad screenshots | ✅ n/a | `supportsTablet: false` |
| Assets | App preview video | ⚠️ optional | none |
| Metadata | Name, subtitle, description, keywords (EN + HE) | ⏳ | Name/short/description in `docs/store-listing.md`; **keywords and "what's new" not written** |
| Metadata | Support URL | ⏳ | Only a support email is listed; the live landing page (`/Shovar/`, HTTP 200) can serve as the URL |
| Metadata | Privacy policy URL | ✅ | `https://yotamshekrel.github.io/Shovar/privacy/` returns 200, EN + HE; also in `extra.legal` |
| Metadata | Category / age rating | ⏳ | Category chosen (Finance); age answers drafted — answer Apple's current age-rating questionnaire in ASC |
| Privacy | Privacy manifest | ✅ | `ios.privacyManifests` with required-reason APIs + collected types |
| Privacy | App Privacy "nutrition label" | ⏳ | Answers drafted in `store-listing.md`; must be entered in ASC |
| Privacy | Purpose strings (camera, photos, Face ID, location) | ✅ | all via plugins in `app.json` |
| Compliance | Export compliance | ⏳ | `ITSAppUsesNonExemptEncryption: true` set; questionnaire answers in `RELEASE_PLAN.md` A8; BIS self-classification email due by 1 Feb after release |
| Compliance | Background location justification | ⏳ | Review notes exist; add a way for the reviewer to see it fire (`docs/simulate/azrieli-walk.gpx`) |
| Build | Share extension signing | ⚠️ | `expo-sharing-extension` + app group `group.com.shvar.wallet` need extra App ID/profile (EAS creates them on first interactive build) |
| Build | `eas submit` iOS config | ❌ | `submit.production.ios` is `{}` — needs `ascAppId` or interactive login |
| Account | Apple Developer Program ($99/yr), app record in ASC | ⚠️ | cannot verify |
| Testing | TestFlight run on a real device | ⚠️ | cannot verify |

## Google Play (Android)

| Category | Requirement | Status | Evidence / note |
|---|---|---|---|
| Identity | Package name | ✅ | `com.shvar.wallet` |
| Identity | versionCode / versionName | ✅ | `1` / `1.0.0` (EAS remote versioning) |
| Identity | Target / min SDK | ✅ | target 36, min 24 (RN 0.86 defaults) |
| Assets | 512×512 icon | ✅ | `docs/store-assets/android/play-icon-512.png` |
| Assets | Feature graphic 1024×500 | ✅ | EN + HE |
| Assets | Phone screenshots (2–8) | ✅ | 4 EN + 4 HE, 1080×1920 |
| Assets | Adaptive icon (fg / bg / monochrome) | ✅ | 1024² layers |
| Metadata | Short (≤80) + full description | ✅ | EN + HE in `store-listing.md` |
| Metadata | Privacy policy URL | ✅ | live |
| Metadata | Support email | ✅ | yotamshekrel@gmail.com |
| Build | AAB production profile | ✅ | `eas.json` |
| Build | Upload keystore | ⚠️ | EAS-managed or the `.jks` files in the repo root; see gap analysis |
| Build | `eas submit` Android | ⏳ | internal/draft set, but no `serviceAccountKeyPath` |
| Policy | Permissions declared + minimized | ⏳ | `blockedPermissions` set, but merged manifest still has `WRITE_SETTINGS` |
| Policy | Background location declaration + video | ❌ | text drafted; screen recording not made |
| Policy | Prominent in-app disclosure | ✅ | per `RELEASE_PLAN.md` A5 |
| Policy | Data safety form | ⏳ | answers drafted, must be entered in Play Console |
| Policy | Content rating, target audience | ⏳ | answers drafted (18+, not for children) |
| Policy | Account deletion | ✅ n/a | no accounts; in-app "Delete all data" |
| Account | Verified developer identity | ⚠️ | cannot verify |
| Account | New personal account: closed test with ≥12 testers for 14 days | ⚠️ | applies if the account is a new personal one |
