import * as Crypto from 'expo-crypto';

import { bytesToHex, hexToBytes } from '@/utils/base64';

import { createAesGcmCipher, type FieldCipher } from './fieldCipher';

/**
 * Web is only used as a development preview. There is no hardware keystore in
 * the browser, so the key lives in localStorage. Do not ship the web build as
 * a production wallet.
 */
const DATA_KEY = 'shvar.dataKey.v1';
let cached: Promise<FieldCipher> | null = null;

function storage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export function getFieldCipher(): Promise<FieldCipher> {
  cached ??= (async () => {
    const s = storage();
    let hex = s?.getItem(DATA_KEY) ?? null;
    if (!hex) {
      hex = bytesToHex(Crypto.getRandomBytes(32));
      s?.setItem(DATA_KEY, hex);
    }
    return createAesGcmCipher(hexToBytes(hex), (n) => Crypto.getRandomBytes(n));
  })();
  return cached;
}

export async function getSecret(name: string): Promise<string | null> {
  return storage()?.getItem(`shvar.secret.${name}`) ?? null;
}

export async function setSecret(name: string, value: string | null): Promise<void> {
  const s = storage();
  if (!s) return;
  if (value && value.trim()) s.setItem(`shvar.secret.${name}`, value.trim());
  else s.removeItem(`shvar.secret.${name}`);
}
