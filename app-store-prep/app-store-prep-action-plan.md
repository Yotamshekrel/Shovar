# Shovar — action plan (by effort)

## 🟢 Quick fixes (< 1 hour)
1. Block `android.permission.WRITE_SETTINGS` in `app.json` → `android.blockedPermissions`; verify checkout brightness still works. (10 min)
2. Write App Store keywords, subtitle (≤30 chars) and "What's New", EN + HE; add to `docs/store-listing.md`. (30 min)
3. Pick a Support URL (landing page) and add a visible contact line to `docs/index.html`. (10 min)
4. Move the three `.jks` files out of the project folder; record which one is the Play upload key. (10 min)
5. Add the location-simulation path to the Apple review notes. (10 min)

## 🟡 Medium effort (1–4 hours)
1. ~~Deploy the AI proxy~~ Dropped: no hosted AI; users bring their own key (proxy code removed).
2. Rotate any Anthropic key that was ever placed in a local `.env.local` used for a distributed build. (15 min)
3. Record the background-location demo video for Play. (45 min)
4. Create the app records in App Store Connect and Play Console; fill `ascAppId` and the Play service-account JSON in `eas.json` / EAS. (1–2 h)
5. First interactive iOS production build to create the share-extension App ID, app group and profiles; install via TestFlight on a real iPhone. (1–2 h)
6. Fill in Data Safety, App Privacy, content rating, target audience and the export-compliance questionnaire from `docs/store-listing.md`. (1–2 h)

## 🔴 Significant / calendar time
1. Play: if the developer account is a new personal one, run a closed test with ≥12 testers for 14 days before production access.
2. Account verification for both stores (identity checks can take days).
3. After release: BIS self-classification email by 1 Feb, flip the landing-page badges from "Coming soon" to live links.

## Suggested order
Quick fixes → build a preview APK and a TestFlight build → console forms and videos → closed test → production.
