import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus, Image, Modal, Platform, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { authenticate, shouldLockAfterBackground, useLockStore } from '@/services/security';
import { useSettings } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Biometric app lock. When enabled in Settings, the wallet starts locked,
 * re-locks after `lockAfterSeconds` in the background, and hides its content
 * from the app switcher snapshot.
 */
export function LockGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { biometricLock } = useSettings();
  const locked = useLockStore((s) => s.locked);
  const setLocked = useLockStore((s) => s.setLocked);
  const markBackgrounded = useLockStore((s) => s.markBackgrounded);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const prompting = useRef(false);
  const initialized = useRef(false);

  const unlock = async () => {
    if (prompting.current) return;
    prompting.current = true;
    try {
      await authenticate();
    } finally {
      prompting.current = false;
    }
  };

  // Lock on cold start when the setting is on.
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (biometricLock && Platform.OS !== 'web') {
      setLocked(true);
      unlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      setAppState(next);
      if (next === 'background') markBackgrounded();
      if (next === 'active' && shouldLockAfterBackground()) {
        setLocked(true);
        unlock();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hideForSnapshot = biometricLock && appState !== 'active' && Platform.OS !== 'web';
  const showLock = biometricLock && locked;

  // A Modal, not an overlay View: native modal screens (checkout, edit, sheets) are presented above the
  // root view, so a plain overlay would leave a code on screen and in the app-switcher snapshot.
  return (
    <View style={styles.flex}>
      {children}
      <Modal
        visible={showLock || hideForSnapshot}
        animationType="none"
        presentationStyle="overFullScreen"
        transparent
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={[styles.flex, styles.cover, { backgroundColor: colors.background }]} testID="lock-screen">
          <Image source={require('@/assets/images/icon.png')} style={styles.icon} />
          {showLock ? (
            <>
              <Text variant="headline">{t('lock.title')}</Text>
              <Button title={t('lock.unlock')} icon="lock-open-outline" onPress={unlock} />
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  cover: { alignItems: 'center', justifyContent: 'center', gap: 16 },
  icon: { width: 88, height: 88, borderRadius: 20 },
});
