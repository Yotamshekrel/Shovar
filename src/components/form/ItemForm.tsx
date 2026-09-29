import { Image } from 'expo-image';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Icon, Segmented, Text, TextField, successFeedback, warningFeedback } from '@/components/ui';
import { addMonths, todayIso } from '@/domain/dates';
import { SUPPORTED_CURRENCIES, currencySymbol, minorToInput } from '@/domain/money';
import type { BarcodeFormat, ItemDraft, ItemType } from '@/domain/types';
import { type FormErrors, type ItemFormValues, validateItemForm } from '@/domain/validation';
import { useI18n } from '@/i18n';
import { STORE_CATEGORIES, findBrand } from '@/search/brands';
import { suggestBrands } from '@/search/searchIndex';
import type { DraftField, PendingAttachment } from '@/state/drafts';
import { useTheme } from '@/theme/ThemeProvider';

import { DateField } from './DateField';

export interface ItemFormProps {
  initial: ItemDraft;
  mode: 'new' | 'edit' | 'review';
  lowConfidence?: DraftField[];
  attachments?: PendingAttachment[];
  banner?: ReactNode;
  submitLabel?: string;
  onSubmit: (draft: ItemDraft) => Promise<void>;
}

function toValues(d: ItemDraft): ItemFormValues {
  return {
    type: d.type,
    storeName: d.storeName,
    storeCategory: d.storeCategory,
    amount: minorToInput(d.amountMinor, d.currency),
    balance: d.balanceMinor != null && d.balanceMinor !== d.amountMinor ? minorToInput(d.balanceMinor, d.currency) : '',
    currency: d.currency,
    expiryDate: d.expiryDate,
    purchaseDate: d.purchaseDate,
    code: d.code ?? '',
    pin: d.pin ?? '',
    barcodeFormat: d.barcodeFormat,
    linkUrl: d.linkUrl ?? '',
    notes: d.notes ?? '',
    source: d.source,
  };
}

export function ItemForm({ initial, mode, lowConfidence = [], attachments = [], banner, submitLabel, onSubmit }: ItemFormProps) {
  const { colors, radii } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [values, setValues] = useState<ItemFormValues>(() => toValues(initial));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Set<keyof ItemFormValues>>(new Set());
  const hasExtraValues = !!(
    initial.pin ||
    initial.linkUrl ||
    initial.notes ||
    initial.purchaseDate ||
    (mode === 'edit' && initial.balanceMinor != null && initial.balanceMinor !== initial.amountMinor)
  );
  const [showMore, setShowMore] = useState(mode === 'edit' || hasExtraValues);
  const storeRef = useRef<TextInput>(null);
  const [storeFocused, setStoreFocused] = useState(false);

  const low = useMemo(() => new Set<string>(lowConfidence), [lowConfidence]);
  const isLow = (f: keyof ItemFormValues) => {
    const key = f === 'amount' ? 'amountMinor' : f === 'balance' ? 'balanceMinor' : f;
    return low.has(key) && !touched.has(f);
  };

  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setTouched((s) => (s.has(key) ? s : new Set(s).add(key)));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const suggestions = useMemo(() => {
    if (!storeFocused || values.storeName.trim().length < 2) return [];
    const exact = findBrand(values.storeName);
    return suggestBrands(values.storeName, 4).filter((b) => b.id !== exact?.id);
  }, [values.storeName, storeFocused]);

  const chooseBrand = (name: string, category: string) => {
    set('storeName', name);
    if (!values.storeCategory) set('storeCategory', category);
    storeRef.current?.blur();
  };

  const expiryBase = values.purchaseDate ?? todayIso();

  const submit = async () => {
    // A new card starts with its full amount; the balance is only editable on existing cards.
    const { errors: errs, draft } = validateItemForm(mode === 'edit' ? values : { ...values, balance: '' });
    setErrors(errs);
    if (!draft) {
      warningFeedback();
      if (errs.balance || errs.linkUrl) setShowMore(true);
      return;
    }
    // Auto-fill category from known brands when the user didn't choose one.
    if (!draft.storeCategory) draft.storeCategory = findBrand(draft.storeName)?.category ?? null;
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

  const typeOptions: { value: ItemType; label: string }[] = [
    { value: 'store_credit', label: t('type.store_credit') },
    { value: 'gift_card', label: t('type.gift_card') },
  ];
  const barcodeOptions: { value: BarcodeFormat; label: string }[] = [
    { value: 'code128', label: t('form.barcode.code128') },
    { value: 'qr', label: t('form.barcode.qr') },
    { value: 'text', label: t('form.barcode.text') },
  ];

  const errorText = (k: keyof ItemFormValues) => (errors[k] ? t(errors[k]!) : null);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Android is edge-to-edge (the OS no longer resizes the window), so it needs 'padding' too.
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {banner}
        {mode === 'review' && low.size > 0 ? (
          <View style={[styles.notice, { backgroundColor: colors.highlight, borderColor: colors.highlightBorder, borderRadius: radii.md }]}>
            <Icon name="alert-circle" size={18} color={colors.highlightBorder} />
            <Text variant="callout" style={styles.flex}>
              {t('form.lowConfidence')}
            </Text>
          </View>
        ) : null}

        {attachments.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {attachments.map((a) => (
              <View
                key={a.uri}
                style={[styles.thumb, { borderRadius: radii.md, backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
              >
                {a.mimeType.startsWith('image/') ? (
                  <Image source={{ uri: a.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : (
                  <View style={styles.thumbDoc}>
                    <Icon name="document-text-outline" size={28} color={colors.textSecondary} />
                    <Text variant="footnote" tone="secondary">
                      PDF
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : null}

        <Segmented options={typeOptions} value={values.type} onChange={(v) => set('type', v)} highlighted={isLow('type')} />

        <View style={styles.gapSm}>
          <TextField
            ref={storeRef}
            testID="field-store"
            label={t('form.store')}
            placeholder={t('form.storePlaceholder')}
            value={values.storeName}
            onChangeText={(v) => set('storeName', v)}
            onFocus={() => setStoreFocused(true)}
            onBlur={() => setTimeout(() => setStoreFocused(false), 150)}
            error={errorText('storeName')}
            highlighted={isLow('storeName')}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
            autoFocus={mode === 'new'}
          />
          {suggestions.length > 0 ? (
            <View style={styles.chipsWrap}>
              {suggestions.map((b) => (
                <Chip
                  key={b.id}
                  label={b.nameHe ? `${b.name} · ${b.nameHe}` : b.name}
                  icon="storefront-outline"
                  onPress={() => chooseBrand(b.name, b.category)}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              testID="field-amount"
              label={t('form.amount')}
              placeholder="0"
              keyboardType="decimal-pad"
              value={values.amount}
              onChangeText={(v) => set('amount', v)}
              error={errorText('amount')}
              highlighted={isLow('amount')}
              prefix={
                <Text variant="bodyStrong" tone="secondary">
                  {currencySymbol(values.currency)}
                </Text>
              }
            />
          </View>
        </View>
        <View style={styles.chipsWrap} accessibilityLabel={t('form.currency')}>
          {SUPPORTED_CURRENCIES.map((c) => (
            <Chip key={c} label={`${currencySymbol(c)} ${c}`} selected={values.currency === c} onPress={() => set('currency', c)} />
          ))}
          {!SUPPORTED_CURRENCIES.includes(values.currency as (typeof SUPPORTED_CURRENCIES)[number]) ? (
            <Chip label={values.currency} selected />
          ) : null}
        </View>

        <View style={styles.gapSm}>
          <DateField
            testID="field-expiry"
            label={t('form.expiry')}
            value={values.expiryDate}
            onChange={(v) => set('expiryDate', v)}
            highlighted={isLow('expiryDate')}
            placeholder={t('form.noExpiry')}
          />
          <View style={styles.chipsWrap}>
            {(
              [
                [6, 'form.in6Months'],
                [12, 'form.in1Year'],
                [24, 'form.in2Years'],
              ] as const
            ).map(([m, key]) => (
              <Chip
                key={m}
                label={t(key)}
                selected={values.expiryDate === addMonths(expiryBase, m)}
                onPress={() => set('expiryDate', addMonths(expiryBase, m))}
              />
            ))}
            <Chip label={t('form.noExpiry')} selected={values.expiryDate === null} onPress={() => set('expiryDate', null)} />
          </View>
        </View>

        <TextField
          testID="field-code"
          label={t('form.code')}
          placeholder={t('form.codePlaceholder')}
          value={values.code}
          onChangeText={(v) => set('code', v)}
          hint={t('form.codeHint')}
          highlighted={isLow('code')}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          mono
        />

        <Pressable accessibilityRole="button" onPress={() => setShowMore((s) => !s)} style={styles.moreToggle} testID="toggle-more">
          <Text variant="bodyStrong" tone="primary">
            {showMore ? t('form.lessDetails') : t('form.moreDetails')}
          </Text>
          <Icon name={showMore ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </Pressable>

        {showMore ? (
          <View style={styles.gap}>
            {mode === 'edit' ? (
              <TextField
                testID="field-balance"
                label={t('form.balance')}
                placeholder={values.amount || '0'}
                keyboardType="decimal-pad"
                value={values.balance}
                onChangeText={(v) => set('balance', v)}
                error={errorText('balance')}
                highlighted={isLow('balance')}
                prefix={
                  <Text variant="bodyStrong" tone="secondary">
                    {currencySymbol(values.currency)}
                  </Text>
                }
              />
            ) : null}
            <TextField
              label={t('form.pin')}
              value={values.pin}
              onChangeText={(v) => set('pin', v)}
              highlighted={isLow('pin')}
              keyboardType="number-pad"
              autoCorrect={false}
              mono
            />
            <TextField
              testID="field-link"
              label={t('form.link')}
              placeholder={t('form.linkPlaceholder')}
              value={values.linkUrl}
              onChangeText={(v) => set('linkUrl', v)}
              error={errorText('linkUrl')}
              highlighted={isLow('linkUrl')}
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <DateField
              label={t('form.purchaseDate')}
              value={values.purchaseDate}
              range="past"
              onChange={(v) => set('purchaseDate', v)}
              highlighted={isLow('purchaseDate')}
            />
            <View style={styles.gapSm}>
              <Text variant="caption" tone="secondary">
                {t('form.category')}
              </Text>
              <View style={styles.chipsWrap}>
                {STORE_CATEGORIES.map((c) => (
                  <Chip
                    key={c}
                    label={t(`category.${c}`)}
                    selected={values.storeCategory === c}
                    onPress={() => set('storeCategory', values.storeCategory === c ? null : c)}
                  />
                ))}
              </View>
            </View>
            <View style={styles.gapSm}>
              <Text variant="caption" tone="secondary">
                {t('form.barcode')}
              </Text>
              <Segmented options={barcodeOptions} value={values.barcodeFormat} onChange={(v) => set('barcodeFormat', v)} />
            </View>
            <TextField
              label={t('form.notes')}
              placeholder={t('form.notesPlaceholder')}
              value={values.notes}
              onChangeText={(v) => set('notes', v)}
              multiline
            />
          </View>
        ) : null}

        {submitError ? (
          <Text tone="danger" variant="callout">
            {submitError}
          </Text>
        ) : null}
      </ScrollView>
      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, 12), borderTopColor: colors.border, backgroundColor: colors.background },
        ]}
      >
        <Button testID="form-submit" title={submitLabel ?? t('common.save')} onPress={submit} loading={saving} fullWidth icon="checkmark" />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 18 },
  gap: { gap: 18 },
  gapSm: { gap: 8 },
  row: { flexDirection: 'row', gap: 12 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderWidth: 1 },
  thumbs: { gap: 10 },
  thumb: { width: 84, height: 108, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  thumbDoc: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  moreToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  footer: { paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
