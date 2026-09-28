import type { ResolvedSharePayload, SharePayload } from 'expo-sharing';

import type { PendingAttachment } from '@/state/drafts';

import { firstUrl } from './analyzeLink';

export type ShareDecision =
  | { kind: 'wait' }
  | { kind: 'text'; text: string; url: string | null }
  | { kind: 'file'; attachment: PendingAttachment }
  | { kind: 'unsupported' }
  | { kind: 'nothing' };

/**
 * Pure routing for content shared into the app. Text and links are handled
 * immediately (no resolution needed); files wait until the share payloads are
 * resolved to readable URIs.
 */
export function decideShare(shared: SharePayload[], resolved: ResolvedSharePayload[], isResolving: boolean): ShareDecision {
  const text = shared
    .filter((p) => (p.shareType ?? 'text') === 'text' || p.shareType === 'url')
    .map((p) => p.value ?? '')
    .join('\n')
    .trim();
  if (text) return { kind: 'text', text, url: firstUrl(text) };

  if (isResolving) return { kind: 'wait' };
  const file = resolved.find((p) => p.contentUri && (p.contentType === 'image' || p.contentType === 'file'));
  if (file?.contentUri) {
    const mimeType = file.contentMimeType ?? file.mimeType ?? (file.contentType === 'image' ? 'image/jpeg' : 'application/octet-stream');
    if (!mimeType.startsWith('image/') && mimeType !== 'application/pdf') return { kind: 'unsupported' };
    return {
      kind: 'file',
      attachment: {
        uri: file.contentUri,
        mimeType,
        kind: mimeType === 'application/pdf' ? 'document' : 'screenshot',
        sizeBytes: file.contentSize ?? null,
      },
    };
  }
  return shared.length === 0 && resolved.length === 0 ? { kind: 'nothing' } : { kind: 'unsupported' };
}
