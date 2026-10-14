You're continuing store-release prep for Shovar (Expo SDK 57 / React Native, `com.shvar.wallet`) in this repo. A previous session audited it against App Store and Google Play requirements. Read these first, they are the source of truth:

- `app-store-prep/app-store-prep-report.md` (gap analysis)
- `app-store-prep/app-store-prep-action-plan.md` (prioritized work)
- `docs/RELEASE_PLAN.md` and `docs/store-listing.md` (existing decisions and drafted store text)
- `AGENTS.md` (project rules; follow them, including checking the versioned Expo docs before touching any Expo/EAS API)

Your job: finish every open item that can be done from this repo, and give me a precise checklist for the rest. Work through them in this order, using a progress plan.

## Do these yourself

1. **Block `WRITE_SETTINGS`.** It leaks into the Android manifest from `expo-brightness`, which is only used for window brightness in `src/app/item/[id]/checkout.tsx`. Add `android.permission.WRITE_SETTINGS` to `android.blockedPermissions` in `app.json`. Confirm with Expo docs that window brightness doesn't need it, and tell me to re-test checkout brightness on a device.
2. **App Store metadata.** Add to `docs/store-listing.md`, in English and Hebrew: a subtitle (30 characters max), keywords (100 characters max, comma separated, no spaces after commas), "What's New" for 1.0.0, and a promotional text. Count the characters and show me the counts.
3. **Support URL.** Make the landing page (`docs/index.html`, plus Hebrew strings in `docs/landing.js` if that's how it's localized) show a visible contact/support section with `yotamshekrel@gmail.com`. Note the landing page URL in `store-listing.md` as the Support URL. Leave the "Coming soon" badges alone until I say the apps are live.
4. **Apple review notes.** Extend the notes in `store-listing.md` with exact steps for a reviewer to see the nearby-reminder notification fire, using simulated location (`docs/simulate/azrieli-walk.gpx`) and whichever in-app path the app offers. Read `src/location/` to make the steps accurate; if there is no practical reviewer path, say so and propose a minimal demo-mode change, but don't build it without asking me.
5. **Play background-location demo script.** Write a shot-by-shot script for the screen recording (Settings toggle, disclosure screen, OS prompt, notification), with the exact app screens and strings from the code, saved as `app-store-prep/background-location-demo-script.md`.
6. **Production AI proxy.** Review `server/extraction-proxy.mjs` and add rate limiting (per client and global), request size limits, a daily spend cap, and a health endpoint, with tests in `test/server/`. Then **ask me** which host to deploy to before writing deployment files. Don't deploy anything yourself and don't create accounts. Prepare the exact `eas env:create` commands for `EXPO_PUBLIC_ANTHROPIC_BASE_URL` and `EXPO_PUBLIC_PROXY_CLIENT_TOKEN` (production environment) for me to run, with placeholders only.
7. **Submit config.** Prepare `eas.json` submit settings, leaving clearly marked placeholders for `ascAppId` and the Play service-account path. Do not invent IDs. List exactly what I need to create in App Store Connect and Play Console and which values to paste where.
8. **Console form answers.** Turn the drafts in `store-listing.md` into a single copy-paste sheet (`app-store-prep/console-answers.md`) for Play Data Safety, Apple App Privacy, content rating, target audience and the export-compliance questionnaire. Cross-check each answer against `app.json`, the merged permissions, `src/` network calls (Overpass, Photon, Google Places, Anthropic, link fetching) and the privacy policy at `docs/privacy/index.html`. Fix any inconsistency you find, in the policy or the answers, and tell me what you changed.
9. **Verify.** Run `npx tsc --noEmit`, `npx eslint .` and `npx jest`. If a native-affecting change was made, run `npx expo-doctor`. Report results honestly.

## Do not do

- Do not commit, push, or open PRs unless I ask. Leave changes in the working tree and show me `git status` at the end.
- Do not put any API key, token, keystore password or credential into any file or chat. Placeholders only.
- Do not delete or move the `.jks` files in the repo root; just tell me what to do with them.
- Do not put audit or internal files under `docs/`; GitHub Pages publishes that folder.
- Do not change the bundle ID or package name.
- Do not create developer accounts, submit builds, or run `eas submit`/`eas build` without asking.

## Things only I can do. Produce a final checklist for me, in order

- Rotate any Anthropic key that was ever used in a `.env.local` for a build I installed or shared.
- Identify which `.jks` is the Play upload key, back it up, and move the three files out of the project folder.
- Create the app records in App Store Connect and Play Console; verify both developer accounts.
- Run the first interactive iOS production build (creates the share-extension App ID, app group and profiles), then test via TestFlight on a real iPhone.
- Record the background-location demo video; enter the console forms.
- If my Play account is a new personal one: closed test with 12+ testers for 14 days.
- After release: BIS self-classification email by 1 Feb, and flip the landing-page badges from "Coming soon" to live links.

When done, give me a short summary: what changed (with file links), what you verified, what you couldn't, and the ordered list of what's left for me.
