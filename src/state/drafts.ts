import { create } from 'zustand';

import type { AttachmentKind, ItemDraft } from '@/domain/types';

export type DraftField = keyof ItemDraft;
export type ExtractionSource = 'ai' | 'ocr' | 'text' | 'link' | 'none';

export interface PendingAttachment {
  /** Temporary URI (cache / picker) — copied into app storage on save. */
  uri: string;
  mimeType: string;
  kind: AttachmentKind;
  width?: number | null;
  height?: number | null;
  sizeBytes?: number | null;
}

export interface PendingDraft {
  draft: ItemDraft;
  /** Fields the extractor was unsure about — highlighted on the review screen. */
  lowConfidence: DraftField[];
  attachments: PendingAttachment[];
  extractionSource: ExtractionSource;
  message?: string | null;
}

interface DraftState {
  pending: PendingDraft | null;
  setPending: (p: PendingDraft | null) => void;
}

/** Hands a prefilled draft (from receipt scan, link or share) to the review form. */
export const useDraftStore = create<DraftState>((set) => ({
  pending: null,
  setPending: (pending) => set({ pending }),
}));
