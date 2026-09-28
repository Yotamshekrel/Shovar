import { gcm } from '@noble/ciphers/aes.js';
import { bytesToUtf8, utf8ToBytes } from '@noble/ciphers/utils.js';

import { base64ToBytes, bytesToBase64 } from '@/utils/base64';

/**
 * Field-level encryption for secrets (card codes, PINs).
 *
 * AES-256-GCM with a random 96-bit nonce per value. The 256-bit data key lives
 * in the OS keystore (iOS Keychain / Android Keystore via expo-secure-store),
 * and only ciphertext is written to SQLite. The payload is versioned so the
 * scheme can be rotated later.
 *
 * Payload: `v1:<base64(nonce || ciphertext || tag)>`
 */
export interface FieldCipher {
  encrypt(plaintext: string): string;
  decrypt(payload: string): string;
}

const VERSION = 'v1';
const NONCE_BYTES = 12;
/** Associated data binds ciphertexts to this app/scheme. */
const AAD = utf8ToBytes('shvar:field:v1');

export function createAesGcmCipher(key: Uint8Array, randomBytes: (n: number) => Uint8Array): FieldCipher {
  if (key.length !== 32) throw new Error('Data key must be 32 bytes');
  return {
    encrypt(plaintext: string): string {
      const nonce = randomBytes(NONCE_BYTES);
      const sealed = gcm(key, nonce, AAD).encrypt(utf8ToBytes(plaintext));
      const out = new Uint8Array(nonce.length + sealed.length);
      out.set(nonce, 0);
      out.set(sealed, nonce.length);
      return `${VERSION}:${bytesToBase64(out)}`;
    },
    decrypt(payload: string): string {
      const sep = payload.indexOf(':');
      if (sep < 0 || payload.slice(0, sep) !== VERSION) throw new Error('Unsupported ciphertext version');
      const bytes = base64ToBytes(payload.slice(sep + 1));
      if (bytes.length <= NONCE_BYTES) throw new Error('Ciphertext too short');
      const nonce = bytes.slice(0, NONCE_BYTES);
      const sealed = bytes.slice(NONCE_BYTES);
      return bytesToUtf8(gcm(key, nonce, AAD).decrypt(sealed));
    },
  };
}

export function isEncryptedPayload(value: string | null | undefined): boolean {
  return !!value && value.startsWith(`${VERSION}:`);
}
