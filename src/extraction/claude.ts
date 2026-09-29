import Anthropic from '@anthropic-ai/sdk';
import { fetch as expoFetch } from 'expo/fetch';

import { todayIso } from '@/domain/dates';

import type { AiConfig } from './aiConfig';
import { extractJsonObject } from './normalize';
import { EXTRACTION_SCHEMA, EXTRACTION_SYSTEM_PROMPT, type RawExtraction, extractionUserPrompt } from './schema';

export type ExtractionMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

export interface ExtractionInput {
  /** Base64 without a data: prefix. */
  data: string;
  mediaType: ExtractionMediaType;
}

export class ExtractionError extends Error {
  constructor(
    public readonly kind: 'auth' | 'rate_limit' | 'network' | 'refused' | 'invalid_response' | 'too_large' | 'server' | 'aborted',
    message: string,
  ) {
    super(message);
    this.name = 'ExtractionError';
  }
}

/** Server-side refusal fallback is available on these models (Claude API). */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);

/** `output_config.effort` is rejected by Haiku 4.5 / Sonnet 4.5 and older. */
export function modelSupportsEffort(model: string): boolean {
  return /^claude-(opus|sonnet|fable|mythos)-(5|4-[5-9])/.test(model) && !/^claude-sonnet-4-5/.test(model);
}

export function buildExtractionRequest(
  input: ExtractionInput,
  model: string,
  today = todayIso(),
): Anthropic.Beta.MessageCreateParamsNonStreaming {
  const fileBlock: Anthropic.Beta.BetaContentBlockParam =
    input.mediaType === 'application/pdf'
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: input.data } }
      : { type: 'image', source: { type: 'base64', media_type: input.mediaType, data: input.data } };

  const withFallback = FALLBACK_MODELS.has(model);
  return {
    model,
    // Output is a small JSON object; the cap only guards against runaway output.
    max_tokens: 16000,
    system: EXTRACTION_SYSTEM_PROMPT,
    output_config: {
      // Extraction is simple and latency-sensitive (the user is waiting on the review screen).
      ...(modelSupportsEffort(model) ? { effort: 'low' as const } : {}),
      format: { type: 'json_schema', schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown> },
    },
    // If a safety classifier declines, retry server-side on Anthropic's recommended fallback model.
    ...(withFallback ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    messages: [
      {
        role: 'user',
        content: [fileBlock, { type: 'text', text: extractionUserPrompt(today) }],
      },
    ],
  };
}

export function createClient(cfg: AiConfig, fetchImpl?: typeof fetch): Anthropic {
  return new Anthropic({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL || undefined,
    // The key is either the user's own (device keychain) or a proxy placeholder;
    // this flag only acknowledges the client runs outside a server.
    dangerouslyAllowBrowser: true,
    maxRetries: 1,
    timeout: 45_000,
    // expo/fetch is the WinterCG-compliant native fetch (proper AbortSignal, binary bodies).
    fetch: fetchImpl ?? (expoFetch as unknown as typeof fetch),
  });
}

/** Sends one image/PDF to Claude and returns the raw structured extraction. */
export async function extractWithClaude(
  input: ExtractionInput,
  cfg: AiConfig,
  opts: { signal?: AbortSignal; client?: Anthropic } = {},
): Promise<RawExtraction> {
  const client = opts.client ?? createClient(cfg);
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create(buildExtractionRequest(input, cfg.model), { signal: opts.signal });
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError) throw new ExtractionError('aborted', 'Cancelled');
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new ExtractionError('auth', 'The API key was rejected');
    if (e instanceof Anthropic.RateLimitError) throw new ExtractionError('rate_limit', 'The AI service is busy, try again shortly');
    if (e instanceof Anthropic.BadRequestError) {
      const tooLarge = /too large|exceeds|size/i.test(e.message);
      throw new ExtractionError(tooLarge ? 'too_large' : 'invalid_response', e.message);
    }
    if (e instanceof Anthropic.APIConnectionError) throw new ExtractionError('network', 'No connection to the AI service');
    if (e instanceof Anthropic.APIError) throw new ExtractionError('server', e.message);
    throw e;
  }

  if (response.stop_reason === 'refusal') throw new ExtractionError('refused', 'The document could not be processed');
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  const parsed = text ? extractJsonObject(text) : null;
  if (!parsed) throw new ExtractionError('invalid_response', `Unexpected response (${response.stop_reason ?? 'unknown'})`);
  return parsed;
}
