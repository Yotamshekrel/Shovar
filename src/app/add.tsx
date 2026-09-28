import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName, Text, tapFeedback } from '@/components/ui';
import { useI18n, type StringKey } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const OPTIONS: { key: string; icon: IconName; title: StringKey; hint: StringKey; href: '/scan' | '/link' | '/new' }[] = [
  { key: 'scan', icon: 'scan-outline', title: 'add.scan', hint: 'add.scanHint', href: '/scan' },
  { key: 'link', icon: 'link-outline', title: 'add.link', hint: 'add.linkHint', href: '/link' },
  { key: 'manual', icon: 'create-outline', title: 'add.manual', hint: 'add.manualHint', href: '/new' },
];

/** The single "+" entry point: three ways to add a card. */
export default function AddSheet() {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <Text variant="headline" style={styles.title} accessibilityRole="header">
        {t('add.title')}
      </Text>
      {OPTIONS.map((o, i) => (
        <Pressable
          key={o.key}
          testID={`add-${o.key}`}
          accessibilityRole="button"
          accessibilityLabel={t(o.title)}
          accessibilityHint={t(o.hint)}
          onPress={() => {
            tapFeedback();
            router.back();
            // Let the sheet close before presenting the next modal.
            setTimeout(() => router.push(o.href), 250);
          }}
          style={({ pressed }) => [
            styles.option,
            {
              borderRadius: radii.lg,
              backgroundColor: pressed ? colors.surfacePressed : i === 0 ? colors.primarySoft : colors.surfaceAlt,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: i === 0 ? colors.primary : colors.surface }]}>
            <Icon name={o.icon} size={24} color={i === 0 ? colors.textOnPrimary : colors.text} />
          </View>
          <View style={styles.texts}>
            <Text variant="bodyStrong">{t(o.title)}</Text>
            <Text variant="footnote" tone="secondary">
              {t(o.hint)}
            </Text>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 24, gap: 10 },
  title: { marginBottom: 6, paddingHorizontal: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
});
