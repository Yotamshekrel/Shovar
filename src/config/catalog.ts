import { PRIVACY_POLICY_URL } from './legal';

/**
 * Where the published store lists live: `docs/catalog/v1/` is deployed with the landing page, next to the privacy
 * policy, so the folder is derived from it (one place to change when the site moves).
 */
export const CATALOG_BASE_URL = new URL('../catalog/v1', PRIVACY_POLICY_URL).toString();
