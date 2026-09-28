#!/usr/bin/env node
/**
 * Minimal Anthropic Messages proxy for Shvar's receipt extraction.
 *
 * The app sends normal Messages API requests (via the official SDK) to this
 * server instead of api.anthropic.com. The proxy injects the real API key from
 * its own environment, so the key never ships inside the app.
 *
 *   ANTHROPIC_API_KEY=sk-ant-...  PROXY_CLIENT_TOKEN=some-long-random-string  node server/extraction-proxy.mjs
 *
 * App side (.env.local):
 *   EXPO_PUBLIC_ANTHROPIC_BASE_URL=https://your-proxy.example.com
 *   EXPO_PUBLIC_ANTHROPIC_API_KEY=some-long-random-string   # sent as x-api-key, checked against PROXY_CLIENT_TOKEN
 *
 * Only POST /v1/messages is forwarded; the model is restricted to an allowlist
 * and request bodies are size-limited. Put it behind HTTPS and add per-user
 * auth / rate limiting before exposing it publicly.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.ANTHROPIC_API_KEY;
const CLIENT_TOKEN = process.env.PROXY_CLIENT_TOKEN || '';
const UPSTREAM = process.env.ANTHROPIC_UPSTREAM || 'https://api.anthropic.com';
const ALLOWED_MODELS = (process.env.ALLOWED_MODELS || 'claude-opus-5-5,claude-sonnet-5-5,claude-haiku-4-5').split(',').map((s) => s.trim());
const MAX_BODY = 25 * 1024 * 1024;

if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY is required');
  process.exit(1);
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

createServer(async (req, res) => {
  const [path, query] = (req.url || '').split('?');
  if (req.method !== 'POST' || path !== '/v1/messages') {
    return send(res, 404, { type: 'error', error: { type: 'not_found_error', message: 'Not found' } });
  }
  if (CLIENT_TOKEN && req.headers['x-api-key'] !== CLIENT_TOKEN) {
    return send(res, 401, { type: 'error', error: { type: 'authentication_error', message: 'Invalid client token' } });
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) return send(res, 413, { type: 'error', error: { type: 'request_too_large', message: 'Body too large' } });
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'Invalid JSON' } });
  }
  if (!ALLOWED_MODELS.includes(body.model)) {
    return send(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: `Model not allowed: ${body.model}` } });
  }

  const headers = {
    'content-type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': req.headers['anthropic-version'] || '2023-06-01',
  };
  if (req.headers['anthropic-beta']) headers['anthropic-beta'] = req.headers['anthropic-beta'];

  try {
    const upstream = await fetch(`${UPSTREAM}/v1/messages${query ? `?${query}` : ''}`, { method: 'POST', headers, body: raw });
    const text = await upstream.text();
    const out = { 'content-type': upstream.headers.get('content-type') || 'application/json' };
    for (const h of ['request-id', 'retry-after']) {
      const v = upstream.headers.get(h);
      if (v) out[h] = v;
    }
    res.writeHead(upstream.status, out);
    res.end(text);
  } catch (e) {
    send(res, 502, { type: 'error', error: { type: 'api_error', message: `Upstream error: ${e.message}` } });
  }
}).listen(PORT, () => console.log(`Shvar extraction proxy listening on :${PORT}`));
