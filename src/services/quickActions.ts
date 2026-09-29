import * as QuickActions from 'expo-quick-actions';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useI18n } from '@/i18n';

type Href = '/search' | '/scan?source=camera' | '/add';

let initialHandled = false;

function isHref(v: unknown): v is Href {
  return v === '/search' || v === '/scan?source=camera' || v === '/add';
}

/**
 * Home-screen quick actions (long-press the app icon): "Find credit" opens
 * search with the keyboard up, "Scan receipt" goes straight to the camera flow.
 * Titles are localized and refreshed when the language changes.
 */
export function useQuickActions() {
  const { t, lang } = useI18n();

  useEffect(() => {
    if (Platform.OS === 'web') return;
    QuickActions.setItems([
      {
        id: 'search',
        title: t('quick.search'),
        icon: Platform.OS === 'ios' ? 'symbol:magnifyingglass' : undefined,
        params: { href: '/search' },
      },
      {
        id: 'scan',
        title: t('quick.scan'),
        icon: Platform.OS === 'ios' ? 'symbol:doc.viewfinder' : undefined,
        params: { href: '/scan?source=camera' },
      },
      { id: 'add', title: t('quick.add'), icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : undefined, params: { href: '/add' } },
    ]).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const go = (action: QuickActions.Action | null | undefined) => {
      const href = action?.params?.href;
      if (isHref(href)) setTimeout(() => router.push(href), 50);
    };
    if (!initialHandled && QuickActions.initial) {
      initialHandled = true;
      go(QuickActions.initial);
    }
    const sub = QuickActions.addListener(go);
    return () => sub.remove();
  }, []);
}
