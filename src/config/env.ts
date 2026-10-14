/**
 * Build-time configuration. Expo inlines `EXPO_PUBLIC_*` variables from `.env`
 * files / the EAS environment at bundle time (see README → Environment).
 *
 * Nothing secret is committed. EXPO_PUBLIC_* values end up inside the app
 * bundle, so no Anthropic key is ever read from the environment: AI receipt
 * reading only uses a key the user pastes in Settings (stored in the device
 * keychain).
 */
export const env = {
  /** Vision model used for receipt extraction. */
  extractionModel: process.env.EXPO_PUBLIC_EXTRACTION_MODEL || 'claude-haiku-5-5',
  /** Optional Google Places API key (store locations). Without it OpenStreetMap is used. */
  googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
};
