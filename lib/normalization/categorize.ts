/**
 * Categorization cascade.
 *
 *   Layer 1: rule-based tagCategory (regex) — precise on the head (ZOMATO→food)
 *   Layer 2: similarity classifier — generalizes the long tail rules miss
 *   Layer 3: OTHER
 *
 * The rules stay authoritative: layer 2 only runs when the rules return OTHER,
 * so we never override a confident rule match. This is the accuracy win behind
 * the "99% Uncategorised on real data" problem — novel merchants that no regex
 * lists now resolve via nearest-neighbor to a labeled anchor.
 */

import type { CategoryName } from "@prisma/client";
import { tagCategory } from "./categoryTagger";
import { classifyBySimilarity } from "./semanticCategorizer";

export interface CategorizeResult {
  category: CategoryName;
  source: "rule" | "similarity" | "fallback";
  score?: number;
}

export function categorize(normalizedName: string, rawDescription?: string): CategorizeResult {
  const ruled = tagCategory(normalizedName, rawDescription);
  if (ruled !== "OTHER") {
    return { category: ruled, source: "rule" };
  }

  const sim = classifyBySimilarity(normalizedName);
  if (sim) {
    return { category: sim.category, source: "similarity", score: sim.score };
  }

  return { category: "OTHER", source: "fallback" };
}
