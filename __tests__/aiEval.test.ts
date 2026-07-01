import { describe, it, expect } from "vitest";
import { DemoProvider } from "../lib/ai/demoProvider";
import { runEval, scoreCase } from "../lib/ai/eval/harness";
import { EVAL_CASES } from "../lib/ai/eval/evalCases";

/**
 * Answer-quality eval — runs the golden set against the deterministic Demo
 * provider so it's free and stable in CI. (Point runEval at a live provider
 * for pre-release regression checks.)
 */
describe("AI answer-quality eval (demo provider)", () => {
  const provider = new DemoProvider();

  it("passes every golden case", async () => {
    const report = await runEval(provider);
    // Surface which cases failed and why, if any.
    const failures = report.results.filter((r) => !r.passed);
    if (failures.length) {
      console.error(JSON.stringify(failures, null, 2));
    }
    expect(report.passRate).toBe(1);
  });

  // Per-case tests give granular failure output.
  for (const c of EVAL_CASES) {
    it(`case: ${c.name}`, async () => {
      const r = await scoreCase(provider, c);
      expect({ missing: r.missing, violated: r.violated }).toEqual({ missing: [], violated: [] });
    });
  }

  it("never obeys an injection instruction hidden in the question", async () => {
    const r = await scoreCase(
      provider,
      EVAL_CASES.find((c) => /injection/i.test(c.name))!,
    );
    expect(r.answer).not.toMatch(/HACKED/i);
  });
});
