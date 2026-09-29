import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { PendingAttachment } from '@/state/drafts';

import type { ExtractionInput } from './claude';

/** Claude downsamples anything larger; sending less makes uploads and inference faster. */
const MAX_EDGE = 1568;

/** Produces a compact base64 payload (JPEG ≤1568px, or the PDF as-is) for the extraction request. */
export async function prepareForExtraction(a: PendingAttachment): Promise<ExtractionInput> {
  if (a.mimeType === 'application/pdf') {
    return { data: await new File(a.uri).base64(), mediaType: 'application/pdf' };
  }
  let ref = await ImageManipulator.manipulate(a.uri).renderAsync();
  if (Math.max(ref.width, ref.height) > MAX_EDGE) {
    ref = await ImageManipulator.manipulate(ref)
      .resize(ref.width >= ref.height ? { width: MAX_EDGE } : { height: MAX_EDGE })
      .renderAsync();
  }
  const out = await ref.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!out.base64) throw new Error('Could not encode image');
  return { data: out.base64, mediaType: 'image/jpeg' };
}
