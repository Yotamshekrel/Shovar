import { type PageMeta, parsePageMeta } from './pageMeta';

const MAX_BYTES = 400_000;

/**
 * Best-effort fetch of a gift card page (title, Open Graph tags, text).
 * Many voucher pages render client-side or require login; any failure simply
 * returns null and the draft is prefilled from the URL and message instead.
 */
export async function fetchPageMeta(url: string, timeoutMs = 6000): Promise<PageMeta | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (type && !/html|xml|text/i.test(type)) return null;
    const html = (await res.text()).slice(0, MAX_BYTES);
    return parsePageMeta(html, res.url || url);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
