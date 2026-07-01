/**
 * Lightweight text embedder for merchant→category similarity.
 *
 * Default implementation is a character n-gram + token vectorizer with cosine
 * similarity — deterministic, dependency-free, and $0 (no model download, no
 * API), so it runs identically in tests, dev, and Vercel serverless. It catches
 * the *lexical* long tail rigid regex misses ("SWGGY*ORDER" ≈ "SWIGGY",
 * "ZOMATO LTD BLR" ≈ "ZOMATO").
 *
 * `Embedder` is an interface: swap NgramEmbedder for a neural embedder
 * (OpenAI text-embedding-3-small, or a local transformers.js MiniLM) without
 * touching the categorization cascade. pgvector storage is the scale-up path
 * once the anchor set outgrows in-memory kNN.
 */

export type SparseVec = Map<string, number>;

export interface Embedder {
  embed(text: string): SparseVec;
}

function clean(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Character n-gram (n=3) + whole-token vectorizer, L2-normalized. */
export class NgramEmbedder implements Embedder {
  constructor(private readonly n = 3, private readonly tokenWeight = 2) {}

  embed(text: string): SparseVec {
    const s = clean(text);
    const vec: SparseVec = new Map();
    if (!s) return vec;

    // Whole-token features (strong signal for brand names).
    for (const tok of s.split(" ")) {
      if (tok.length >= 2) add(vec, `t:${tok}`, this.tokenWeight);
    }

    // Character n-grams over the padded string (fuzzy / typo tolerance).
    const padded = ` ${s.replace(/ /g, "")} `;
    for (let i = 0; i + this.n <= padded.length; i++) {
      add(vec, padded.slice(i, i + this.n), 1);
    }

    return l2normalize(vec);
  }
}

function add(vec: SparseVec, key: string, w: number): void {
  vec.set(key, (vec.get(key) ?? 0) + w);
}

function l2normalize(vec: SparseVec): SparseVec {
  let sum = 0;
  for (const v of vec.values()) sum += v * v;
  const norm = Math.sqrt(sum);
  if (norm === 0) return vec;
  for (const [k, v] of vec) vec.set(k, v / norm);
  return vec;
}

/** Cosine similarity of two L2-normalized sparse vectors (= dot product). */
export function cosine(a: SparseVec, b: SparseVec): number {
  // Iterate the smaller map for speed.
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of small) {
    const w = large.get(k);
    if (w) dot += v * w;
  }
  return dot;
}
