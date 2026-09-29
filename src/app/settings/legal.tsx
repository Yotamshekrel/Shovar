import { ScrollView, StyleSheet, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Section, Text } from '@/components/ui';
import { OSM_COPYRIGHT_URL } from '@/config/legal';
import { useI18n } from '@/i18n';
import licenses from '@/legal/licenses.json';
import { useTheme } from '@/theme/ThemeProvider';

/** Data attribution (OpenStreetMap's ODbL requires it) and open-source notices. */
export default function LegalScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
    >
      <View style={styles.block}>
        <Text variant="headline">{t('legal.osmTitle')}</Text>
        <Text tone="secondary">{t('legal.osmBody')}</Text>
        <Button title={t('legal.osmLink')} variant="secondary" onPress={() => WebBrowser.openBrowserAsync(OSM_COPYRIGHT_URL)} />
      </View>
      <View style={styles.block}>
        <Text variant="headline">{t('legal.aiTitle')}</Text>
        <Text tone="secondary">{t('legal.aiBody')}</Text>
      </View>
      <Section title={t('legal.ossTitle')} footer={t('legal.ossBody')}>
        {licenses.map((l) => (
          <View key={l.name} style={styles.license}>
            <Text variant="callout">{l.name}</Text>
            <Text variant="footnote" tone="secondary">
              {l.version} · {l.license}
            </Text>
          </View>
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  block: { gap: 10 },
  license: { paddingHorizontal: 16, paddingVertical: 10 },
});
