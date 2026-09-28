import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, TextField } from '@/components/ui';
import { useI18n } from '@/i18n';
import { firstUrl } from '@/links/analyzeLink';
import { useLinkImport } from '@/links/useLinkImport';
import { useTheme } from '@/theme/ThemeProvider';
import { parseUrl } from '@/utils/url';

/** Paste a gift card link (or a whole message containing one). */
export default function LinkScreen() {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { busy, importLink } = useLinkImport();

  const submit = async (input = value) => {
    const trimmed = input.trim();
    // Accept a bare URL or a pasted message that contains one.
    const url = firstUrl(trimmed) ?? parseUrl(trimmed)?.href ?? null;
    if (!url) {
      setError(t('link.invalid'));
      return;
    }
    const sharedText = trimmed === url ? null : trimmed;
    await importLink(url, sharedText, 'link');
  };

  const paste = async () => {
    const text = (await Clipboard.getStringAsync()).trim();
    if (!text) return;
    setValue(text);
    setError(null);
    if (firstUrl(text) || parseUrl(text)) await submit(text);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
        <TextField
          testID="link-input"
          label={t('form.link')}
          placeholder={t('link.placeholder')}
          value={value}
          onChangeText={(v) => {
            setValue(v);
            setError(null);
          }}
          error={error}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={() => submit()}
          multiline={value.length > 60}
        />
        <Button title={t('link.paste')} icon="clipboard-outline" variant="secondary" size="md" onPress={paste} testID="link-paste" />
        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.primary} />
            <Text tone="secondary">{t('link.detecting')}</Text>
          </View>
        ) : null}
        <View style={styles.spacer} />
        <View style={[styles.tip, { backgroundColor: colors.surfaceAlt, borderRadius: radii.md }]}>
          <Icon name="share-outline" size={18} color={colors.textSecondary} />
          <Text variant="footnote" tone="secondary" style={styles.flex}>
            {t('link.hint')}
          </Text>
        </View>
        <Button
          testID="link-continue"
          title={t('link.detect')}
          onPress={() => submit()}
          loading={busy}
          disabled={!value.trim()}
          fullWidth
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flex: 1, padding: 16, gap: 14 },
  busy: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spacer: { flex: 1 },
  tip: { flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start' },
});
