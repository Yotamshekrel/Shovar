# Store listing material

Category: Finance (Play) / Finance or Lifestyle (App Store). Price: free. Not designed for children.
Support email: yotamshekrel@gmail.com · Privacy policy: https://yotamshekrel.github.io/Shovar/privacy/
Support URL (App Store Connect "Support URL", Play "Website"): https://yotamshekrel.github.io/Shovar/ (has a visible Support section with the email, `#support`) · Marketing URL: same.

## Name / short description
- EN: **Shovar – Store Credit Wallet** · "Keep every store credit and gift card in one private wallet."
- HE: **שובר – ארנק זיכויים** · "כל הזיכויים ושוברי המתנה במקום אחד, פרטי ומוצפן."

## App Store metadata (counts are characters, verified)

| Field | Limit | EN | HE |
|---|---|---|---|
| Subtitle | 30 | `Gift cards & store credit` (25) | `זיכויים וכרטיסי מתנה במקום אחד` (30) |
| Keywords | 100 | `voucher,coupon,refund,receipt,expiry,reminder,balance,barcode,qr,return,israel,hebrew,nearby` (92) | `קופון,החזרה,קבלה,תוקף,תזכורת,יתרה,ברקוד,תו שי,גיפט,ישראל,סריקה,פתק החלפה` (72) |
| Promotional text | 170 | `Stop losing free money. Snap a receipt, get reminded before a credit expires and when you walk past the store. Free, private, no account.` (137) | `די לזרוק כסף לפח. מצלמים קבלה, ומקבלים תזכורת לפני שהזיכוי פג וגם כשעוברים ליד החנות. חינם, פרטי, בלי הרשמה.` (108) |
| What's New (1.0.0) | 4000 | see below (248) | see below (189) |

Keywords: no spaces after commas; Apple already indexes the app name and subtitle, so those words (shovar, store, credit, wallet, gift, cards) are not repeated; no third-party brand names (guideline 2.3.7).

**What's New 1.0.0 (EN):**
First release. Add store credits, return notes and gift cards from a photo or by hand, get reminders before they expire and when you are near the store, search "do I have credit here?", and show the barcode at checkout. Works in English and Hebrew.

**What's New 1.0.0 (HE):**
הגרסה הראשונה. מוסיפים זיכויים, פתקי החלפה וכרטיסי מתנה מצילום או ידנית, מקבלים תזכורת לפני שהתוקף פג וגם כשנמצאים ליד החנות, מחפשים "יש לי זיכוי כאן?" ומציגים ברקוד בקופה. בעברית ובאנגלית.

Play Store short description (80 max) is the one-liner under "Name / short description" above; the App Store subtitle is the shorter field.

## Full description (EN)
Shovar keeps every store credit, return note and gift card in one private wallet, so you always know what you have, where, and until when.

• Snap a receipt and confirm — the details are read on your phone, with optional AI reading if you add your own key.
• "Do I have credit here?" — instant search that understands Hebrew and English spellings.
• Nearby reminders (optional) — "You have ₪120 at Zara, 150 m away".
• Expiry reminders before credit runs out.
• Checkout view with barcode / QR / big text.
• Private by design — no account, no servers of ours. Codes and PINs are encrypted; lock with Face ID / fingerprint.

## Full description (HE)
שובר שומר את כל הזיכויים, שוברי ההחזרה ושוברי המתנה שלכם בארנק פרטי אחד, כך שתמיד תדעו מה יש לכם, איפה ועד מתי.

• מצלמים קבלה ומאשרים — הפרטים נקראים במכשיר שלכם, עם קריאת AI אופציונלית אם תוסיפו מפתח משלכם.
• "יש לי זיכוי כאן?" — חיפוש מיידי שמבין כתיב בעברית ובאנגלית.
• תזכורות בקרבת מקום (אופציונלי) — "יש לך ₪120 בזארה, במרחק 150 מ׳".
• תזכורות לפני שהתוקף פג.
• תצוגת קופה עם ברקוד / QR / טקסט גדול.
• פרטי מהיסוד — בלי חשבון ובלי שרתים שלנו. קודים מוצפנים, נעילה בטביעת אצבע / Face ID.

## Google Play — Data safety
- Data collected/shared: **Yes, optional features only**
  - Approximate location → shared with third parties (OpenStreetMap services) · purpose: App functionality · optional · not collected by developer.
  - Photos (receipt images) → shared with service provider (Anthropic) · purpose: App functionality · optional, only if the user enters their own Anthropic key and consents.
- Data encrypted in transit: Yes (HTTPS). Users can request deletion: no data held by developer; in-app "Delete all data".
- No ads, no analytics, no data sold. Precise location: processed on device only, not collected.

## Google Play — Background location declaration
Feature: "Nearby credit reminders" — notifies the user when they are near a store where they hold credit. Core to the app's purpose; requires geofencing while the app is closed. Opt-in via an in-app screen explaining this before the OS prompt (Settings → Nearby reminders). Position is never sent off-device. Provide a screen recording of: settings toggle → disclosure screen → OS permission → notification.

## Apple — App Privacy ("nutrition label")
- Data **Not Linked to You**, not used for tracking: Coarse Location (App Functionality), Photos or Videos (App Functionality), Other User Content (App Functionality). These match `ios.privacyManifests`.
- Tracking: No.

## Age rating
No user-generated content, no violence/gambling/etc. → Everyone / 4+. Target audience: 18+ (not children).

## App Review notes (Apple)

No login or account. All data stays on the device; there is nothing to sign in to.

**Basic flow.** Home → **Add** → **Enter manually** → Store "Zara", Amount 120 → save. Receipts are read on-device; nothing is uploaded. AI reading is an optional extra that stays off unless the user enters their own Anthropic API key in Settings → Advanced; the reviewer does not need one. (If a key is entered, a consent prompt "Read receipts with AI?" appears before any image is sent.)

**Nearby reminders (optional, off by default).** Settings → **Nearby reminders** → switch on **Remind me near stores**. An explainer screen ("Never miss credit you already have") states that location is used in the background, even when the app is closed, only for these reminders, then the system prompts follow: *While Using* → *Always* (upgrade), and Notifications. The exact location never leaves the device; only store names and an approximate (~10 km) area are used to look up branches.

**Foreground check without waiting for a notification.** Home → **What's around me?** shows which of your stores have a branch within the scan radius using foreground location only. On a simulator or device set to Tel Aviv (32.0741, 34.7922, Azrieli Mall) with a "Zara" or "Super-Pharm" card, branches show up from OpenStreetMap data (internet needed).

**Seeing the reminder notification fire (needs a simulator or a Mac with Xcode; a reviewer on a physical device away from Israel cannot trigger it).** The notification is delivered by an OS geofence *entry* event, so the position must move from outside a store's geofence to inside it:
1. Set location to Tel Aviv: Simulator → Features → Location → Custom Location → `32.0741, 34.7922`.
2. Add a manual card for a store that has a branch at Azrieli Mall, e.g. **Zara**, amount 120.
3. Settings → Reminders → Nearby reminders → turn on, allow *While Using*, *Always* and Notifications.
4. Move away: Custom Location → `32.0853, 34.7818` (Rabin Square, about 2 km away) and keep the app open for a moment while it looks up nearby branches (Settings → Reminders → Nearby shows "Watching N nearby stores").
5. Move back inside: play `docs/simulate/azrieli-walk.gpx` (Xcode → Debug → Simulate Location with the GPX added to the scheme), or set Custom Location to `32.0741, 34.7922` again. Background the app. The notification "Credit nearby – You have ₪120 credit at Zara, …m away." (the distance varies) should appear.
Per-store repeats are suppressed for the cooldown set in the same Settings section ("Don't repeat for", default 12 h); use 4 h or change the card to re-test.
> Status: this path was derived from reading `src/location/` and has not been run on a device. There is no in-app "test reminder" button. If review needs a deterministic path on a real device, a small demo-mode action would be required (not built; see summary).
