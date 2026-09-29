/**
 * Small URL helpers. React Native's built-in URL implementation is incomplete
 * on some versions, so parsing is done with a regex that covers http(s) links.
 */
export interface ParsedUrl {
  href: string;
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
}

const URL_RE = /^(https?):\/\/([^/?#:@\s]+(?:\.[^/?#:@\s]+)*)(?::(\d{1,5}))?([^?#\s]*)(\?[^#\s]*)?(#\S*)?$/i;

export function parseUrl(input: string | null | undefined): ParsedUrl | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) {
    // Bare domains like "buyme.co.il/abc"
    if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(s)) s = `https://${s}`;
    else return null;
  }
  const m = URL_RE.exec(s);
  if (!m) return null;
  const hostname = m[2].toLowerCase();
  if (!hostname.includes('.') && hostname !== 'localhost') return null;
  const protocol = `${m[1].toLowerCase()}:` as 'http:' | 'https:';
  const port = m[3] ?? '';
  const pathname = m[4] || '/';
  const search = m[5] ?? '';
  const hash = m[6] ?? '';
  return {
    href: `${protocol}//${hostname}${port ? `:${port}` : ''}${pathname}${search}${hash}`,
    protocol,
    hostname,
    port,
    pathname,
    search,
    hash,
  };
}

export function isValidHttpUrl(input: string | null | undefined): boolean {
  return parseUrl(input) !== null;
}

/** Extracts every http(s) URL from free text (e.g. a shared WhatsApp message). */
export function extractUrls(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"'״”)\]]+/gi) ?? [];
  const out: string[] = [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?]+$/, '');
    const parsed = parseUrl(cleaned);
    if (parsed && !out.includes(parsed.href)) out.push(parsed.href);
  }
  return out;
}

export function getQueryParam(url: ParsedUrl, name: string): string | null {
  const q = url.search.replace(/^\?/, '');
  for (const pair of q.split('&')) {
    const [k, v = ''] = pair.split('=');
    if (decodeURIComponentSafe(k) === name) return decodeURIComponentSafe(v.replace(/\+/g, ' '));
  }
  return null;
}

export function decodeURIComponentSafe(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
