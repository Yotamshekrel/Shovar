import { randomBytes } from 'node:crypto';

import { createAesGcmCipher, isEncryptedPayload } from '@/security/fieldCipher';
import { base64ToBytes, bytesToBase64, bytesToHex, hexToBytes } from '@/utils/base64';

import { createTestCipher, TEST_KEY } from '../support/testCipher';

describe('field cipher (AES-256-GCM)', () => {
  it('round-trips unicode text', () => {
    const c = createTestCipher();
    for (const s of ['1234-5678-9012', 'קוד סודי 42', 'emoji 🎁', 'x'.repeat(500)]) {
      const enc = c.encrypt(s);
      expect(isEncryptedPayload(enc)).toBe(true);
      expect(enc).not.toContain(s);
      expect(c.decrypt(enc)).toBe(s);
    }
  });

  it('uses a fresh nonce per encryption', () => {
    const c = createTestCipher();
    expect(c.encrypt('same')).not.toBe(c.encrypt('same'));
  });

  it('detects tampering', () => {
    const c = createTestCipher();
    const enc = c.encrypt('hello');
    const bytes = base64ToBytes(enc.slice(3));
    bytes[bytes.length - 1] ^= 1;
    expect(() => c.decrypt(`v1:${bytesToBase64(bytes)}`)).toThrow();
  });

  it('fails to decrypt with a different key', () => {
    const enc = createTestCipher().encrypt('secret');
    const other = createAesGcmCipher(new Uint8Array(32).fill(7), (n) => new Uint8Array(randomBytes(n)));
    expect(() => other.decrypt(enc)).toThrow();
  });

  it('rejects bad keys and payloads', () => {
    expect(() => createAesGcmCipher(new Uint8Array(16), () => new Uint8Array(12))).toThrow();
    const c = createAesGcmCipher(TEST_KEY, (n) => new Uint8Array(randomBytes(n)));
    expect(() => c.decrypt('v2:abc')).toThrow('Unsupported');
    expect(() => c.decrypt('v1:AAAA')).toThrow();
  });
});

describe('base64/hex', () => {
  it('matches Node for random buffers of every length mod 3', () => {
    for (let len = 0; len < 40; len++) {
      const buf = randomBytes(len);
      const b64 = bytesToBase64(new Uint8Array(buf));
      expect(b64).toBe(buf.toString('base64'));
      expect(Buffer.from(base64ToBytes(b64)).equals(buf)).toBe(true);
      expect(bytesToHex(new Uint8Array(buf))).toBe(buf.toString('hex'));
      expect(Buffer.from(hexToBytes(buf.toString('hex'))).equals(buf)).toBe(true);
    }
  });
});
