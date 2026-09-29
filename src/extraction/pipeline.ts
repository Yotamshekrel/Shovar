import { emptyDraft } from '@/domain/types';
import type { ExtractionSource, PendingAttachment } from '@/state/drafts';

import { resolveAiConfig } from './aiConfig';
import { ExtractionError, extractWithClaude } from './claude';
import { type ExtractionResult, normalizeExtraction } from './normalize';
import { recognizeText } from './ocr';
import { prepareForExtraction } from './prepare';
import { parseReceiptText } from './textHeuristics';

export interface PipelineResult extends ExtractionResult {
  source: ExtractionSource;
  /** Why AI extraction was skipped or failed (for a small note on the review screen). */
  aiError?: ExtractionError['kind'] | 'not_configured' | 'disabled';
  elapsedMs: number;
}

export interface PipelineOptions {
  aiAllowed: boolean;
  defaultCurrency: string;
  signal?: AbortSignal;
}

/**
 * Reads a receipt / voucher image or PDF:
 *   1. Claude vision with structured output (when allowed and configured),
 *   2. on-device OCR + rule-based parsing (images only, dev/prod builds),
 *   3. otherwise an empty draft for manual entry.
 * The original file always travels with the draft and is saved with the item.
 */
export async function runExtraction(attachment: PendingAttachment, opts: PipelineOptions): Promise<PipelineResult> {
  const started = Date.now();
  let aiError: PipelineResult['aiError'];

  if (!opts.aiAllowed) aiError = 'disabled';
  else {
    const cfg = await resolveAiConfig();
    if (!cfg) aiError = 'not_configured';
    else {
      try {
        const input = await prepareForExtraction(attachment);
        const raw = await extractWithClaude(input, cfg, { signal: opts.signal });
        const result = normalizeExtraction(raw, { defaultCurrency: opts.defaultCurrency, source: 'receipt' });
        return { ...result, source: 'ai', elapsedMs: Date.now() - started };
      } catch (e) {
        if (e instanceof ExtractionError) {
          if (e.kind === 'aborted') throw e;
          aiError = e.kind;
        } else {
          aiError = 'server';
        }
        console.warn('[extraction] AI failed, falling back', e);
      }
    }
  }

  if (opts.signal?.aborted) throw new ExtractionError('aborted', 'Cancelled');

  if (attachment.mimeType.startsWith('image/')) {
    const text = await recognizeText(attachment.uri);
    if (text) {
      const result = normalizeExtraction(parseReceiptText(text), { defaultCurrency: opts.defaultCurrency, source: 'receipt' });
      return { ...result, source: 'ocr', aiError, elapsedMs: Date.now() - started };
    }
  }

  return {
    draft: emptyDraft({ currency: opts.defaultCurrency, source: 'receipt' }),
    lowConfidence: [],
    isCreditDocument: true,
    fieldsFound: 0,
    source: 'none',
    aiError,
    elapsedMs: Date.now() - started,
  };
}
