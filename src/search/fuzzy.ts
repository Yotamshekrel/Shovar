import { compact, normalizeText } from './normalize';
import { skeleton, wordSkeletons } from './phonetic';

/**
 * Optimal string alignment distance (Damerau–Levenshtein with adjacent
 * transpositions). Stops early once the distance exceeds `max`.
 */
export function editDistance(a: string, b: string, max = Number.POSITIVE_INFINITY): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > max) return max + 1;
  if (la === 0) return lb;
  if (lb === 0) return la;
  let prevPrev = new Array<number>(lb + 1).fill(0);
  let prev = Array.from({ length: lb + 1 }, (_, j) => j);
  let cur = new Array<number>(lb + 1).fill(0);
  for (let i = 1; i <= la; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prevPrev[j - 2] + 1);
      cur[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    [prevPrev, prev, cur] = [prev, cur, prevPrev];
  }
  return prev[lb];
}

/** Typos tolerated for a query of this length. */
export function allowedTypos(len: number): number {
  if (len <= 3) return 0;
  if (len <= 5) return 1;
  if (len <= 8) return 2;
  return 3;
}

export interface PreparedName {
  raw: string;
  normalized: string;
  compact: string;
  tokens: string[];
  skeleton: string;
  wordSkeletons: string[];
  /** Lower weight for secondary text such as notes. */
  weight: number;
}

export function prepareName(raw: string, weight = 1): PreparedName {
  const normalized = normalizeText(raw);
  return {
    raw,
    normalized,
    compact: normalized.replace(/\s+/g, ''),
    tokens: normalized ? normalized.split(' ') : [],
    skeleton: skeleton(raw),
    wordSkeletons: wordSkeletons(raw),
    weight,
  };
}

export interface PreparedQuery {
  raw: string;
  normalized: string;
  compact: string;
  tokens: string[];
  skeleton: string;
}

export function prepareQuery(raw: string): PreparedQuery {
  const normalized = normalizeText(raw);
  return {
    raw,
    normalized,
    compact: compact(raw),
    tokens: normalized ? normalized.split(' ') : [],
    skeleton: skeleton(raw),
  };
}

/**
 * Scores how well `q` matches a single candidate name, in [0, 1].
 * Layers, strongest first: exact → prefix → token prefix → substring →
 * typo-tolerant (same script) → phonetic skeleton (cross-script Hebrew/English).
 */
export function scoreName(q: PreparedQuery, c: PreparedName): number {
  if (!q.compact || !c.compact) return 0;
  let best = 0;
  const qc = q.compact;
  const cc = c.compact;

  if (cc === qc) best = 1;
  else if (cc.startsWith(qc)) best = Math.max(best, 0.93 - Math.min(0.08, (cc.length - qc.length) * 0.005));
  else if (q.tokens.length > 0 && q.tokens.every((qt) => c.tokens.some((ct) => ct.startsWith(qt)))) best = Math.max(best, 0.88);
  else if (qc.length >= 2 && cc.includes(qc)) best = Math.max(best, 0.78);

  if (best < 0.75 && qc.length >= 3) {
    const typos = allowedTypos(qc.length);
    if (typos > 0) {
      // Compare against the whole name and against a same-length prefix (partial typing).
      const candidates = [cc, cc.slice(0, qc.length), cc.slice(0, qc.length + 1), ...c.tokens];
      let minD = Number.POSITIVE_INFINITY;
      for (const cand of candidates) {
        const d = editDistance(qc, cand, typos);
        if (d < minD) minD = d;
      }
      if (minD <= typos) best = Math.max(best, 0.72 - minD * 0.07);
    }
  }

  const qs = q.skeleton;
  if (best < 0.8 && qs.length >= 2) {
    const skels = [c.skeleton, ...c.wordSkeletons];
    for (const cs of skels) {
      if (!cs) continue;
      if (cs === qs) best = Math.max(best, qs.length >= 3 ? 0.82 : 0.7);
      else if (cs.startsWith(qs)) best = Math.max(best, qs.length >= 3 ? 0.76 : 0.62);
      else if (qs.length >= 4) {
        const tol = qs.length >= 7 ? 2 : 1;
        const d = Math.min(editDistance(qs, cs, tol), editDistance(qs, cs.slice(0, qs.length), tol));
        if (d <= tol) best = Math.max(best, 0.64 - (d - 1) * 0.06);
      }
    }
  }

  return best * c.weight;
}

export function bestScore(q: PreparedQuery, names: PreparedName[]): { score: number; name: PreparedName | null } {
  let score = 0;
  let name: PreparedName | null = null;
  for (const n of names) {
    const s = scoreName(q, n);
    if (s > score) {
      score = s;
      name = n;
    }
  }
  return { score, name };
}

export const MATCH_THRESHOLD = 0.5;
