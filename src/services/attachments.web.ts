import type { NewAttachment } from '@/db/itemRepository';
import type { PendingAttachment } from '@/state/drafts';

// Web preview: there is no app sandbox, so the picked (data/blob) URI is stored as-is.

export function extensionFor(mimeType: string): string {
  return mimeType === 'application/pdf' ? 'pdf' : 'jpg';
}

export function attachmentUri(fileName: string): string {
  return fileName;
}

export async function persistAttachment(p: PendingAttachment): Promise<NewAttachment> {
  return {
    fileName: p.uri,
    mimeType: p.mimeType,
    kind: p.kind,
    width: p.width ?? null,
    height: p.height ?? null,
    sizeBytes: p.sizeBytes ?? null,
  };
}

export function deleteAttachmentFile(): void {}

export function deleteAllAttachmentFiles(): void {}
