/**
 * Pure, deterministic scoring for typed recall and ordering drills (brief §13).
 * Memorization scores only — conversation quality is scored elsewhere and never mixed in.
 */
import type { MemorizationScore } from '../schemas/practice';

/** Lowercase, strip punctuation (keep letters, digits, apostrophes inside words), collapse whitespace. */
export function normalizeWords(text: string): string[] {
  const lowered = text.toLowerCase();
  // Replace anything that is not a letter, digit, apostrophe or whitespace with a space.
  const stripped = lowered.replace(/[^\p{L}\p{N}'\s]+/gu, ' ');
  // Drop apostrophes that are not between word characters (e.g. quotes).
  const cleaned = stripped.replace(/(^|\s)'+|'+(\s|$)/g, '$1 $2');
  return cleaned.split(/\s+/).filter((w) => w.length > 0);
}

/** Length of the longest common subsequence of two token arrays. */
export function lcsLength(a: readonly string[], b: readonly string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let prev = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const cur = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      cur[j] = a[i - 1] === b[j - 1] ? (prev[j - 1] ?? 0) + 1 : Math.max(prev[j] ?? 0, cur[j - 1] ?? 0);
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

export interface ExactRecallScore extends MemorizationScore {
  /** Target words the attempt did not contain (multiset difference, in target order). */
  missing_words: string[];
  /** Attempt words that are not in the target (multiset difference, in attempt order). */
  extra_words: string[];
}

function countTokens(tokens: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) m.set(t, (m.get(t) ?? 0) + 1);
  return m;
}

/**
 * Compare a typed attempt with the exact target line.
 * - exact_match_ratio: token multiset overlap / target token count.
 * - word_order_ratio: LCS length / target token count.
 * An empty target scores 1 only when the attempt is also empty.
 */
export function exactRecallScore(target: string, attempt: string): ExactRecallScore {
  const t = normalizeWords(target);
  const a = normalizeWords(attempt);
  if (t.length === 0) {
    return {
      exact_match_ratio: a.length === 0 ? 1 : 0,
      word_order_ratio: a.length === 0 ? 1 : 0,
      missing_words: [],
      extra_words: [...a],
    };
  }
  const tc = countTokens(t);
  const ac = countTokens(a);
  let overlap = 0;
  for (const [w, n] of tc) overlap += Math.min(n, ac.get(w) ?? 0);

  const missing: string[] = [];
  const remainingA = new Map(ac);
  for (const w of t) {
    const left = remainingA.get(w) ?? 0;
    if (left > 0) remainingA.set(w, left - 1);
    else missing.push(w);
  }
  const extra: string[] = [];
  const remainingT = new Map(tc);
  for (const w of a) {
    const left = remainingT.get(w) ?? 0;
    if (left > 0) remainingT.set(w, left - 1);
    else extra.push(w);
  }

  return {
    exact_match_ratio: clamp01(overlap / t.length),
    word_order_ratio: clamp01(lcsLength(t, a) / t.length),
    missing_words: missing,
    extra_words: extra,
  };
}

export interface OrderScore {
  /** Fraction of positions whose id matches exactly. */
  position_ratio: number;
  /** LCS of the given order against the expected order / expected length. */
  word_order_ratio: number;
  /** Expected ids missing from the given order. */
  missing_ids: string[];
}

/** Score an ordering attempt against the expected sequence. Deterministic, pure. */
export function orderScore(expectedIds: readonly string[], givenIds: readonly string[]): OrderScore {
  if (expectedIds.length === 0) {
    return { position_ratio: givenIds.length === 0 ? 1 : 0, word_order_ratio: givenIds.length === 0 ? 1 : 0, missing_ids: [] };
  }
  let positional = 0;
  for (let i = 0; i < expectedIds.length; i += 1) if (expectedIds[i] === givenIds[i]) positional += 1;
  const given = new Set(givenIds);
  return {
    position_ratio: clamp01(positional / expectedIds.length),
    word_order_ratio: clamp01(lcsLength(expectedIds, givenIds) / expectedIds.length),
    missing_ids: expectedIds.filter((id) => !given.has(id)),
  };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Small deterministic PRNG (mulberry32) so shuffles are reproducible from a numeric seed. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle driven by `seededRandom`. Returns a new array; input is untouched. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const rnd = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}
