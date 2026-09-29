/**
 * Minimal HTML metadata reader for gift card links: title, Open Graph tags and
 * visible text (for amount detection). Pure functions — the network fetch lives
 * in `fetchPageMeta`.
 */
export interface PageMeta {
  title: string | null;
  siteName: string | null;
  description: string | null;
  /** Visible text, whitespace-collapsed and truncated. */
  text: string;
  finalUrl: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  shy: '',
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    const lower = code.toLowerCase();
    if (lower.startsWith('#x')) return String.fromCodePoint(Number.parseInt(lower.slice(2), 16));
    if (lower.startsWith('#')) return String.fromCodePoint(Number.parseInt(lower.slice(1), 10));
    return ENTITIES[lower] ?? m;
  });
}

function metaContent(html: string, key: string): string | null {
  // <meta property="og:title" content="..."> in either attribute order.
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html);
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${esc}["']`, 'i').exec(html);
  const v = (a?.[1] ?? b?.[1])?.trim();
  return v ? decodeEntities(v) : null;
}

export function parsePageMeta(html: string, finalUrl: string | null = null, maxText = 4000): PageMeta {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = metaContent(html, 'og:title') ?? (titleMatch ? decodeEntities(titleMatch[1].replace(/\s+/g, ' ').trim()) || null : null);
  const body = html
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const text = decodeEntities(body)
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .slice(0, maxText);
  return {
    title,
    siteName: metaContent(html, 'og:site_name') ?? metaContent(html, 'application-name'),
    description: metaContent(html, 'og:description') ?? metaContent(html, 'description'),
    text,
    finalUrl,
  };
}

/** Picks the most store-like part of a page title ("Gift Card | Golda – Buy online" → "Golda"). */
export function storeFromTitle(title: string | null, siteName: string | null): string | null {
  const generic =
    /^(gift\s*cards?|כרטיס(?:י)?\s*מתנה|שובר(?:ים)?|home|דף\s*הבית|buy\s*online|shop|store|חנות|online|voucher|login|התחברות)$/i;
  const candidates = [siteName, ...(title ? title.split(/\s*[|–—:•·]\s*|\s+-\s+/) : [])]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s && s.length >= 2 && s.length <= 40 && !generic.test(s) && !/^https?:/i.test(s));
  return candidates[0] ?? null;
}
