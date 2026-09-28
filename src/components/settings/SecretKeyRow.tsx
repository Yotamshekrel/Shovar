import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ListRow, Text, TextField } from '@/components/ui';
import { useI18n } from '@/i18n';
import { getSecret, setSecret } from '@/security/keyStore';

/** Settings row for a user-provided API key kept in the device keychain (never in SQLite or logs). */
export function SecretKeyRow({
  secretName,
  title,
  hint,
  envConfigured,
  onChange,
  testID,
}: {
  secretName: string;
  title: string;
  hint: string;
  envConfigured: boolean;
  onChange?: () => void;
  testID?: string;
}) {
  const { t } = useI18n();
  const [stored, setStored] = useState<boolean>(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  useEffect(() => {
    getSecret(secretName)
      .then((v) => setStored(!!v))
      .catch(() => setStored(false));
  }, [secretName]);

  const save = async (v: string | null) => {
    await setSecret(secretName, v);
    setStored(!!v);
    setEditing(false);
    setValue('');
    onChange?.();
  };

  const status = stored ? t('settings.configured') : envConfigured ? `${t('settings.configured')} (build)` : t('settings.notConfigured');

  return (
    <View>
      <ListRow icon="key-outline" title={title} value={status} onPress={() => setEditing((e) => !e)} testID={testID} />
      {editing ? (
        <View style={styles.editor}>
          <Text variant="footnote" tone="secondary">
            {hint}
          </Text>
          <TextField
            value={value}
            onChangeText={setValue}
            placeholder="sk-…"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            testID={testID ? `${testID}-input` : undefined}
          />
          <View style={styles.actions}>
            {stored ? <Button title={t('form.clear')} variant="dangerGhost" size="sm" onPress={() => save(null)} /> : null}
            <Button title={t('common.save')} size="sm" disabled={!value.trim()} onPress={() => save(value)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});
