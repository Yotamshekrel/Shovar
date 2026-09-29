import { createServer, request, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { ExtractionError, buildExtractionRequest, createClient, extractWithClaude, modelSupportsEffort } from '@/extraction/claude';
import { normalizeExtraction } from '@/extraction/normalize';

jest.mock('@/security/keyStore', () => ({ getSecret: jest.fn(async () => null) }));

interface Captured {
  url: string;
  headers: IncomingMessage['headers'];
  body: Record<string, unknown>;
}

let server: Server;
let baseURL: string;
let captured: Captured | null = null;
let reply: { status: number; body: unknown } = { status: 200, body: {} };

beforeAll(async () => {
  server = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      captured = { url: req.url ?? '', headers: req.headers, body: data ? JSON.parse(data) : {} };
      res.writeHead(reply.status, { 'content-type': 'application/json', 'request-id': 'req_test' });
      res.end(JSON.stringify(reply.body));
    });
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

function message(text: string, stop_reason = 'end_turn') {
  return {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: 'claude-opus-5-5',
    content: [{ type: 'text', text }],
    stop_reason,
    stop_sequence: null,
    usage: { input_tokens: 1200, output_tokens: 180 },
  };
}

const raw = {
  is_credit_document: true,
  item_type: 'gift_card',
  store_name: 'BuyMe',
  amount: 300,
  currency: 'ILS',
  issue_date: '2026-09-01',
  expiry_date: '2031-09-01',
  code: 'BM-7F3K-22QX',
  pin: null,
  link: 'https://buyme.co.il/gift/ABC',
  notes: null,
  confidence: { item_type: 0.9, store_name: 0.95, amount: 0.9, currency: 0.95, issue_date: 0.8, expiry_date: 0.5, code: 0.9 },
};

const cfg = () => ({ mode: 'proxy' as const, apiKey: 'test-key', baseURL, model: 'claude-opus-5-5' });

/**
 * The jest-expo environment replaces global fetch with React Native's polyfill,
 * so give the SDK a tiny Node http-based fetch for these wire-level tests.
 */
const nodeFetch = ((input: string | URL | Request, init?: RequestInit) =>
  new Promise<Response>((resolve, reject) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => (headers[k] = v));
    const req = request(url, { method: init?.method ?? 'GET', headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const h = new Headers();
        for (const [k, v] of Object.entries(res.headers)) if (typeof v === 'string') h.set(k, v);
        resolve(new Response(Buffer.concat(chunks).toString('utf8'), { status: res.statusCode ?? 500, headers: h }));
      });
    });
    req.on('error', reject);
    if (init?.body) req.write(init.body as string);
    req.end();
  })) as typeof fetch;

const run = (input: Parameters<typeof extractWithClaude>[0]) => extractWithClaude(input, cfg(), { client: createClient(cfg(), nodeFetch) });

describe('Claude extraction client (Anthropic SDK against a local mock API)', () => {
  it('sends an image with structured output, low effort and server-side fallback', async () => {
    reply = { status: 200, body: message(JSON.stringify(raw)) };
    const out = await run({ data: 'aGVsbG8=', mediaType: 'image/jpeg' });

    expect(captured?.url).toMatch(/^\/v1\/messages/);
    expect(captured?.headers['x-api-key']).toBe('test-key');
    expect(captured?.headers['anthropic-version']).toBe('2023-06-01');
    expect(String(captured?.headers['anthropic-beta'])).toContain('server-side-fallback-2026-07-01');

    const body = captured!.body as Record<string, any>;
    expect(body.model).toBe('claude-opus-5-5');
    expect(body.fallbacks).toBe('default');
    expect(body.betas).toBeUndefined(); // sent as a header, not in the body
    expect(body.output_config.effort).toBe('low');
    expect(body.output_config.format.type).toBe('json_schema');
    expect(body.output_config.format.schema.additionalProperties).toBe(false);
    expect(body.thinking).toBeUndefined();
    expect(body.messages[0].content[0]).toEqual({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'aGVsbG8=' } });
    expect(body.messages[0].content[1].type).toBe('text');

    const normalized = normalizeExtraction(out);
    expect(normalized.draft).toMatchObject({ type: 'gift_card', storeName: 'BuyMe', amountMinor: 30000, code: 'BM-7F3K-22QX' });
    expect(normalized.lowConfidence).toEqual(['expiryDate']);
  });

  it('sends PDFs as document blocks', async () => {
    reply = { status: 200, body: message(JSON.stringify(raw)) };
    await run({ data: 'JVBERi0=', mediaType: 'application/pdf' });
    const block = (captured!.body as Record<string, any>).messages[0].content[0];
    expect(block).toEqual({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' } });
  });

  it('maps refusals and API errors to typed extraction errors', async () => {
    reply = { status: 200, body: message('', 'refusal') };
    await expect(run({ data: 'x', mediaType: 'image/png' })).rejects.toMatchObject({ kind: 'refused' });

    reply = { status: 401, body: { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } } };
    await expect(run({ data: 'x', mediaType: 'image/png' })).rejects.toMatchObject({ kind: 'auth' });

    reply = { status: 200, body: message('I cannot read this') };
    const err = await run({ data: 'x', mediaType: 'image/png' }).catch((e) => e);
    expect(err).toBeInstanceOf(ExtractionError);
    expect(err.kind).toBe('invalid_response');
  });

  it('omits fallbacks/effort for models that do not support them', () => {
    const req = buildExtractionRequest({ data: 'x', mediaType: 'image/jpeg' }, 'claude-haiku-4-5', '2026-09-28') as unknown as Record<
      string,
      any
    >;
    expect(req.fallbacks).toBeUndefined();
    expect(req.betas).toBeUndefined();
    expect(req.output_config.effort).toBeUndefined();
    expect(req.output_config.format.type).toBe('json_schema');
    expect(modelSupportsEffort('claude-opus-5-5')).toBe(true);
    expect(modelSupportsEffort('claude-sonnet-4-5')).toBe(false);
  });
});
