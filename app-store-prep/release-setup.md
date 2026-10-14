# Release setup: what you run and what you create

Everything here is for you to run. Nothing was deployed, submitted or created for you. All values in `<ANGLE_BRACKETS>` are placeholders; never paste real keys or tokens into this repo or into chat.

## 1. AI: bring-your-own-key only (nothing to set up)

Decision: no Anthropic key in the build and no hosted backend. The proxy (`server/`) and the `EXPO_PUBLIC_ANTHROPIC_BASE_URL` / `EXPO_PUBLIC_PROXY_CLIENT_TOKEN` variables were removed from the code. Users who want AI reading paste their own key in Settings → Advanced. Nothing to run for this step, except: make sure no `EXPO_PUBLIC_ANTHROPIC_*` variable exists in the EAS environments (`npx eas-cli@latest env:list --environment production`), and rotate any Anthropic key that was ever in a `.env.local` used for a build you installed or shared.

## 2. `eas.json` submit settings (placeholders to fill)

`submit.production` now contains:

- `ios.ascAppId`: `"REPLACE_WITH_APP_STORE_CONNECT_APP_ID"`. Replace with the numeric **Apple ID** of the app record (App Store Connect → your app → App Information → General Information → "Apple ID", about 10 digits). Submitting with the placeholder will fail loudly.
- `android.serviceAccountKeyPath`: `"$GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH"`. EAS expands environment variables, so export the path to the JSON key that lives **outside** the repo, e.g. `export GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH=~/secrets/play-service-account.json` before `eas submit`. (Alternative: upload the key to EAS with `npx eas-cli@latest credentials -p android`, then delete this line.) `*service-account*.json` is now in `.gitignore` as a safety net.
- Existing: `android.track = internal`, `releaseStatus = draft`.

Optional extras (not set): `ios.appleId`, `ios.appleTeamId`, `ios.ascApiKeyPath` / `ascApiKeyId` / `ascApiKeyIssuerId` (an App Store Connect API key avoids Apple ID prompts in CI).

## 3. What to create, and where each value goes

### App Store Connect
1. Join/verify the Apple Developer Program ($99/yr), then App Store Connect → Apps → **+ → New App**: platform iOS, name `Shovar – Store Credit Wallet`, primary language English (add Hebrew localization), bundle ID `com.shvar.wallet` (appears after the first EAS iOS build registers it, or register it in Certificates, Identifiers & Profiles), SKU anything unique.
2. Copy the app's numeric **Apple ID** into `eas.json` → `submit.production.ios.ascAppId`.
3. Paste from `docs/store-listing.md` / `app-store-prep/console-answers.md`: subtitle, keywords, promotional text, description, What's New, Support URL, Privacy Policy URL, App Review notes, App Privacy answers, age rating, export compliance.
4. Upload screenshots from `docs/store-assets/` (6.9" and 6.5" iPhone sets; the app is phone-only).
5. Optional: App Store Connect API key (Users and Access → Integrations) for non-interactive submits.

### Google Play Console
1. Create/verify the developer account (identity verification can take days; if it is a new **personal** account, a closed test with at least 12 testers for 14 days is required before production).
2. Create app: name `Shovar – Store Credit Wallet`, default language English, App, Free.
3. Paste from `app-store-prep/console-answers.md`: Data safety, content rating, target audience, ads, app access, financial features, background-location declaration; privacy policy URL.
4. Upload the demo video link (see `app-store-prep/background-location-demo-script.md`) in the Background location declaration.
5. Create a **service account** (Play Console → Setup → API access, linked Google Cloud project), grant it release permissions for this app, download the JSON key to a folder **outside** the repo, and point `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_PATH` at it.
6. Upload graphics from `docs/store-assets/` (512 icon, feature graphic, phone screenshots EN + HE).
7. First upload: Play requires the very first AAB to be uploaded manually in the console (the API can't create the first release); after that `eas submit -p android --profile production` works.

## 4. The `.jks` files (done)

The three files in the repo root (`@yotamshekrel__shvar.jks`, `_OLD_1`, `_OLD_2`) turned out to be **byte-identical** (same SHA-256), so there is only one keystore. They were copied, verified and removed from the project folder; the one copy now lives in `~/secrets/shovar-keystores/` (folder mode 700, files 600; only the first of the three is needed, the other two are duplicates). Still do: put that file, its alias and its passwords into your password manager as the Play **upload key** backup (EAS also holds the credentials the builds are signed with).

## 5. First iOS production build (interactive, yours to run)

```bash
npx eas-cli@latest build -p ios --profile production
```

Run it interactively once, sign in with the Apple account, and accept the prompts that create: the App ID `com.shvar.wallet`, the **share extension** App ID `com.shvar.wallet.expo-sharing-extension`, the app group `group.com.shvar.wallet`, and the distribution certificate and provisioning profiles. Then install via TestFlight on a real iPhone and test: add card, share-sheet import, Face ID lock, notifications, nearby reminders.
