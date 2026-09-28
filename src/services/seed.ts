import { buildSeed } from '@/seed/seedData';
import { useItemsStore } from '@/state/items';

import { getServices } from './database';

export async function loadDemoData(): Promise<number> {
  const { items } = await getServices();
  const entries = buildSeed();
  for (const e of entries) {
    const item = await items.createItem(e.draft);
    for (const u of e.usages ?? []) await items.recordUsage(item.id, u.spentMinor, u.note ?? null);
    if (e.markUsed) await items.markUsed(item.id);
  }
  await useItemsStore.getState().refresh();
  return entries.length;
}
