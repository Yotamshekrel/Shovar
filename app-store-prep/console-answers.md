# Console answers: copy-paste sheet

Source of truth for these answers: `app.json`, the merged permissions, the network calls in `src/`, and the privacy policy (`docs/privacy/index.html`). Where I had to make a judgment call it is marked **JUDGMENT**; read those before submitting. Form wording changes over time, so match each answer to the question's intent if the exact wording differs.

## 0. Facts these answers rest on

| Fact | Evidence |
|---|---|
| No accounts, no login, no ads, no analytics, no crash reporting, no purchases | `package.json` has none of those SDKs; policy §2 |
| Android permissions (merged): `INTERNET`, `ACCESS_NETWORK_STATE`, `CAMERA`, `VIBRATE`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `USE_BIOMETRIC`, `USE_FINGERPRINT` (deprecated, harmless), `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` | `app.json` → `android.permissions`, library manifests |
| Removed from the manifest: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE`, and now `WRITE_SETTINGS` | `app.json` → `android.blockedPermissions`; verified with a throwaway `expo prebuild` that the generated manifest shows `tools:node="remove"` for it |
| No advertising ID permission, no foreground service | not in manifest; `isAndroidForegroundServiceEnabled: false` |
| Photos via the system picker / camera only (no `READ_MEDIA_*`) | `expo-image-picker`, no media permission declared |
| iOS: background location mode, location while-in-use + always strings, camera, photos, Face ID strings; no microphone | `app.json` |
| iOS privacy manifest: no tracking; collected types = Coarse Location, Photos or Videos, Other User Content, all not linked, App Functionality | `app.json` → `ios.privacyManifests` |
| Push: only **local** notifications are scheduled; no push token is requested or sent anywhere | `grep PushToken src` finds nothing |
| Encryption: own AES-256-GCM (`@noble/ciphers`) for codes/PINs at rest; HTTPS for all network calls | `ITSAppUsesNonExemptEncryption = true`; policy §1 |

### Network calls from the app (what leaves the device)

| Call | Trigger | What is sent | Destination |
|---|---|---|---|
| AI receipt reading (**off unless the user enters their own Anthropic key**; default store build reads receipts on-device and uploads nothing) | User has entered a key in Settings → Advanced and has consented (consent screen + Settings toggle) | The chosen image (JPEG, max 1568 px) or PDF, plus the fixed extraction prompt | Anthropic API, directly from the phone with the user's key. No developer server in between (no proxy exists) |
| Branch lookup, reminders | Nearby reminders switched on | Store name + centre of a ~11 km grid cell (0.1°) | Photon (`photon.komoot.io`), Overpass (`overpass-api.de`, `overpass.private.coffee`); Google Places only if the user adds their own key (or a build-time key, not set for release) |
| Branch lookup, "What's around me" | User taps the button | Store name + centre of a ~2 km grid cell (0.02°) | same providers |
| Link import | User pastes or shares a gift-card link | A GET to that URL | The linked website (sees the IP address) |
| Directions, privacy policy, OSM copyright | User taps | Opens Apple/Google Maps or the browser | Those apps/sites |

Exact GPS position is never sent. No data goes to any server operated by the developer: there is no proxy or backend (the code for one was removed).

---

## 1. Google Play

### Store listing basics
- App name: `Shovar – Store Credit Wallet` · Short description: `Keep every store credit and gift card in one private wallet.` (60/80)
- Category: Finance is the draft in `docs/store-listing.md`. **JUDGMENT:** Finance can trigger the "Financial features" declaration and more scrutiny on both stores. The app holds no money, makes no payments and gives no loans; "Productivity" or "Shopping" (Play) / "Lifestyle" or "Shopping" (Apple) avoid that. If you keep Finance, answer the financial-features question as below.
- Privacy policy URL: `https://yotamshekrel.github.io/Shovar/privacy/`
- Website / support: `https://yotamshekrel.github.io/Shovar/` · Email: `yotamshekrel@gmail.com`

### App content
| Question | Answer |
|---|---|
| App access | All functionality is available without special access (no login). |
| Ads | No, the app contains no ads. |
| Target audience | **18 and over** only. Not designed for children; does not appeal to children. |
| News app | No |
| COVID-19 contact tracing/status | No |
| Government app | No |
| Health apps / health features | No |
| Financial features | "My app doesn't provide any financial features" (it stores user-entered credit/gift-card info locally; no payments, loans, banking, crypto, trading). **JUDGMENT** if category is Finance. |
| Data deletion / account creation | The app has no account creation. |
| Advertising ID | No, the app does not use the advertising ID. |
| Photo and video permissions | Not applicable (no `READ_MEDIA_IMAGES/VIDEO`; system photo picker + camera). |
| Foreground service, exact alarms, etc. | None declared. |

### Content rating (IARC questionnaire)
Category: **Utility, Productivity, Communication or Other**. Answer **No** to: violence, blood, sexual content/nudity, profanity, controlled substances, gambling or simulated gambling, horror/fear, discrimination, user-generated content, user-to-user communication, sharing the user's location with other users, digital purchases, unrestricted internet browsing. Expected result: **Everyone / PEGI 3 / IARC 3+**. (Expected, not guaranteed; the console computes the real rating.)

### Data safety
Top-level questions:
- Does your app collect or share any of the required user data types? **Yes** (optional features only).
- Is all of the user data collected by your app encrypted in transit? **Yes** (every endpoint the app calls is HTTPS; a link the user pastes could be `http://`, but nothing but a GET request is sent to it).
- Do you provide a way for users to request that their data be deleted? **Yes**: Settings → Delete all data (all data is on the device); no server-side copy exists. No deletion-request URL needed (no accounts).

Data types (declare **only** these; all other categories: not collected):

| Category → type | Collected | Shared | Optional? | Purpose | Notes |
|---|---|---|---|---|---|
| Location → **Approximate location** | Yes | Yes (OpenStreetMap-based lookup services: Photon, Overpass) | Yes (user turns on Nearby reminders / taps "What's around me") | App functionality | Only a rounded grid-cell centre, never exact. Declared as "shared" to be conservative. |
| Photos and videos → **Photos** | Yes | Yes (Anthropic, only with the user's own key) | Yes (optional; off by default; consent first) | App functionality | The receipt photo the user picks. |
| Files and docs → **Files and docs** | Yes | Yes (Anthropic) | Yes | App functionality | Receipt **PDFs**, same path. *Added: the old draft only listed photos.* |

- **Precise location:** do **not** declare as collected. The OS-level fine/background location is processed on the device only (geofencing); it is not transmitted. State this in the "why" boxes if asked.
- **JUDGMENT, financial info:** the images sent to Anthropic can show store-credit amounts and codes. Google's categories are about what the app *collects as data*, and no financial data is read or stored off device by us, so only Photos and Files are declared. If you prefer the most cautious route, also tick Financial info → "Other financial info", Collected + Shared, optional, app functionality.
- **Not collected / not shared:** personal info, contacts, messages, app activity, web browsing, device or other IDs, audio, health, calendar, crash logs, diagnostics.
- Security practices: data encrypted in transit **Yes**; "committed to Play Families policy" **No** (not for children); independent security review **No**.

### Background location declaration (Sensitive app permissions)
- Feature name: **Nearby credit reminders** (Settings → Nearby reminders).
- Why it needs background access: notifies the user when they come near a store where they hold credit, while the app is closed; this is a core, user-requested feature and requires OS geofencing, which only fires in the background.
- Paste: "Shovar notifies the user when they are near a store where they hold store credit or a gift card. The user turns the feature on in Settings → Nearby reminders; before any permission prompt, a full-screen disclosure states that location is used in the background, even when the app is closed, only to show these reminders. The app uses the system's low-power geofencing (no continuous tracking). The user's position is processed on the device only and is never sent to any server; only store names and a rounded area are used to look up branch locations."
- Video link: from `app-store-prep/background-location-demo-script.md` (you record it).
- Foreground-only alternative considered? Reminders cannot work foreground-only. The foreground "What's around me" scan is offered separately and needs no background permission.

---

## 2. Apple App Store Connect

### App Privacy ("nutrition label")
- Do you or your third-party partners collect data from this app? **Yes**.
- Tracking: **No**; no tracking domains; no data used for tracking.

| Data type | Collected | Linked to user | Used for tracking | Purpose |
|---|---|---|---|---|
| Location → **Coarse Location** | Yes | **No** | No | App Functionality |
| User Content → **Photos or Videos** | Yes | **No** | No | App Functionality |
| User Content → **Other User Content** (receipt PDFs) | Yes | **No** | No | App Functionality |

Everything else: not collected. These match `ios.privacyManifests.NSPrivacyCollectedDataTypes` exactly. (**JUDGMENT:** Apple lets you omit data processed only transiently by a service provider and not retained, which could allow fewer disclosures; the conservative set above over-declares rather than risks a mismatch.)

### Age rating
All content descriptors **None / No** (violence, sexual, profanity, drugs, gambling, horror, medical); no user-generated content; no messaging; no advertising; no unrestricted web access (the app only opens the privacy policy and pages the user taps). Expected: **4+**. Target audience in Play is 18+, but "not for children" is expressed there; Apple's rating stays 4+ and the app is not placed in the Kids category.

### Other App Store Connect fields
- Category: see the JUDGMENT note above (Finance vs Lifestyle/Shopping). Price: Free. Availability: your choice (Israel at least).
- Content Rights: "Does your app contain, show, or access third-party content?" → **Yes, licensed**: map data from OpenStreetMap (ODbL, attribution is shown in Settings → About → Data sources). Store names in the examples are placeholders and user data. **JUDGMENT:** confirm you are comfortable with this answer.
- Support URL / Marketing URL: `https://yotamshekrel.github.io/Shovar/` · Privacy Policy URL: `https://yotamshekrel.github.io/Shovar/privacy/`
- Sign-in required: **No** (no demo account needed).
- App Review notes: paste the "App Review notes (Apple)" block from `docs/store-listing.md`.
- Subtitle, keywords, promotional text, What's New: from the metadata table in `docs/store-listing.md`.

### Export compliance
App has `ITSAppUsesNonExemptEncryption = true` (own AES-256-GCM for data at rest, plus HTTPS). Answer the questionnaire like this (this is the conservative path described in `docs/RELEASE_PLAN.md` A8):

1. Does your app use encryption? **Yes**.
2. Is it exempt only because it uses encryption within Apple's OS? **No**: the app ships its own AES-256-GCM.
3. Does it use proprietary or non-standard algorithms? **No**: AES-GCM and HTTPS/TLS are standard.
4. Does it use standard algorithms instead of or in addition to Apple's? **Yes** → this qualifies the app for the **mass-market / self-classification** exemption (no export licence). If a "France" question appears: either distribute with the required declaration or exclude France.
5. After release: send the annual **BIS self-classification report** (by 1 February each year the product is shipped).
Each new build asks the encryption question again unless you supply a compliance code; Apple gives you one after the first answered submission.

---

## 3. Inconsistencies found and what changed

| # | Found | Action |
|---|---|---|
| 1 | Policy and landing FAQ said location is rounded to "about 10 km" for branch lookups, but "What's around me" sends a ~2 km grid centre (`SCAN_CELL_DEG = 0.02`). | **Fixed** in `docs/privacy/index.html` (EN + HE) and `docs/index.html` + `docs/landing.js` FAQ: now "about 10 km for reminders, about 2 km for What's around me". |
| 2 | Policy mentioned "a proxy operated for the app", which no longer exists (decision: no hosted proxy for launch). | **Fixed**: policy now says AI reading goes directly from the phone with the user's own key, only if they enter one; otherwise nothing is uploaded (EN + HE). Landing FAQ and in-app strings updated to match. |
| 3 | Policy listed "OpenStreetMap Overpass servers" without naming them; the app also uses `overpass.private.coffee`. | **Fixed**: hosts named. Also notes third parties see the IP address. |
| 4 | Data safety draft omitted **Files and docs** (receipt PDFs go to Anthropic too). | **Fixed** in this sheet (and Apple's "Other User Content" already covered it). |
| 5 | Policy "Last updated" date. | Updated to 14 October 2026. |
| 6 | In-app disclosure `locationPerm.point2` says "approximate area (about 10 km)". | **Left as is**: that screen is the reminders feature only, where 10 km is correct. The scan feature has no equivalent text; it uses foreground location and only the policy describes the 2 km grid. |
| 7 | `docs/store-listing.md` said "Data encrypted in transit: Yes". | Still true for the app's own endpoints; a user-pasted `http://` link is the only exception (only a GET is sent). Noted above. |
| 8 | Store copy sold AI reading as a built-in feature; in the launch build it needs the user's own key. | **Fixed** in listing text (EN + HE), review notes, landing FAQ; `scan.notConfigured` no longer says "see README". |

The policy's "we do not collect, receive or store your data" is now literally true: with no proxy, nothing passes through any server of yours.
