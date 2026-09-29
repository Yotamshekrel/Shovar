import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreAvatar } from '@/components/item/StoreAvatar';
import { Button, EmptyState, Text } from '@/components/ui';
import { formatMoney, sumByCurrency } from '@/domain/money';
import { useI18n } from '@/i18n';
import { scanNearby, type ScanOutcome } from '@/location/locationService';
import { formatDistance } from '@/location/nearbyAlert';
import { SCAN_RADIUS_M } from '@/location/nearest';
import { useTheme } from '@/theme/ThemeProvider';

/** "What's around me": which of the user's stores (with credit) have a branch close by. */
export default function NearbyScreen() {
  const { t, lang, locale } = useI18n();
  const { colors, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);

  const [run, setRun] = useState(0);
  const scan = useCallback(() => {
    setOutcome(null);
    setRun((n) => n + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    scanNearby((partial) => alive && setOutcome(partial)).then((o) => alive && setOutcome(o));
    return () => {
      alive = false;
    };
  }, [run]);

  const radius = formatDistance(lang, SCAN_RADIUS_M);
  const directions = (lat: number, lng: number) =>
    Linking.openURL(
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=w`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`,
    ).catch(() => {});

  if (!outcome) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text tone="secondary" align="center">
          {t('nearby.scanning')}
        </Text>
      </View>
    );
  }

  if (outcome.status !== 'ok') {
    const map = {
      'no-permission': ['location-outline', 'nearby.noPermission', 'nearby.noPermissionHint'],
      'no-items': ['wallet-outline', 'nearby.noItems', 'nearby.noItemsHint'],
    } as const;
    const [icon, title, body] = map[outcome.status as keyof typeof map] ?? ['alert-circle-outline', 'nearby.error', 'nearby.errorHint'];
    return (
      <View style={[styles.flex, { backgroundColor: colors.background }]}>
        <EmptyState
          icon={icon}
          title={t(title)}
          body={t(body)}
          actionTitle={outcome.status === 'no-permission' ? t('nearby.openSettings') : outcome.status === 'no-items' ? undefined : t('nearby.scanAgain')}
          onAction={outcome.status === 'no-permission' ? () => Linking.openSettings() : outcome.status === 'no-items' ? undefined : scan}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
    >
      {outcome.stores.length === 0 ? (
        <EmptyState
          icon="storefront-outline"
          title={t('nearby.none')}
          body={t('nearby.noneHint', { count: outcome.storesWithCredit, radius })}
          actionTitle={t('nearby.scanAgain')}
          onAction={scan}
        />
      ) : (
        <>
          <Text variant="caption" tone="secondary">
            {t('nearby.found', { radius })}
          </Text>
          {outcome.stores.map((s) => {
            const totals = sumByCurrency(s.items);
            const amount = totals.filter((x) => x.totalMinor > 0).map((x) => formatMoney(x.totalMinor, x.currency, locale)).join(' + ');
            return (
              <Pressable
                key={s.storeKey}
                testID={`nearby-${s.storeKey}`}
                accessibilityRole="button"
                onPress={() => router.push(`/item/${s.items[0].id}`)}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card }]}
              >
                <StoreAvatar name={s.storeName} logoUri={s.items[0].storeLogoUri} size={44} />
                <View style={styles.flex}>
                  <Text variant="headline">{s.storeName}</Text>
                  <Text variant="callout" tone="secondary">
                    {[amount, s.items.length === 1 ? t('nearby.card') : t('nearby.cards', { count: s.items.length })].filter(Boolean).join(' · ')}
                  </Text>
                  <Text variant="footnote" tone="tertiary" numberOfLines={1}>
                    {[formatDistance(lang, s.distanceM), s.address].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Button title={t('nearby.directions')} icon="navigate" variant="secondary" onPress={() => directions(s.lat, s.lng)} />
              </Pressable>
            );
          })}
          <Button title={t('nearby.scanAgain')} icon="refresh" variant="secondary" onPress={scan} fullWidth />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  content: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth },
});
