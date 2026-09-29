import { randomBytes } from 'node:crypto';

import { createAesGcmCipher } from '@/security/fieldCipher';

export const TEST_KEY = new Uint8Array(32).map((_, i) => i + 1);

export function createTestCipher() {
  return createAesGcmCipher(TEST_KEY, (n) => new Uint8Array(randomBytes(n)));
}
