import { env } from '@/config/env';
import { getSecret } from '@/security/keyStore';

export type AiMode = 'user-key' | 'proxy';

export interface AiConfig {
  mode: AiMode;
  apiKey: string;
  baseURL?: string;
  model: string;
}

export const USER_KEY_SECRET = 'anthropicApiKey';
/** Placeholder sent to a proxy; the proxy replaces it with the real key. */
export const PROXY_KEY_PLACEHOLDER = 'proxy-managed';

/**
 * Where extraction requests go, in priority order:
 * 1. a key the user pasted in Settings (device keychain),
 * 2. a proxy URL configured at build time (key stays on the server),
 * Returns null when nothing is configured (on-device OCR is used instead).
 */
export async function resolveAiConfig(): Promise<AiConfig | null> {
  const model = env.extractionModel;
  const userKey = await getSecret(USER_KEY_SECRET).catch(() => null);
  if (userKey) return { mode: 'user-key', apiKey: userKey, model };
  if (env.anthropicBaseUrl)
    return { mode: 'proxy', apiKey: env.proxyClientToken || PROXY_KEY_PLACEHOLDER, baseURL: env.anthropicBaseUrl, model };
  return null;
}
