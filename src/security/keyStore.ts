import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { bytesToHex, hexToBytes } from '@/utils/base64';

import { createAesGcmCipher, type FieldCipher } from './fieldCipher';

/**
 * The data key is generated on first launch and kept in the iOS Keychain /
 * Android Keystore-backed storage. AFTER_FIRST_UNLOCK lets background tasks
 * (geofence events) open the app database while the device is locked, and
 * lets the key migrate with encrypted device backups.
 */
// PERSISTENT IDENTIFIER — never rename: changing it would make the existing key
// unreachable and every encrypted code/PIN unreadable after an app update.
const DATA_KEY = 'shvar.dataKey.v1';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

let cached: Promise<FieldCipher> | null = null;

async function loadOrCreateKey(): Promise<Uint8Array> {
  const existing = await SecureStore.getItemAsync(DATA_KEY, OPTIONS);
  if (existing) return hexToBytes(existing);
  const key = Crypto.getRandomBytes(32);
  await SecureStore.setItemAsync(DATA_KEY, bytesToHex(key), OPTIONS);
  return key;
}

export function getFieldCipher(): Promise<FieldCipher> {
  cached ??= loadOrCreateKey().then((key) => createAesGcmCipher(key, (n) => Crypto.getRandomBytes(n)));
  return cached;
}

/** Generic secret storage for user-provided API keys (never stored in SQLite). */
export async function getSecret(name: string): Promise<string | null> {
  return SecureStore.getItemAsync(`shvar.secret.${name}`, OPTIONS);
}

export async function setSecret(name: string, value: string | null): Promise<void> {
  const key = `shvar.secret.${name}`;
  if (value && value.trim()) await SecureStore.setItemAsync(key, value.trim(), OPTIONS);
  else await SecureStore.deleteItemAsync(key, OPTIONS);
}
