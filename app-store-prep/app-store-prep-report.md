# Shovar — repo verification report & gap analysis

Audited 2026-10-14 on `main` (clean tree).

## Summary

```
Platform: iOS (App Store)
  ✅ Complete  11     ❌ Missing  1     ⏳ Partial  6     ⚠️ Manual  4
Platform: Android (Google Play)
  ✅ Complete  14     ❌ Missing  1     ⏳ Partial  5     ⚠️ Manual  3
```

The repo is in good shape. The code-side work (privacy manifest, permissions, assets, policy page, localization) is nearly done. The remaining gaps are mostly account and console work, plus three things worth fixing before the first build.

## Checks run
- `npx tsc --noEmit` — clean
- `npx eslint .` — clean
- `npx jest` — 16 suites, 240 tests, all pass
- `https://yotamshekrel.github.io/Shovar/privacy/` and `/Shovar/` — HTTP 200
- Tracked-file scan for keystores, `.env`, provisioning files — none tracked (`*.jks`, `.env*` are gitignored)
- Git history scan for Anthropic key patterns (`sk-ant-…`) — none found
- Merged release manifest: target SDK 36, min 24

## Gaps

### 1. Production AI backend is not decided or deployed (blocks the AI feature)
`RELEASE_PLAN.md` B8 is still open. Without `EXPO_PUBLIC_ANTHROPIC_BASE_URL` in the EAS production environment, store builds have no AI receipt reading unless the user pastes their own key. The privacy policy and listing both advertise it. Also:
- `server/extraction-proxy.mjs` needs rate limiting before it faces the internet (the release plan says so).
- `EXPO_PUBLIC_PROXY_CLIENT_TOKEN` is inlined into the JS bundle, so anyone can extract it. Treat it as a speed bump and rely on server-side rate limits and spend caps.
- If any earlier local or preview build was made with an `EXPO_PUBLIC_*` Anthropic key in `.env.local`, that key is inside the installed APK. Rotate it. (Git history itself is clean.)

### 2. `WRITE_SETTINGS` permission in the merged Android manifest
It comes from `expo-brightness`. The app only calls `setBrightnessAsync` for the checkout screen (`src/app/item/[id]/checkout.tsx`), which changes window brightness and doesn't need it. Play treats it as a sensitive permission. Add `android.permission.WRITE_SETTINGS` to `android.blockedPermissions`, then confirm in a fresh build that brightness still works.

### 3. Background location is the highest review risk on both stores
- **Play:** the declaration text exists, but the required demo video does not. Record: Settings toggle → disclosure screen → OS prompt → notification.
- **Apple:** review notes mention the feature but don't show how a reviewer can trigger it. Note the simulated-location route (`docs/simulate/azrieli-walk.gpx`) or add a demo-mode path.

### 4. Credentials and submit config
- Three keystores sit loose in the repo root: `@yotamshekrel__shvar.jks`, `_OLD_1`, `_OLD_2` (gitignored, not committed). Confirm which one is the upload key registered with Play or held by EAS, back it up in a password manager, and move them out of the project folder.
- `eas.json` `submit.production.ios` is `{}` and Android has no `serviceAccountKeyPath`.
- The share extension needs its own App ID, app group and profile; run the first iOS production build interactively.

### 5. Store metadata not yet written
- App Store keywords (100 chars) and "What's New" text, EN + HE.
- A Support URL field (use the landing page or add a Contact section).
- Subtitle for the App Store (30 chars); the short description currently exceeds that.

### 6. Console forms (cannot be done from code)
Data Safety, App Privacy, content rating, target audience, export-compliance questionnaire. Answers are drafted in `docs/store-listing.md`.

### 7. Cosmetic
- Landing page badges say "Coming soon" (`docs/index.html:59,63,498,502`). Update once the apps are live.
- `USE_FINGERPRINT` is deprecated; harmless alongside `USE_BIOMETRIC`.
- `app-store-prep/` is **not** under `docs/`, deliberately: `docs/` is published by GitHub Pages.

## Items you must verify yourself
Apple and Google accounts and verification, the 12-tester/14-day closed test if the Play account is a new personal one, a TestFlight run on a physical iPhone, a release-build smoke test on Android (R8/Hermes), and whether the privacy policy matches the final proxy host.
