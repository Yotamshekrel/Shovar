import { emptyDraft, type ItemDraft } from '@/domain/types';
import { useSettingsStore } from '@/state/settings';

import { getServices } from './database';

/**
 * Dev-only sample wallet used to render store screenshots in the web preview
 * (`?demo=en|he[&theme=dark|light]`). Never runs in release builds.
 */
function day(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const cards = (): Partial<ItemDraft>[] => [
  { storeName: 'Zara', type: 'store_credit', amountMinor: 32000, balanceMinor: 32000, expiryDate: day(9), code: '4829 1057 7731', notes: 'Return credit' },
  { storeName: 'Super-Pharm', type: 'gift_card', amountMinor: 20000, balanceMinor: 12000, expiryDate: day(96), code: '6280 4417 0093', pin: '4821' },
  { storeName: 'Castro', type: 'store_credit', amountMinor: 18000, balanceMinor: 18000, expiryDate: day(190), code: '5510038274' },
  { storeName: 'BuyMe', type: 'gift_card', amountMinor: 50000, balanceMinor: 50000, expiryDate: day(300), linkUrl: 'https://buyme.co.il/gift/demo' },
  { storeName: 'Golda', type: 'gift_card', amountMinor: 10000, balanceMinor: 6500, expiryDate: day(420), code: '7720158836' },
  { storeName: 'Mango', type: 'store_credit', amountMinor: 24500, balanceMinor: 24500, expiryDate: day(45), code: '9034 5521 1184' },
];

export async function seedDemoIfRequested(): Promise<void> {
  if (!__DEV__ || typeof window === 'undefined') return;
  const q = new URLSearchParams(window.location.search);
  const lang = q.get('demo');
  if (lang !== 'en' && lang !== 'he') return;
  const theme = q.get('theme') === 'dark' ? 'dark' : 'light';
  const { items } = await getServices();
  if ((await items.listItems()).length === 0) {
    for (const c of cards()) await items.createItem(emptyDraft({ currency: 'ILS', ...c }));
  }
  useSettingsStore.getState().patch({ onboardingDone: true, language: lang, theme, aiConsentGiven: true });
}
