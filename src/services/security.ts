import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';
import { create } from 'zustand';

import { t } from '@/i18n';
import { getSettings } from '@/state/settings';

/**
 * App lock state. When biometric lock is on, the app starts locked and
 * re-locks after `lockAfterSeconds` in the background. Revealing a code
 * re-uses a recent unlock instead of prompting again.
 */
interface LockState {
  locked: boolean;
  lastUnlockAt: number;
  backgroundedAt: number | null;
  setLocked: (locked: boolean) => void;
  markUnlocked: () => void;
  markBackgrounded: () => void;
}

export const useLockStore = create<LockState>((set) => ({
  locked: false,
  lastUnlockAt: 0,
  backgroundedAt: null,
  setLocked: (locked) => set({ locked }),
  markUnlocked: () => set({ locked: false, lastUnlockAt: Date.now(), backgroundedAt: null }),
  markBackgrounded: () => set({ backgroundedAt: Date.now() }),
}));

export async function biometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hw, enrolled] = await Promise.all([LocalAuthentication.hasHardwareAsync(), LocalAuthentication.isEnrolledAsync()]);
    if (hw && enrolled) return true;
    // Device passcode alone is still a meaningful lock.
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

export async function authenticate(reason?: string): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason ?? t('lock.reason'),
      cancelLabel: t('common.cancel'),
    });
    if (res.success) useLockStore.getState().markUnlocked();
    return res.success;
  } catch {
    return false;
  }
}

const RECENT_UNLOCK_MS = 30_000;

/** Gate for revealing/copying codes and PINs. */
export async function unlockForSecrets(): Promise<boolean> {
  if (!getSettings().biometricLock) return true;
  if (Date.now() - useLockStore.getState().lastUnlockAt < RECENT_UNLOCK_MS) return true;
  return authenticate();
}

/** Whether the app should lock now, given how long it was in the background. */
export function shouldLockAfterBackground(now = Date.now()): boolean {
  const { biometricLock, lockAfterSeconds } = getSettings();
  const { backgroundedAt } = useLockStore.getState();
  if (!biometricLock || backgroundedAt == null) return false;
  return now - backgroundedAt >= lockAfterSeconds * 1000;
}
