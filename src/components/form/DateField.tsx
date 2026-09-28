import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, TextField } from '@/components/ui';
import { formatDate, fromIsoDate, parseLooseDate, toIsoDate } from '@/domain/dates';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  highlighted?: boolean;
  placeholder?: string;
  minimumDate?: Date;
  testID?: string;
}

/**
 * Date input: native dialog on Android, inline calendar sheet on iOS, and a
 * typed field on web (development preview).
 */
export function DateField({ label, value, onChange, highlighted, placeholder, minimumDate, testID }: DateFieldProps) {
  const { colors, radii, dark } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const [iosOpen, setIosOpen] = useState(false);
  const [iosValue, setIosValue] = useState<Date>(fromIsoDate(value) ?? new Date());
  const [webText, setWebText] = useState(value ?? '');

  if (Platform.OS === 'web') {
    return (
      <TextField
        testID={testID}
        label={label}
        value={webText}
        placeholder="YYYY-MM-DD"
        highlighted={highlighted}
        onChangeText={(txt) => {
          setWebText(txt);
          if (!txt.trim()) onChange(null);
          else {
            const parsed = parseLooseDate(txt);
            if (parsed) onChange(parsed);
          }
        }}
      />
    );
  }

  const open = () => {
    const current = fromIsoDate(value) ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode: 'date',
        minimumDate,
        onValueChange: (_e, date) => onChange(toIsoDate(date)),
      });
    } else {
      setIosValue(current);
      setIosOpen(true);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? formatDate(value, locale) : (placeholder ?? t('form.pickDate'))}`}
        onPress={open}
        style={[
          styles.field,
          {
            borderRadius: radii.md,
            borderColor: highlighted ? colors.highlightBorder : colors.border,
            borderWidth: highlighted ? 1.5 : 1,
            backgroundColor: highlighted ? colors.highlight : colors.surface,
          },
        ]}
      >
        <Icon name="calendar-outline" size={18} color={colors.textSecondary} />
        <Text variant="body" tone={value ? 'default' : 'tertiary'} style={styles.flex}>
          {value ? formatDate(value, locale) : (placeholder ?? t('form.pickDate'))}
        </Text>
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('form.clear')} hitSlop={10} onPress={() => onChange(null)}>
            <Icon name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </Pressable>

      {Platform.OS === 'ios' ? (
        <Modal visible={iosOpen} transparent animationType="slide" onRequestClose={() => setIosOpen(false)}>
          <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setIosOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 12 }]}>
            <DateTimePicker
              value={iosValue}
              mode="date"
              display="inline"
              minimumDate={minimumDate}
              locale={locale}
              themeVariant={dark ? 'dark' : 'light'}
              accentColor={colors.primary}
              onValueChange={(_e, date) => setIosValue(date)}
            />
            <View style={styles.sheetActions}>
              <Button title={t('common.cancel')} variant="secondary" size="md" onPress={() => setIosOpen(false)} style={styles.flex} />
              <Button
                title={t('common.done')}
                size="md"
                onPress={() => {
                  onChange(toIsoDate(iosValue));
                  setIosOpen(false);
                }}
                style={styles.flex}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  flex: { flex: 1 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 50 },
  backdrop: { flex: 1 },
  sheet: { paddingHorizontal: 16, paddingTop: 12, borderTopLeftRadius: 24, borderTopRightRadius: 24, gap: 8 },
  sheetActions: { flexDirection: 'row', gap: 12 },
});
