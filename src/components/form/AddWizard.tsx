import { router, Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StoreAvatar } from '@/components/item/StoreAvatar';
import { Button, Chip, Icon, IconButton, type IconName, Text, successFeedback, tapFeedback, warningFeedback } from '@/components/ui';
import { addMonths, formatDate, todayIso } from '@/domain/dates';
import { SUPPORTED_CURRENCIES, currencySymbol, formatMoney, parseAmountToMinor } from '@/domain/money';
import type { ItemDraft, ItemType } from '@/domain/types';
import { type ItemFormValues, validateItemForm } from '@/domain/validation';
import { useI18n, type StringKey } from '@/i18n';
import { defaultNetworkId, networkLabel, networkStores, networksForPlatform } from '@/networks/registry';
import { findBrand } from '@/search/brands';
import { suggestBrands } from '@/search/searchIndex';
import { useScannedCode } from '@/state/scannedCode';
import { useTheme } from '@/theme/ThemeProvider';

import { DateField } from './DateField';
import { BigField, QuestionCard } from './Question';
import { toValues } from './ItemForm';

type StepId = 'type' | 'store' | 'amount' | 'expiry' | 'code' | 'confirm';
const STEPS: StepId[] = ['type', 'store', 'amount', 'expiry', 'code', 'confirm'];

export interface AddWizardProps {
  initial: ItemDraft;
  onSubmit: (draft: ItemDraft) => Promise<void>;
}

/**
 * Manual add, one question per screen: type → store → amount → expiry → number → confirm.
 * Anything else (PIN, link, notes, receipts …) is added later from the card's Edit screen.
 */
export function AddWizard({ initial, onSubmit }: AddWizardProps) {
  const { colors, radii } = useTheme();
  const { t, lang, locale } = useI18n();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<ItemFormValues>(() => toValues(initial));
  const [index, setIndex] = useState(0);
  // Set when a line on the confirm screen sent the user back to change something.
  const [fromConfirm, setFromConfirm] = useState(false);
  const [error, setError] = useState<StringKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [storeFocused, setStoreFocused] = useState(false);
  const storeRef = useRef<TextInput>(null);

  const step = STEPS[index];
  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setError(null);
  };
  // A different store means a different set of card types, so a type picked for the previous store must not stick.
  const setStore = (name: string) => {
    setValues((v) => ({ ...v, storeName: name, network: findBrand(v.storeName)?.id === findBrand(name)?.id ? v.network : null }));
    setError(null);
  };

  const goTo = (i: number) => {
    setError(null);
    setIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
  };
  const back = (): boolean => {
    if (index === 0) return false;
    goTo(fromConfirm ? STEPS.length - 1 : index - 1);
    setFromConfirm(false);
    return true;
  };
  const advance = () => {
    if (fromConfirm) {
      setFromConfirm(false);
      goTo(STEPS.length - 1);
    } else goTo(index + 1);
  };
  // One-tap answers move on after a beat; a quick double tap must not skip the following step.
  const pendingAdvance = useRef<number | null>(null);
  useEffect(() => {
    pendingAdvance.current = null;
  }, [index]);
  const advanceSoon = () => {
    if (pendingAdvance.current === index) return;
    pendingAdvance.current = index;
    setTimeout(advance, 160);
  };

  // Android hardware back walks the steps instead of closing the whole flow.
  const backRef = useRef(back);
  useEffect(() => {
    backRef.current = back;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => backRef.current());
    return () => sub.remove();
  }, []);

  // A barcode read by the camera screen (opened on top of this one) fills the number field.
  useEffect(
    () =>
      useScannedCode.subscribe((st) => {
        if (!st.result) return;
        const { data, format } = st.result;
        st.clear();
        setValues((v) => ({ ...v, code: data, barcodeFormat: format }));
        successFeedback();
      }),
    [],
  );

  const cardTypes = useMemo(() => networksForPlatform(findBrand(values.storeName)?.id), [values.storeName]);
  const selectedNetworkId = cardTypes.some((n) => n.id === values.network)
    ? values.network
    : defaultNetworkId(findBrand(values.storeName)?.id);
  const storeCount = useMemo(
    () => (selectedNetworkId ? networkStores(selectedNetworkId).filter((st) => st.physical).length : 0),
    [selectedNetworkId],
  );
  const suggestions = useMemo(() => {
    if (!storeFocused || values.storeName.trim().length < 2) return [];
    const exact = findBrand(values.storeName);
    return suggestBrands(values.storeName, 4).filter((b) => b.id !== exact?.id);
  }, [values.storeName, storeFocused]);

  const amountMinor = values.amount.trim() ? parseAmountToMinor(values.amount, values.currency) : null;
  const expiryBase = todayIso();

  const next = () => {
    if (step === 'store' && !values.storeName.trim()) {
      warningFeedback();
      setError('form.error.store');
      return;
    }
    if (step === 'amount' && !(amountMinor !== null && amountMinor > 0)) {
      warningFeedback();
      setError(values.amount.trim() ? 'form.error.amount' : 'form.error.amountRequired');
      return;
    }
    tapFeedback();
    advance();
  };

  const save = async () => {
    const { errors, draft } = validateItemForm({ ...values, balance: '' }, { requireAmount: true });
    if (!draft) {
      warningFeedback();
      // Send the user to the first step that has a problem.
      goTo(errors.storeName ? 1 : 2);
      setFromConfirm(true);
      setError((errors.storeName ?? errors.amount ?? null) as StringKey | null);
      return;
    }
    if (!draft.storeCategory) draft.storeCategory = findBrand(draft.storeName)?.category ?? null;
    if (!cardTypes.some((n) => n.id === draft.network)) draft.network = null;
    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit(draft);
      successFeedback();
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      setSaving(false);
    }
  };

  const pickType = (type: ItemType) => {
    tapFeedback();
    set('type', type);
    // One tap is the whole answer: move on after a beat so the choice registers.
    advanceSoon();
  };
  const pickExpiry = (iso: string | null) => {
    tapFeedback();
    set('expiryDate', iso);
    advanceSoon();
  };

  const errorText = error ? t(error) : null;

  const summary = [
    index > 0 ? t(`type.${values.type}`) : null,
    index > 1 && values.storeName.trim() ? values.storeName.trim() : null,
    index > 2 && amountMinor != null ? formatMoney(amountMinor, values.currency, locale) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  const header = (
    <Stack.Screen
      options={{
        title: t('form.titleNew'),
        // "New card" with what has been answered so far underneath, e.g. "Gift card · Zara · ₪50".
        headerTitle: () => (
          <View style={styles.headerTitle}>
            <Text variant="headline">{t('form.titleNew')}</Text>
            {summary ? (
              <Text variant="footnote" tone="secondary" numberOfLines={1}>
                {summary}
              </Text>
            ) : null}
          </View>
        ),
        headerLeft: () => (
          <IconButton
            icon={index === 0 ? 'close' : 'chevron-back'}
            label={index === 0 ? t('common.close') : t('common.back')}
            onPress={() => {
              if (!back()) router.back();
            }}
            testID="wizard-back"
          />
        ),
      }}
    />
  );

  const typeCard = (type: ItemType, icon: IconName, label: string, hint: string) => {
    const selected = values.type === type && fromConfirm;
    return (
      <Pressable
        key={type}
        testID={`wizard-type-${type}`}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => pickType(type)}
        style={({ pressed }) => [
          styles.typeTile,
          {
            borderRadius: radii.card,
            backgroundColor: pressed ? colors.surfacePressed : colors.surface,
            borderColor: selected ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={[styles.typeIcon, { backgroundColor: colors.primarySoft }]}>
          <Icon name={icon} size={52} color={colors.primary} />
        </View>
        <View style={styles.typeTexts}>
          <Text variant="title" style={styles.centerText}>
            {label}
          </Text>
          <Text variant="callout" tone="secondary" style={styles.centerText}>
            {hint}
          </Text>
        </View>
      </Pressable>
    );
  };

  let body: ReactNode = null;
  if (step === 'type') {
    body = (
      <>
        <QuestionCard title={t('wizard.type.title')} />
        <View style={styles.typeColumn}>
          {typeCard('gift_card', 'gift-outline', t('wizard.type.gift'), t('wizard.type.giftHint'))}
          {typeCard('store_credit', 'receipt-outline', t('wizard.type.credit'), t('wizard.type.creditHint'))}
        </View>
      </>
    );
  } else if (step === 'store') {
    body = (
      <>
        <QuestionCard title={t('wizard.store.title')}>
          <BigField
            ref={storeRef}
            testID="wizard-store"
            placeholder={t('form.storePlaceholder')}
            value={values.storeName}
            onChangeText={setStore}
            onFocus={() => setStoreFocused(true)}
            onBlur={() => setTimeout(() => setStoreFocused(false), 150)}
            onSubmitEditing={next}
            hint={t('wizard.store.hint')}
            error={errorText}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            autoFocus
          />
        </QuestionCard>
        {suggestions.length > 0 ? (
          <View style={styles.gapSm}>
            {suggestions.map((b) => (
              <Pressable
                key={b.id}
                testID={`wizard-suggest-${b.id}`}
                accessibilityRole="button"
                accessibilityLabel={b.nameHe ? `${b.name}, ${b.nameHe}` : b.name}
                onPress={() => {
                  tapFeedback();
                  setStore(b.name);
                  if (!values.storeCategory) set('storeCategory', b.category);
                  storeRef.current?.blur();
                  // One tap is the answer — unless it is a multi-store card (BuyMe, Tav Zahav …): stay so its type and stores show.
                  if (networksForPlatform(b.id).length === 0) advanceSoon();
                }}
                style={({ pressed }) => [
                  styles.suggestion,
                  { borderRadius: radii.lg, borderColor: colors.border, backgroundColor: pressed ? colors.surfacePressed : colors.surface },
                ]}
              >
                <StoreAvatar name={b.name} names={[b.nameHe]} size={44} />
                <View style={styles.flex}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {lang === 'he' ? (b.nameHe ?? b.name) : b.name}
                  </Text>
                  {b.nameHe ? (
                    <Text variant="footnote" tone="tertiary" numberOfLines={1}>
                      {lang === 'he' ? b.name : b.nameHe}
                    </Text>
                  ) : null}
                </View>
                <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {cardTypes.length > 0 ? (
          <View style={styles.gapSm}>
            {cardTypes.length > 1 ? (
              <Text variant="caption" tone="secondary">
                {t('form.cardType')}
              </Text>
            ) : null}
            <View style={styles.chips}>
              {(cardTypes.length > 1 ? cardTypes : []).map((n) => (
                <Chip
                  accent
                  key={n.id}
                  label={networkLabel(n, lang)}
                  selected={(values.network ?? cardTypes[0].id) === n.id}
                  onPress={() => set('network', n.id === cardTypes[0].id ? null : n.id)}
                />
              ))}
            </View>
            <Text variant="footnote" tone="tertiary">
              {storeCount > 0 ? t('wizard.store.worksAt', { count: storeCount }) : t('form.cardTypeHint')}
            </Text>
          </View>
        ) : null}
      </>
    );
  } else if (step === 'amount') {
    body = (
      <>
        <QuestionCard title={t('wizard.amount.title')}>
          <BigField
            testID="wizard-amount"
            size="xl"
            placeholder="0"
            keyboardType="decimal-pad"
            value={values.amount}
            onChangeText={(v) => set('amount', v)}
            onSubmitEditing={next}
            hint={t('wizard.amount.hint')}
            error={errorText}
            autoFocus
            prefix={
              <Text variant="title" tone="secondary" style={styles.currencySign}>
                {currencySymbol(values.currency)}
              </Text>
            }
          />
        </QuestionCard>
        <View style={styles.chips} accessibilityLabel={t('form.currency')}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <Chip accent key={c} label={`${currencySymbol(c)} ${c}`} selected={values.currency === c} onPress={() => set('currency', c)} />
          ))}
        </View>
      </>
    );
  } else if (step === 'expiry') {
    body = (
      <>
        <QuestionCard title={t('wizard.expiry.title')} />
        <View style={styles.expiryGrid}>
          {(
            [
              [6, 'form.in6Months'],
              [12, 'form.in1Year'],
              [24, 'form.in2Years'],
              [null, 'form.noExpiry'],
            ] as const
          ).map(([m, key]) => {
            const iso = m === null ? null : addMonths(expiryBase, m);
            const selected = m === null ? values.expiryDate === null && fromConfirm : values.expiryDate === iso;
            return (
              <Pressable
                key={key}
                testID={m === null ? 'wizard-expiry-none' : `wizard-expiry-${m}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => pickExpiry(iso)}
                style={({ pressed }) => [
                  styles.expiryTile,
                  {
                    borderRadius: radii.lg,
                    backgroundColor: selected ? colors.primarySoft : pressed ? colors.surfacePressed : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text variant="headline">{t(key)}</Text>
                <Text variant="footnote" tone="secondary" numberOfLines={1}>
                  {iso ? formatDate(iso, locale) : t('wizard.expiry.never')}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <DateField
          testID="wizard-expiry-date"
          label={t('wizard.expiry.pick')}
          value={values.expiryDate}
          onChange={(v) => {
            set('expiryDate', v);
            if (v) advanceSoon();
          }}
          placeholder={t('form.noExpiry')}
        />
      </>
    );
  } else if (step === 'code') {
    body = (
      <>
        <QuestionCard title={t('wizard.code.title')}>
          <BigField
            testID="wizard-code"
            placeholder={t('form.code')}
            value={values.code}
            onChangeText={(v) => set('code', v)}
            onSubmitEditing={next}
            hint={t('wizard.code.hint')}
            autoCapitalize="characters"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="done"
            autoFocus
            mono
            suffix={
              <IconButton
                icon="barcode-outline"
                size={44}
                iconSize={24}
                tone="filled"
                label={t('wizard.code.scan')}
                onPress={() => router.push('/scan-code')}
                testID="wizard-scan"
              />
            }
          />
        </QuestionCard>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            set('code', '');
            tapFeedback();
            advance();
          }}
          style={styles.link}
          testID="wizard-code-skip"
        >
          <Text variant="callout" tone="primary">
            {t('wizard.code.skip')}
          </Text>
        </Pressable>
      </>
    );
  } else {
    const rows: { id: StepId; label: string; value: string }[] = [
      { id: 'type', label: t('form.type'), value: t(`type.${values.type}`) },
      { id: 'store', label: t('form.store'), value: values.storeName.trim() },
      {
        id: 'amount',
        label: t('form.amount'),
        value: amountMinor != null ? formatMoney(amountMinor, values.currency, locale) : '',
      },
      { id: 'expiry', label: t('form.expiry'), value: values.expiryDate ? formatDate(values.expiryDate, locale) : t('form.noExpiry') },
      { id: 'code', label: t('form.code'), value: values.code.trim() || t('wizard.confirm.noCode') },
    ];
    body = (
      <>
        <QuestionCard title={t('wizard.confirm.title')} subtitle={t('wizard.confirm.tap')} />
        <View style={[styles.summary, { backgroundColor: colors.surface, borderRadius: radii.card, borderColor: colors.border }]}>
          <View style={styles.summaryHead}>
            <StoreAvatar name={values.storeName || '?'} size={48} />
            <View style={styles.flex}>
              <Text variant="headline" numberOfLines={1}>
                {values.storeName.trim()}
              </Text>
              <Text variant="callout" tone="secondary">
                {t(`type.${values.type}`)}
              </Text>
            </View>
            <Text variant="title" numeric>
              {amountMinor != null ? formatMoney(amountMinor, values.currency, locale) : ''}
            </Text>
          </View>
          {rows.map((r) => (
            <Pressable
              key={r.id}
              testID={`wizard-row-${r.id}`}
              accessibilityRole="button"
              accessibilityLabel={`${r.label}: ${r.value}`}
              onPress={() => {
                tapFeedback();
                setFromConfirm(true);
                goTo(STEPS.indexOf(r.id));
              }}
              style={[styles.row, { borderTopColor: colors.border }]}
            >
              <Text variant="callout" tone="secondary" style={styles.rowLabel}>
                {r.label}
              </Text>
              <Text variant="body" numberOfLines={1} style={styles.rowValue}>
                {r.value}
              </Text>
              <Icon name="chevron-forward" size={16} color={colors.textTertiary} />
            </Pressable>
          ))}
        </View>
        <Text variant="footnote" tone="tertiary">
          {t('wizard.confirm.more')}
        </Text>
        {submitError ? (
          <Text tone="danger" variant="callout">
            {submitError}
          </Text>
        ) : null}
      </>
    );
  }

  const last = step === 'confirm';
  // Steps with a text field keep Continue inside the content, right under the field: a button pinned to the
  // bottom of the screen ends up behind the keyboard. Only the confirm screen (no keyboard) pins Save.
  const inlineContinue = step === 'store' || step === 'amount' || step === 'code';

  return (
    <View style={styles.flex}>
      {header}
      <View style={styles.progress} accessibilityLabel={t('wizard.step', { n: index + 1, total: STEPS.length })}>
        {STEPS.map((s, i) => (
          <View key={s} style={[styles.bar, { backgroundColor: i <= index ? colors.primary : colors.border }]} />
        ))}
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, styles.grow, { paddingBottom: insets.bottom + 16 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View key={step} entering={FadeInDown.duration(220)} style={[styles.gapLg, step === 'type' ? styles.flex : null]}>
          {body}
          {inlineContinue ? <Button testID="wizard-next" title={t('wizard.next')} onPress={next} fullWidth /> : null}
        </Animated.View>
      </ScrollView>
      {last ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Button testID="wizard-save" title={t('wizard.save')} icon="checkmark" onPress={save} loading={saving} fullWidth />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  progress: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 4 },
  bar: { flex: 1, height: 4, borderRadius: 2 },
  content: { padding: 20, paddingTop: 28 },
  grow: { flexGrow: 1 },
  gapLg: { gap: 20 },
  gap: { gap: 12 },
  gapSm: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  headerTitle: { alignItems: 'center', maxWidth: 240 },
  currencySign: { fontSize: 30, lineHeight: 36 },
  link: { alignSelf: 'flex-start', paddingVertical: 6 },
  typeColumn: { flex: 1, gap: 12 },
  typeTile: { flex: 1, padding: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 18 },
  expiryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  expiryTile: { width: '48%', flexGrow: 1, padding: 16, borderWidth: 1.5, gap: 4, minHeight: 84, justifyContent: 'center' },
  typeIcon: { width: 104, height: 104, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  typeTexts: { gap: 4, alignItems: 'center' },
  centerText: { textAlign: 'center' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth },
  summary: { borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { width: 96 },
  rowValue: { flex: 1 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
