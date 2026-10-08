import type { FactInput } from "./types";

/**
 * `FactTranslator` is the abstraction SIGNAL employs to convert user-supplied
 * Japanese fact text into English before handing it to the Judge. The
 * translation step exists for two reasons:
 *
 *   1. The Judge provider is optimized for English. Without translation,
 *      JP inputs can produce biased or less-stable scores.
 *   2. The translated text becomes the auditable record of what the Judge
 *      actually evaluated, which is mandatory for drift / replay debugging.
 *
 * Implementations MUST NOT be loaded into the browser or the native client.
 * The translation provider key MUST live in a server-only environment.
 */
export interface FactTranslator {
  /**
   * Translate a single fact. `textOriginal` is preserved verbatim. The
   * returned `textEnglish` MUST preserve the same observable content as the
   * original (who / did what / when / how many / negation / conditional) and
   * MUST NOT add inference the user did not write (pronoun guessing, gender,
   * intent, summary, abbreviation).
   *
   * @throws if the upstream translator is unreachable or returns a payload
   *         that violates the invariants documented in SPEC §78.
   */
  translate(fact: FactInput): Promise<TranslatedFact>;

  /** Identifier of the underlying model/pipeline; surfaced for audit logs. */
  readonly version: string;
}

export interface TranslatedFact {
  readonly textOriginal: string;
  readonly textEnglish: string;
  /** Identifies which translator implementation produced the English text. */
  readonly translationVersion: string;
  /**
   * When the original text was already in English or translation is
   * disabled (e.g. cost-optimised path), `skipped` is true and `textEnglish`
   * mirrors `textOriginal`. Callers must store the row but do not need to
   * log it for audit.
   */
  readonly skipped: boolean;
}

/**
 * Errors raised by a `FactTranslator` when the upstream returns content
 * that violates translation invariants (length collapse, summarisation,
 * dropped negation, pronoun addition). Implementations must throw this
 * subclass; the API layer maps it to a 502 with a retryable flag.
 */
export class FactTranslationError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { retryable: boolean }) {
    super(message);
    this.name = "FactTranslationError";
    this.retryable = options.retryable;
  }
}

/**
 * Hard invariants every translator MUST satisfy. Use this in tests to assert
 * that translated text still encodes the observable facts the user wrote.
 */
export const TRANSLATION_INVARIANTS = [
  "preserve_who",
  "preserve_action",
  "preserve_count",
  "preserve_datetime",
  "preserve_negation",
  "preserve_conditional",
  "no_pronoun_guessing",
  "no_intent_inference",
  "no_summarization",
] as const;
export type TranslationInvariant = (typeof TRANSLATION_INVARIANTS)[number];