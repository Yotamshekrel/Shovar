import Constants from 'expo-constants';

/**
 * Legal / support details shown in the app and required by the stores.
 * The privacy policy page is published from `docs/privacy/` (GitHub Pages);
 * keep the URL in app.json (`extra.legal`) in sync with the store listings.
 */
const legal = (Constants.expoConfig?.extra?.legal ?? {}) as { privacyPolicyUrl?: string };

export const PRIVACY_POLICY_URL = legal.privacyPolicyUrl ?? 'https://yotamshekrel.github.io/Shovar/privacy/';
export const SUPPORT_EMAIL = 'yotamshekrel@gmail.com';
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
