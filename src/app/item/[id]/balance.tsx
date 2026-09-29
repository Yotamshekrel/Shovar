import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Segmented, Text, TextField } from '@/components/ui';
import { currencySymbol, formatMoney, parseAmountToMinor } from '@/domain/money';
import { useI18n } from '@/i18n';
import { useItem, useItemsStore } from '@/state/items';

type Mode = 'spent' | 'remaining';

/** Sheet for logging a partial use ("I spent ₪40") or setting the remaining balance. */
export default function BalanceSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = useItem(id);
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const recordUsage = useItemsStore((s) => s.recordUsage);
  const setBalance = useItemsStore((s) => s.setBalance);
  const [mode, setMode] = useState<Mode>('spent');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => (amount.trim() ? parseAmountToMinor(amount, item?.currency) : null), [amount, item?.currency]);
  if (!item || item.balanceMinor == null) return null;
  const current = item.balanceMinor;
  const after = parsed == null ? null : mode === 'spent' ? Math.max(0, current - parsed) : parsed;

  const save = async () => {
    if (parsed == null || (mode === 'spent' && parsed <= 0)) {
      setError(t('balance.error'));
      return;
    }
    setSaving(true);
    try {
      if (mode === 'spent') await recordUsage(item.id, parsed, note);
      else await setBalance(item.id, parsed, note);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Text variant="headline" accessibilityRole="header">
          {t('balance.title')}
        </Text>
        <Text tone="secondary">{t('balance.current', { amount: formatMoney(current, item.currency, locale) })}</Text>
        <Segmented
          options={[
            { value: 'spent', label: t('balance.modeSpent') },
            { value: 'remaining', label: t('balance.modeRemaining') },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
        />
        <TextField
          testID="balance-amount"
          label={mode === 'spent' ? t('balance.spentLabel') : t('balance.remainingLabel')}
          value={amount}
          onChangeText={(v) => {
            setAmount(v);
            setError(null);
          }}
          keyboardType="decimal-pad"
          placeholder="0"
          autoFocus
          error={error}
          prefix={
            <Text variant="bodyStrong" tone="secondary">
              {currencySymbol(item.currency)}
            </Text>
          }
        />
        <TextField label={t('balance.note')} value={note} onChangeText={setNote} returnKeyType="done" onSubmitEditing={save} />
        {after != null ? (
          <Text variant="callout" tone={after === 0 ? 'warning' : 'secondary'}>
            {t('balance.after', { amount: formatMoney(after, item.currency, locale) })}
          </Text>
        ) : null}
        <Button testID="balance-save" title={t('common.save')} onPress={save} loading={saving} fullWidth />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { padding: 20, gap: 14 },
});
