import { type ChildProcess, spawn } from 'node:child_process';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

/**
 * End-to-end test of server/extraction-proxy.mjs: it must enforce the client
 * token and model allowlist, swap in the real API key and forward the
 * anthropic-* headers to the upstream API.
 */
let upstream: Server;
let upstreamPort = 0;
let proxy: ChildProcess;
const proxyPort = 18000 + Math.floor(Math.random() * 1000);
let lastUpstream: { headers: Record<string, unknown>; url: string; body: string } | null = null;

function post(pathname: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: proxyPort, path: pathname, method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

beforeAll(async () => {
  upstream = createServer((req, res) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      lastUpstream = { headers: req.headers, url: req.url ?? '', body: data };
      res.writeHead(200, { 'content-type': 'application/json', 'request-id': 'req_upstream' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise<void>((r) => upstream.listen(0, '127.0.0.1', r));
  upstreamPort = (upstream.address() as AddressInfo).port;

  proxy = spawn(process.execPath, [path.join(__dirname, '../../server/extraction-proxy.mjs')], {
    env: {
      ...process.env,
      PORT: String(proxyPort),
      ANTHROPIC_API_KEY: 'real-server-key',
      PROXY_CLIENT_TOKEN: 'client-token',
      ANTHROPIC_UPSTREAM: `http://127.0.0.1:${upstreamPort}`,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('proxy did not start')), 8000);
    proxy.stdout?.on('data', (d: Buffer) => {
      if (d.toString().includes('listening')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
});

afterAll(async () => {
  proxy?.kill();
  await new Promise<void>((r) => upstream.close(() => r()));
});

describe('extraction proxy', () => {
  it('rejects requests without the client token', async () => {
    const res = await post('/v1/messages', { 'x-api-key': 'wrong' }, '{}');
    expect(res.status).toBe(401);
  });

  it('rejects models outside the allowlist', async () => {
    const res = await post('/v1/messages', { 'x-api-key': 'client-token' }, JSON.stringify({ model: 'some-other-model' }));
    expect(res.status).toBe(400);
    expect(res.body).toContain('Model not allowed');
  });

  it('only forwards POST /v1/messages', async () => {
    const res = await post('/v1/other', { 'x-api-key': 'client-token' }, '{}');
    expect(res.status).toBe(404);
  });

  it('forwards with the server key and anthropic headers', async () => {
    const body = JSON.stringify({ model: 'claude-opus-5-5', max_tokens: 10, messages: [] });
    const res = await post(
      '/v1/messages?beta=true',
      {
        'x-api-key': 'client-token',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'server-side-fallback-2026-07-01',
        'content-type': 'application/json',
      },
      body,
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ ok: true });
    expect(lastUpstream?.url).toBe('/v1/messages?beta=true');
    expect(lastUpstream?.headers['x-api-key']).toBe('real-server-key');
    expect(lastUpstream?.headers['anthropic-version']).toBe('2023-06-01');
    expect(lastUpstream?.headers['anthropic-beta']).toBe('server-side-fallback-2026-07-01');
    expect(lastUpstream?.body).toBe(body);
  });
});
