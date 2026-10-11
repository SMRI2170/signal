import { FactTranslationError, type FactTranslator, type TranslatedFact } from "./translator";
import type { FactInput } from "./types";

/**
 * `translateFactInputs` runs every fact through the supplied translator in a
 * single batched pass. Returns parallel arrays of original JP inputs and the
 * resulting `TranslatedFact` so callers can decide which fields to forward
 * to the Judge and which to store.
 *
 * Failures are surfaced as a single `FactTranslationError` so the route
 * handler can convert it to a 502 with a retryable flag. The fact that
 * triggered the failure is included in the error message.
 */
export async function translateFactInputs(
  translator: FactTranslator,
  facts: ReadonlyArray<FactInput>,
): Promise<{ inputs: FactInput[]; translations: TranslatedFact[] }> {
  const translations = await Promise.all(
    facts.map(async (fact) => {
      try {
        return await translator.translate(fact);
      } catch (error) {
        if (error instanceof FactTranslationError) throw error;
        throw new FactTranslationError(
          `Translator failed for fact ${fact.clientFactId}: ${(error as Error).message ?? "unknown"}`,
          { retryable: true },
        );
      }
    }),
  );

  const inputs = facts.map((fact, index) => {
    const t = translations[index];
    // Translation failures short-circuit above; `t` is always defined here.
    return {
      clientFactId: fact.clientFactId,
      text: t.skipped ? fact.text : t.textEnglish,
    };
  });

  return { inputs, translations };
}