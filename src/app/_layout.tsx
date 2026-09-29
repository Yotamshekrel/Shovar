// Background geofence task must be defined at start-up, before any UI mounts.
import '@/location/geofenceTask';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DialogHost } from '@/components/DialogHost';
import { LockGate } from '@/components/LockGate';
import { Button, Text } from '@/components/ui';
import { useI18n } from '@/i18n';
import { initApp } from '@/services/bootstrap';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

SplashScreen.preventAutoHideAsync().catch(() => {});

function Navigator() {
  const { colors, dark } = useTheme();
  const { t, isRTL } = useI18n();

  const navTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, dark]);

  const header = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.background },
    headerTitleStyle: { fontWeight: '600' as const },
  };

  const sheet = {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetCornerRadius: 24,
    headerShown: false,
    contentStyle: { backgroundColor: colors.surface },
  };

  return (
    <NavThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={styles.flex} {...(Platform.OS === 'web' ? { dir: isRTL ? 'rtl' : 'ltr' } : {})}>
        <Stack screenOptions={header}>
          <Stack.Screen name="index" options={{ headerShown: false, title: t('app.name') }} />
          <Stack.Screen name="search" options={{ headerShown: false, animation: 'fade', animationDuration: 150 }} />
          <Stack.Screen name="add" options={{ ...sheet, sheetAllowedDetents: 'fitToContents' }} />
          <Stack.Screen name="new" options={{ title: t('form.titleNew'), presentation: 'modal' }} />
          <Stack.Screen name="scan" options={{ title: t('scan.title'), presentation: 'modal' }} />
          <Stack.Screen name="link" options={{ title: t('link.title'), presentation: 'modal' }} />
          <Stack.Screen name="handle-share" options={{ title: t('share.title'), presentation: 'modal' }} />
          <Stack.Screen name="item/[id]/index" options={{ title: '' }} />
          <Stack.Screen name="item/[id]/edit" options={{ title: t('form.titleEdit'), presentation: 'modal' }} />
          <Stack.Screen name="item/[id]/balance" options={{ ...sheet, sheetAllowedDetents: [0.62, 0.92] }} />
          <Stack.Screen name="item/[id]/checkout" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          <Stack.Screen name="nearby" options={{ title: t('nearby.title') }} />
          <Stack.Screen name="archive" options={{ title: t('archive.title') }} />
          <Stack.Screen name="settings/index" options={{ title: t('settings.title') }} />
          <Stack.Screen name="settings/location" options={{ presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }} />
        </Stack>
      </View>
    </NavThemeProvider>
  );
}

function Boot({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | Error>('loading');

  const boot = useCallback(() => {
    initApp()
      .then(() => setState('ready'))
      .catch((e: unknown) => setState(e instanceof Error ? e : new Error(String(e))))
      .finally(() => SplashScreen.hideAsync().catch(() => {}));
  }, []);

  useEffect(boot, [boot]);

  const retry = () => {
    setState('loading');
    boot();
  };

  if (state === 'ready') return <>{children}</>;
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      {state === 'loading' ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.errorBox}>
          <Text variant="headline" align="center">
            Shovar couldn’t start
          </Text>
          <Text tone="secondary" align="center">
            {state.message}
          </Text>
          <Button title="Try again" onPress={retry} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <ThemeProvider>
        <Boot>
          <LockGate>
            <Navigator />
            <DialogHost />
          </LockGate>
        </Boot>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { gap: 12, padding: 24, alignItems: 'center' },
});
