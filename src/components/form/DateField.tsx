import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Icon, Text, tapFeedback } from '@/components/ui';
import { formatDate, fromIsoDate, pad2 } from '@/domain/dates';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

export interface DateFieldProps {
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  highlighted?: boolean;
  placeholder?: string;
  /** `future` (expiry dates) lists this year and the next ten; `past` (issue dates) the last six. */
  range?: 'future' | 'past';
  testID?: string;
}

type Step = 'year' | 'month' | 'day';

export function yearOptions(range: 'future' | 'past', now = new Date(), selected?: number | null): number[] {
  const y = now.getFullYear();
  const years = range === 'future' ? Array.from({ length: 11 }, (_, i) => y + i) : Array.from({ length: 7 }, (_, i) => y - i);
  if (selected && !years.includes(selected)) years.push(selected);
  return years.sort((a, b) => (range === 'future' ? a - b : b - a));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Date input that asks for the year first, then the month, then the day — each
 * a single tap on a big target — instead of scrolling through a calendar.
 * The same sheet is used on every platform.
 */
export function DateField({ label, value, onChange, highlighted, placeholder, range = 'future', testID }: DateFieldProps) {
  const { colors, radii } = useTheme();
  const { t, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 640) - 32;
  const cellWidth = Math.floor((inner - 16) / 3);
  const dayWidth = Math.floor((inner - 48) / 7);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('year');
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);

  const current = fromIsoDate(value);
  const years = useMemo(() => yearOptions(range, new Date(), current?.getFullYear()), [range, current]);
  const monthNames = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, i) => f.format(new Date(2026, i, 1)));
  }, [locale]);

  const openSheet = () => {
    tapFeedback();
    setYear(current?.getFullYear() ?? null);
    setMonth(current ? current.getMonth() + 1 : null);
    setStep('year');
    setOpen(true);
  };

  const close = () => setOpen(false);

  const pickDay = (day: number) => {
    if (year == null || month == null) return;
    onChange(`${year}-${pad2(month)}-${pad2(day)}`);
    close();
  };

  const title = step === 'year' ? t('date.pickYear') : step === 'month' ? t('date.pickMonth') : t('date.pickDay');

  const cell = (key: string, text: string, selected: boolean, onPress: () => void, testID?: string) => (
    <Pressable
      key={key}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={text}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      style={({ pressed }) => [
        step === 'day' ? styles.dayCell : styles.cell,
        { width: step === 'day' ? dayWidth : cellWidth },
        {
          borderRadius: radii.md,
          backgroundColor: selected ? colors.primary : pressed ? colors.surfacePressed : colors.surfaceAlt,
        },
      ]}
    >
      <Text variant="bodyStrong" color={selected ? colors.textOnPrimary : colors.text}>
        {text}
      </Text>
    </Pressable>
  );

  return (
    <View style={styles.wrap}>
      <Text variant="caption" tone="secondary">
        {label}
      </Text>
      <View
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
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? formatDate(value, locale) : (placeholder ?? t('form.pickDate'))}`}
          onPress={openSheet}
          style={styles.fieldMain}
        >
          <Icon name="calendar-outline" size={18} color={colors.textSecondary} />
          <Text variant="body" tone={value ? 'default' : 'tertiary'} style={styles.flex}>
            {value ? formatDate(value, locale) : (placeholder ?? t('form.pickDate'))}
          </Text>
        </Pressable>
        {value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('form.clear')} hitSlop={10} onPress={() => onChange(null)}>
            <Icon name="close-circle" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={close} accessibilityLabel={t('common.close')} />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <View style={styles.crumbs}>
              {(
                [
                  ['year', year != null ? String(year) : null],
                  ['month', month != null ? monthNames[month - 1] : null],
                ] as const
              ).map(([s, text]) =>
                text ? (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    onPress={() => setStep(s)}
                    style={[
                      styles.crumb,
                      { backgroundColor: step === s ? colors.primarySoft : colors.surfaceAlt, borderRadius: radii.pill },
                    ]}
                  >
                    <Text variant="caption" color={step === s ? colors.primary : colors.textSecondary}>
                      {text}
                    </Text>
                  </Pressable>
                ) : null,
              )}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={10} onPress={close}>
              <Icon name="close" size={22} />
            </Pressable>
          </View>
          <Text variant="headline" accessibilityRole="header" testID="date-step-title">
            {title}
          </Text>

          <ScrollView style={styles.body} contentContainerStyle={styles.grid}>
            {step === 'year'
              ? years.map((y) =>
                  cell(
                    String(y),
                    String(y),
                    y === year,
                    () => {
                      setYear(y);
                      setStep('month');
                    },
                    `date-year-${y}`,
                  ),
                )
              : null}
            {step === 'month'
              ? monthNames.map((name, i) =>
                  cell(
                    name,
                    name,
                    i + 1 === month,
                    () => {
                      setMonth(i + 1);
                      setStep('day');
                    },
                    `date-month-${i + 1}`,
                  ),
                )
              : null}
            {step === 'day' && year != null && month != null
              ? Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) =>
                  cell(
                    String(d),
                    String(d),
                    current?.getFullYear() === year && current.getMonth() + 1 === month && current.getDate() === d,
                    () => pickDay(d),
                    `date-day-${d}`,
                  ),
                )
              : null}
          </ScrollView>
          {step !== 'year' ? (
            <Button title={t('common.back')} variant="ghost" size="md" onPress={() => setStep(step === 'day' ? 'month' : 'year')} />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  flex: { flex: 1 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, minHeight: 50 },
  fieldMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50 },
  backdrop: { flex: 1 },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 640,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
    maxHeight: '75%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 32 },
  crumbs: { flexDirection: 'row', gap: 8 },
  crumb: { paddingHorizontal: 12, paddingVertical: 6 },
  body: { flexGrow: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 },
  cell: { minHeight: 52, alignItems: 'center', justifyContent: 'center' },
  dayCell: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
});
