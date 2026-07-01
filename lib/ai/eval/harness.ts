/**
 * Eval runner: scores a provider's answers against the golden set.
 * Provider-agnostic — works with the Demo provider (CI) or a live LLM.
 */

import type { AIProviderInterface, AIMessage } from "../types";
import { EVAL_CASES, renderTestContext, type EvalCase } from "./evalCases";

export interface CaseResult {
  name: string;
  passed: boolean;
  answer: string;
  missing: string[];      // mustInclude patterns that did not match
  violated: string[];     // mustNotInclude patterns that matched
}

export interface EvalReport {
  total: number;
  passed: number;
  passRate: number;       // 0–1
  results: CaseResult[];
}

export async function scoreCase(
  provider: AIProviderInterface,
  c: EvalCase,
): Promise<CaseResult> {
  const messages: AIMessage[] = [
    { role: "system", content: renderTestContext(c.metrics) },
    { role: "user", content: c.question },
  ];

  const { text } = await provider.complete(messages);

  const missing = c.mustInclude.filter((re) => !re.test(text)).map(String);
  const violated = (c.mustNotInclude ?? []).filter((re) => re.test(text)).map(String);

  return {
    name: c.name,
    passed: missing.length === 0 && violated.length === 0,
    answer: text,
    missing,
    violated,
  };
}

export async function runEval(
  provider: AIProviderInterface,
  cases: EvalCase[] = EVAL_CASES,
): Promise<EvalReport> {
  const results = await Promise.all(cases.map((c) => scoreCase(provider, c)));
  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    passRate: results.length ? passed / results.length : 0,
    results,
  };
}
