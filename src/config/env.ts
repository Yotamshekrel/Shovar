/**
 * Build-time configuration. Expo inlines `EXPO_PUBLIC_*` variables from `.env`
 * files / the EAS environment at bundle time (see README → Environment).
 *
 * Nothing secret is committed. EXPO_PUBLIC_* values end up inside the app
 * bundle, so no Anthropic key is ever read from the environment: extraction
 * goes through the proxy (server/) which holds the key, or through a key the
 * user pastes in Settings (stored in the device keychain).
 */
export const env = {
  /** Shared token the proxy checks (PROXY_CLIENT_TOKEN). NOT an Anthropic key — never put one here. */
  proxyClientToken: process.env.EXPO_PUBLIC_PROXY_CLIENT_TOKEN ?? '',
  /** Base URL of an Anthropic-compatible proxy that injects the key server-side (recommended for production). */
  anthropicBaseUrl: process.env.EXPO_PUBLIC_ANTHROPIC_BASE_URL ?? '',
  /** Vision model used for receipt extraction. */
  extractionModel: process.env.EXPO_PUBLIC_EXTRACTION_MODEL || 'claude-opus-5-5',
  /** Optional Google Places API key (store locations). Without it OpenStreetMap is used. */
  googlePlacesApiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
};
