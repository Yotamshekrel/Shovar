import { create } from 'zustand';

import type { ItemPatch, NewAttachment } from '@/db/itemRepository';
import type { Item, ItemDraft } from '@/domain/types';
import { getServices } from '@/services/database';

type ChangeListener = (items: Item[]) => void | Promise<void>;
const listeners = new Set<ChangeListener>();

/** Side-effect modules (notifications, geofences) subscribe to item changes here. */
export function onItemsChanged(listener: ChangeListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(items: Item[]) {
  for (const l of listeners) {
    Promise.resolve(l(items)).catch((e) => console.warn('[items] listener failed', e));
  }
}

interface ItemsState {
  items: Item[];
  attachmentCounts: Record<string, number>;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<Item[]>;
  create: (draft: ItemDraft, attachments?: NewAttachment[]) => Promise<Item>;
  update: (id: string, patch: ItemPatch) => Promise<Item>;
  recordUsage: (id: string, spentMinor: number, note?: string | null) => Promise<Item>;
  setBalance: (id: string, balanceMinor: number, note?: string | null) => Promise<Item>;
  markUsed: (id: string) => Promise<Item>;
  reactivate: (id: string) => Promise<Item>;
  remove: (id: string) => Promise<void>;
  addAttachment: (id: string, a: NewAttachment) => Promise<void>;
  removeAttachment: (itemId: string, attachmentId: string) => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => {
  async function mutate<T>(fn: () => Promise<T>): Promise<T> {
    const result = await fn();
    await get().refresh();
    return result;
  }

  return {
    items: [],
    attachmentCounts: {},
    loaded: false,
    error: null,

    async refresh() {
      try {
        const { items: repo } = await getServices();
        await repo.expireOverdue();
        const [items, counts] = await Promise.all([repo.listItems(), repo.countAttachmentsByItem()]);
        set({ items, attachmentCounts: Object.fromEntries(counts), loaded: true, error: null });
        emit(items);
        return items;
      } catch (e) {
        set({ loaded: true, error: e instanceof Error ? e.message : String(e) });
        return get().items;
      }
    },

    create: (draft, attachments) => mutate(async () => (await getServices()).items.createItem(draft, attachments)),
    update: (id, patch) => mutate(async () => (await getServices()).items.updateItem(id, patch)),
    recordUsage: (id, spent, note) => mutate(async () => (await getServices()).items.recordUsage(id, spent, note ?? null)),
    setBalance: (id, balance, note) => mutate(async () => (await getServices()).items.setBalance(id, balance, note ?? null)),
    markUsed: (id) => mutate(async () => (await getServices()).items.markUsed(id)),
    reactivate: (id) => mutate(async () => (await getServices()).items.reactivate(id)),
    remove: (id) => mutate(async () => (await getServices()).items.deleteItem(id)),
    addAttachment: (id, a) =>
      mutate(async () => {
        await (await getServices()).items.addAttachment(id, a);
      }),
    removeAttachment: (_itemId, attachmentId) => mutate(async () => (await getServices()).items.removeAttachment(attachmentId)),
  };
});

export function useItem(id: string | undefined): Item | undefined {
  return useItemsStore((s) => (id ? s.items.find((i) => i.id === id) : undefined));
}
