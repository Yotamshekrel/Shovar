# Play Console: background-location demo video, shot-by-shot script

Purpose: the screen recording Google Play asks for with the **Background location** declaration (`ACCESS_BACKGROUND_LOCATION`). Reviewers check three things: the in-app **prominent disclosure**, the **runtime permission flow**, and the **feature that needs background access** actually working. Strings below are quoted from `src/i18n/en.ts` (English UI) and the screens in `src/app/settings/location.tsx` and `src/components/settings/LocationSection.tsx`.

## Before you record

- Use a **release-like build** (preview APK or the Play internal track build), not Expo Go or a dev client with the dev menu showing. The build must have the new `WRITE_SETTINGS` block (`app.json`) and be installed fresh (or after clearing storage) so no permissions are pre-granted.
- Device or emulator: Android 11+ (so the "Allow all the time" step appears on its own settings page, which is the flow most reviewers expect). A physical phone is best. If you use the emulator, you can fake movement with Extended Controls → Location → import `docs/simulate/azrieli-walk.gpx`, or `adb emu geo fix 34.7922 32.0741` (note: **longitude first** with `geo fix`).
- Set the app language to **English** (Settings → language, or system language). Hebrew-speaking reviewers are fine with English; keep one language for the whole video.
- Enable screen recording **with touches shown** (Developer options → "Show taps"), portrait, 1080p. Keep it under about 2 minutes; add short captions or a voice-over if you like.
- Pre-seed one card **before** recording so the notification has something to show: Home → **Add** → **Enter manually** → Store `Zara`, Amount `120`, save.
- Turn off other notifications and Do Not Disturb so the Shovar notification is clearly visible.
- Revoke state before the take: system Settings → Apps → Shovar → Permissions → remove Location and Notifications; in the app, keep "Remind me near stores" **off**.

## Shots

| # | On screen | Action | Exact strings to show | Why it matters |
|---|---|---|---|---|
| 1 | Home screen | Start recording on Home with the Zara card visible. Tap the **Settings** (gear) button. | Home title area; list shows "Zara" ₪120 | Shows the app and its normal state. |
| 2 | Settings | Scroll to the section **Nearby reminders**. Pause 2 s on it. | Section title `Nearby reminders`; row `Remind me near stores` (switch **off**); footer `Get a notification when you pass a store where you have credit.` | Shows the feature is **opt-in**, off by default, user-initiated. |
| 3 | Settings → disclosure | Tap the **Remind me near stores** switch. The full-screen explainer opens. **Do not scroll past it**: hold ~8 s and, if the text doesn't all fit, scroll slowly so each line is readable. | Title `Never miss credit you already have`. Body: `Shovar can remind you when you walk past a store where you have credit — for example “You have ₪120 at Zara, 150m away”.` Bullets: `Uses the system’s low-power geofencing, not constant GPS tracking.` · `Your exact location never leaves the device. Only store names and an approximate area (about 10 km) are used to look up branches.` · `Shovar collects your location in the background, even when the app is closed, only to show these reminders. Choose “Allow all the time” / “Always” to enable this.` Preview bubble: `Credit nearby`-style sample, `You have ₪120 credit at Zara, 150m away.` Buttons: `Turn on nearby reminders` / `Not now`. | This is the **prominent disclosure**. It names the data (location), says it is collected in the background even when the app is closed, and says the purpose (these reminders). It appears **before** any OS prompt. |
| 4 | Disclosure | Tap **Turn on nearby reminders**. | Button label `Turn on nearby reminders` | The user's affirmative action; the OS prompts only start after this tap. |
| 5 | OS dialog 1: foreground location | The system dialog "Allow Shovar to access this device’s location?" appears. Choose **While using the app** (and **Precise** or **Approximate**). | System UI | First step of the incremental request (`requestForegroundPermissionsAsync`). |
| 6 | OS dialog 2: notifications | Android 13+: "Allow Shovar to send you notifications?" Tap **Allow**. | System UI | Needed so the reminder can be shown. |
| 7 | OS settings: background location | On Android 11+, Shovar sends you to the app's location permission page. Tap **Allow all the time**. Pause 2 s with the selection visible, then go **Back** to the app. | System UI: "Location access for this app" → `Allow all the time` selected | The runtime **background** grant, shown on screen. |
| 8 | Back in Settings → Nearby reminders | The explainer closes. The switch is now **on**. Show the extra controls and the status line. | `Remind me near stores` (on) · `Watching N nearby stores` (N ≥ 1 after the refresh, may take a few seconds) · `Distance` chips `100 m / 150 m / 250 m / 400 m` · `Don’t repeat for` chips `4 h / 12 h / 24 h / 72 h` | Shows the feature is configurable and **how the user turns it off** (the same switch). |
| 9 | App closed | Press **Home**, then swipe the app away from Recents so it is **closed**. Show the launcher for ~2 s. Optionally open system Settings → Location → App location permissions to show `Shovar: Allowed all the time`. | Launcher / system UI | Demonstrates "even when the app is closed". |
| 10 | Move to the store | Trigger the move: walk physically, or play the GPX (Extended Controls → Location → Routes → `azrieli-walk.gpx` → Play route), or `adb emu geo fix` to a point outside then inside the store's geofence (the pinned or looked-up Zara location; the default radius is 150 m). Keep the phone locked or on the launcher. | Status bar location icon appears briefly | Entry into the geofence is the **only** thing that needs background access. |
| 11 | The notification | Pull down the shade (or let the heads-up appear). Hold on it ~4 s. | Title `Credit nearby`; body `You have ₪120 credit at Zara, 150m away.` (the distance number varies) | The user-visible feature the permission exists for. |
| 12 | Open it | Tap the notification. The card for Zara opens. | Card detail screen "Zara" ₪120 | Shows the notification leads to the credit, nothing else is collected or sent. |
| 13 | Turn-off path (optional, 10 s) | Settings → Nearby reminders → switch **off**. | Row `Remind me near stores` (off) | Shows an easy opt-out. |

## Voice-over / caption text (optional)

1. "Shovar is a private wallet for store credits and gift cards."
2. "Nearby reminders are optional and off by default."
3. "Before asking for any permission, Shovar explains that it uses location in the background, even when the app is closed, only to remind you when you are near a store where you have credit."
4. "Then the system asks for location, notifications and, finally, 'Allow all the time'."
5. "With the app closed, walking into the store's geofence shows this notification."
6. "Your exact location never leaves the device."

## Upload checklist

- Upload to YouTube as **unlisted** (Play wants a link), or per current Play Console instructions, and paste it into App content → Sensitive app permissions → Background location → video link.
- In the **declaration text**, use the paragraph under "Google Play — Background location declaration" in `docs/store-listing.md`. It must match what the video shows (feature name "Nearby credit reminders"/"Nearby reminders", opt-in screen first, position not sent off-device).
- The in-app strings above must be current. If any `locationPerm.*` or `settings.location*` string changes, re-record.
- Hebrew users: the same flow appears in Hebrew (`src/i18n/he.ts`); one English video is enough.

## Known caveats

- Flow and strings come from reading the code; the video has not been recorded or tested by me. In particular, the exact system-dialog wording and the "Allow all the time" page differ slightly by Android version and OEM.
