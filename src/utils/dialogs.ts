import { create } from 'zustand';

import type { IconName } from '@/components/ui/Icon';
import { t } from '@/i18n';

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  confirmText: string;
  /** Omitted for simple notices (single button). */
  cancelText?: string;
  destructive?: boolean;
  icon?: IconName;
  resolve: (confirmed: boolean) => void;
}

interface DialogState {
  queue: DialogRequest[];
  push: (req: DialogRequest) => void;
  settle: (id: number, confirmed: boolean) => void;
}

/** Pending dialogs, rendered by `DialogHost` (mounted once in the root layout). */
export const useDialogStore = create<DialogState>((set, get) => ({
  queue: [],
  push: (req) => set((s) => ({ queue: [...s.queue, req] })),
  settle: (id, confirmed) => {
    const req = get().queue.find((r) => r.id === id);
    set((s) => ({ queue: s.queue.filter((r) => r.id !== id) }));
    req?.resolve(confirmed);
  },
}));

let nextId = 1;

/** Promise-based, themed confirm dialog. Resolves false when dismissed. */
export function confirm(opts: {
  title: string;
  message?: string;
  confirmText: string;
  cancelText: string;
  destructive?: boolean;
  icon?: IconName;
}): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().push({ id: nextId++, ...opts, resolve });
  });
}

/** Single-button notice. */
export function notify(title: string, message?: string): void {
  useDialogStore.getState().push({ id: nextId++, title, message, confirmText: t('common.close'), resolve: () => {} });
}
