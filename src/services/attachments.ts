import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

import type { NewAttachment } from '@/db/itemRepository';
import type { PendingAttachment } from '@/state/drafts';

/**
 * Attachments are copied into the app's document directory and referenced by
 * file name only: absolute container paths change between iOS app updates.
 */
const DIR_NAME = 'attachments';

function attachmentsDir(): Directory {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

export function extensionFor(mimeType: string, uri?: string): string {
  const fromMime: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  };
  if (fromMime[mimeType]) return fromMime[mimeType];
  const m = uri ? /\.([a-z0-9]{2,5})(?:\?|$)/i.exec(uri) : null;
  return m ? m[1].toLowerCase() : 'bin';
}

export function attachmentUri(fileName: string): string {
  if (/^(data|blob|https?|file|content):/.test(fileName)) return fileName;
  return new File(Paths.document, DIR_NAME, fileName).uri;
}

export async function persistAttachment(p: PendingAttachment): Promise<NewAttachment> {
  const fileName = `${Crypto.randomUUID()}.${extensionFor(p.mimeType, p.uri)}`;
  const dest = new File(attachmentsDir(), fileName);
  await new File(p.uri).copy(dest);
  let sizeBytes = p.sizeBytes ?? null;
  try {
    sizeBytes = dest.size ?? sizeBytes;
  } catch {
    // size is best effort
  }
  return { fileName, mimeType: p.mimeType, kind: p.kind, width: p.width ?? null, height: p.height ?? null, sizeBytes };
}

export function deleteAttachmentFile(fileName: string): void {
  try {
    const f = new File(Paths.document, DIR_NAME, fileName);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn('[attachments] delete failed', e);
  }
}

export function deleteAllAttachmentFiles(): void {
  try {
    const dir = new Directory(Paths.document, DIR_NAME);
    if (dir.exists) dir.delete();
  } catch (e) {
    console.warn('[attachments] wipe failed', e);
  }
}
