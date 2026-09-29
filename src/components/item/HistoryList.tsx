import { StyleSheet, View } from 'react-native';

import { Icon, type IconName, Text } from '@/components/ui';
import { formatMoney } from '@/domain/money';
import type { BalanceEvent } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

const ICONS: Record<BalanceEvent['type'], IconName> = {
  created: 'add-circle-outline',
  usage: 'cart-outline',
  adjustment: 'create-outline',
  marked_used: 'checkmark-done-outline',
  expired: 'hourglass-outline',
  reactivated: 'refresh-outline',
};

export function HistoryList({ events, currency }: { events: BalanceEvent[]; currency: string }) {
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const dtf = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <View>
      {events.map((e, i) => (
        <View key={e.id} style={[styles.row, i > 0 ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border } : null]}>
          <View style={[styles.icon, { backgroundColor: colors.surfaceAlt }]}>
            <Icon name={ICONS[e.type]} size={16} color={colors.textSecondary} />
          </View>
          <View style={styles.texts}>
            <Text variant="callout">{t(`event.${e.type}`)}</Text>
            <Text variant="footnote" tone="tertiary">
              {dtf.format(new Date(e.createdAt))}
              {e.note ? ` · ${e.note}` : ''}
            </Text>
          </View>
          <View style={styles.amounts}>
            {e.deltaMinor !== 0 && e.type !== 'created' ? (
              <Text variant="callout" tone={e.deltaMinor < 0 ? 'default' : 'success'} weight="600">
                {e.deltaMinor > 0 ? '+' : '−'}
                {formatMoney(Math.abs(e.deltaMinor), currency, locale)}
              </Text>
            ) : null}
            {e.balanceAfterMinor != null ? (
              <Text variant="footnote" tone="tertiary">
                {formatMoney(e.balanceAfterMinor, currency, locale)}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  amounts: { alignItems: 'flex-end', gap: 2 },
});
