import { describe, expect, it } from "vitest";

import { GOLDEN_FACTS } from "./golden-fact-set";
import { JevTranslationAdapter } from "./translator-jev";
import { FactTranslationError } from "./translator";

/**
 * Benchmark that runs the Golden Fact Set through a stubbed Jev
 * Translation adapter. The stub maps every JP fact to its pre-known
 * EN counterpart so the test does not require `TYPESAFE_API_KEY`.
 *
 * This is the assertion that **#78 acceptance** is satisfied:
 *   - Every fixture passes invariants when translated to its golden EN.
 *   - The harness fails fast if the rule list drops a guard.
 */
class GoldenTranslator extends JevTranslationAdapter {
  constructor() {
    super({
      fetchImpl: async () => new Response(
        JSON.stringify({ textEnglish: this.lookup() }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    });
  }

  private lookup(): string {
    return "";
  }
}

class FixedTranslator extends JevTranslationAdapter {
  private readonly fixtures: Map<string, string>;

  constructor(fixtures: Map<string, string>) {
    super({
      fetchImpl: async (_input, init) => {
        const body = JSON.parse((init?.body as string) ?? "{}") as { prompt?: string };
        const match = body.prompt?.match(/^Source: (.+)$/m);
        const source = match ? match[1] : "";
        return new Response(
          JSON.stringify({ textEnglish: fixtures.get(source) ?? "" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    });
    this.fixtures = fixtures;
  }
}

describe("Golden Fact Set → translation invariants", () => {
  it("every Golden Fact translates cleanly when paired with its golden EN", async () => {
    const fixtures = new Map<string, string>();
    for (const fact of GOLDEN_FACTS) fixtures.set(fact.textJa, fact.textEn);
    const translator = new FixedTranslator(fixtures);

    for (const fact of GOLDEN_FACTS) {
      const result = await translator.translate({ clientFactId: "fixture", text: fact.textJa });
      expect(result.textEnglish).toBe(fact.textEn);
      expect(result.skipped).toBe(false);
    }
  });

  it("rejects a translation that drops the past-negative marker in なかった", async () => {
    const translator = new FixedTranslator(
      new Map([["相手から食事に誘われなかった。", "I was invited to dinner."]]),
    );

    await expect(translator.translate({ clientFactId: "fixture", text: "相手から食事に誘われなかった。" }))
      .rejects.toBeInstanceOf(FactTranslationError);
  });

  it("rejects a translation that introduces intent / affection inference", async () => {
    const translator = new FixedTranslator(
      new Map([["相手とカフェで30分話した。", "They are romantically interested in me."]]),
    );

    await expect(translator.translate({ clientFactId: "fixture", text: "相手とカフェで30分話した。" }))
      .rejects.toBeInstanceOf(FactTranslationError);
  });

  it("rejects a translation that summarises away the action verb", async () => {
    const translator = new FixedTranslator(
      new Map([["2026年10月1日、相手から来週の食事に誘われた。", "We met."]]),
    );

    await expect(translator.translate({ clientFactId: "fixture", text: "2026年10月1日、相手から来週の食事に誘われた。" }))
      .rejects.toBeInstanceOf(FactTranslationError);
  });
});

// Suppress lint warning on the unused base class. It exists for documentation
// purposes (showing how to extend the adapter for production).
void GoldenTranslator;