import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ViewToken } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, type IconName, Text } from '@/components/ui';
import { useI18n, type StringKey } from '@/i18n';
import { loadDemoData } from '@/services/seed';
import { useSettingsStore } from '@/state/settings';
import { useTheme } from '@/theme/ThemeProvider';

const PAGES: { icon: IconName; title: StringKey; body: StringKey }[] = [
  { icon: 'wallet-outline', title: 'onboarding.1.title', body: 'onboarding.1.body' },
  { icon: 'scan-outline', title: 'onboarding.2.title', body: 'onboarding.2.body' },
  { icon: 'shield-checkmark-outline', title: 'onboarding.3.title', body: 'onboarding.3.body' },
];

/** Three short pages, skippable at any point. */
export default function OnboardingScreen() {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const patch = useSettingsStore((s) => s.patch);
  const listRef = useRef<FlatList>(null);
  const [page, setPage] = useState(0);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const last = page === PAGES.length - 1;

  const finish = async (withDemo = false) => {
    if (withDemo) {
      setLoadingDemo(true);
      await loadDemoData().catch(() => {});
    }
    patch({ onboardingDone: true });
    router.replace('/');
  };

  const next = () => {
    if (last) finish();
    else listRef.current?.scrollToIndex({ index: page + 1, animated: true });
  };

  // FlatList requires a stable callback here.
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index != null) setPage(first.index);
  }, []);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.skipRow}>
        {!last ? <Button title={t('common.skip')} variant="ghost" size="sm" onPress={() => finish()} testID="onboarding-skip" /> : <View />}
      </View>
      <FlatList
        ref={listRef}
        data={PAGES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.title}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            <View style={[styles.art, { backgroundColor: colors.primarySoft, borderRadius: radii.card * 2 }]}>
              <Icon name={item.icon} size={72} color={colors.primary} />
            </View>
            <Text variant="title" align="center" accessibilityRole="header">
              {t(item.title)}
            </Text>
            <Text variant="body" tone="secondary" align="center" style={styles.body}>
              {t(item.body)}
            </Text>
          </View>
        )}
      />
      <View style={styles.dots} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: PAGES.length, now: page + 1 }}>
        {PAGES.map((p, i) => (
          <View
            key={p.title}
            style={[styles.dot, { backgroundColor: i === page ? colors.primary : colors.borderStrong, width: i === page ? 22 : 8 }]}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <Button title={last ? t('onboarding.start') : t('common.continue')} onPress={next} fullWidth testID="onboarding-next" />
        {last ? (
          <Button
            title={t('onboarding.demo')}
            variant="ghost"
            onPress={() => finish(true)}
            loading={loadingDemo}
            fullWidth
            testID="onboarding-demo"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  skipRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 12, minHeight: 44 },
  page: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 16 },
  art: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  body: { maxWidth: 340 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginVertical: 20 },
  dot: { height: 8, borderRadius: 4 },
  actions: { paddingHorizontal: 24, gap: 6 },
});
