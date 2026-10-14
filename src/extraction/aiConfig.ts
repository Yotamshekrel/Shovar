import { env } from '@/config/env';
import { getSecret } from '@/security/keyStore';

export interface AiConfig {
  apiKey: string;
  /** Override of the API host; only used by tests (a mock API). */
  baseURL?: string;
  model: string;
}

export const USER_KEY_SECRET = 'anthropicApiKey';

/**
 * AI receipt reading only works with a key the user pasted in Settings (device
 * keychain). No key is ever read from the build environment, and there is no
 * hosted backend. Returns null when no key is stored (on-device OCR is used).
 */
export async function resolveAiConfig(): Promise<AiConfig | null> {
  const apiKey = await getSecret(USER_KEY_SECRET).catch(() => null);
  return apiKey ? { apiKey, model: env.extractionModel } : null;
}
