/**
 * Build-time configuration. Expo inlines `EXPO_PUBLIC_*` variables from `.env`
 * files / the EAS environment at bundle time (see README → Environment).
 *
 * Nothing secret is committed. Note that EXPO_PUBLIC_* values end up inside the
 * app bundle — for production, prefer the extraction proxy (server/) so the
 * Anthropic key stays on a server, or let each user paste their own key in
 * Settings (stored in the device keychain).
 */
export const env = {
  /** Development convenience only — bundled into the app. */
  anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '',
  /** Base URL of an Anthropic-compatible proxy that injects the key server-side (recommended for production). */
  anthropicBaseUrl: process.env.EXPO_PUBLIC_ANTHROPIC_BASE_URL ?? '',
  /** Vision model used for receipt extraction. */
  extractionModel: process.env.EXPO_PUBLIC_EXTRACTION_MODEL || 'claude-opus-5-5',
  /** Optional Google Places API key (store locations). Without it OpenStreetMap is used. */
  googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
};
