/**
 * Layer 2 of the categorization cascade: nearest-neighbor merchant classifier.
 *
 * Embeds each labeled anchor once (lazily, cached), then classifies an unknown
 * merchant by cosine kNN against the anchors. Returns null below a confidence
 * threshold so the caller can fall back to OTHER rather than guess.
 */

import type { CategoryName } from "@prisma/client";
import { NgramEmbedder, cosine, type Embedder, type SparseVec } from "./embedding";
import { CATEGORY_ANCHORS } from "./categoryAnchors";

export interface SimilarityMatch {
  category: CategoryName;
  score: number;         // cosine similarity of the winning anchor (0–1)
}

// Minimum similarity to accept a match. Tuned so clear brand variants pass
// while unrelated strings fall through to OTHER.
const THRESHOLD = 0.34;
// How many nearest anchors vote.
const K = 3;

let embedder: Embedder = new NgramEmbedder();
let anchorVecs: Array<{ category: CategoryName; vec: SparseVec }> | null = null;

function ensureAnchors(): Array<{ category: CategoryName; vec: SparseVec }> {
  if (!anchorVecs) {
    anchorVecs = CATEGORY_ANCHORS.map((a) => ({
      category: a.category,
      vec: embedder.embed(a.name),
    }));
  }
  return anchorVecs;
}

/** Swap the embedder (e.g. a neural one) — resets the anchor cache. */
export function setEmbedder(e: Embedder): void {
  embedder = e;
  anchorVecs = null;
}

/**
 * Classify a merchant string by similarity to labeled anchors.
 * @returns best category + score, or null if nothing clears the threshold.
 */
export function classifyBySimilarity(merchant: string): SimilarityMatch | null {
  if (!merchant || merchant.trim().length < 2) return null;

  const qv = embedder.embed(merchant);
  if (qv.size === 0) return null;

  const anchors = ensureAnchors();
  const scored = anchors
    .map((a) => ({ category: a.category, score: cosine(qv, a.vec) }))
    .sort((x, y) => y.score - x.score);

  const top = scored[0];
  if (!top || top.score < THRESHOLD) return null;

  // kNN vote among the top-K, weighted by similarity; ties broken by best score.
  const votes = new Map<CategoryName, number>();
  for (const s of scored.slice(0, K)) {
    if (s.score < THRESHOLD) break;
    votes.set(s.category, (votes.get(s.category) ?? 0) + s.score);
  }

  let best: CategoryName = top.category;
  let bestWeight = -1;
  for (const [cat, w] of votes) {
    if (w > bestWeight) { bestWeight = w; best = cat; }
  }

  return { category: best, score: Math.round(top.score * 100) / 100 };
}
