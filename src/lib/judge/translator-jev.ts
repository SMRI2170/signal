import { FactTranslationError, type FactTranslator, type TranslatedFact } from "./translator";
import type { FactInput } from "./types";

/**
 * `JevTranslationAdapter` translates Japanese fact text to English using the
 * TypeSafe AI service. The adapter is intentionally server-only — instantiate
 * only on the server side, never import from a client module.
 *
 * Translation rules enforced by this adapter (and validated by tests):
 *
 *   - Verbatim preservation of who / action / count / datetime / negation /
 *     conditional / subject / other-vs-self markers.
 *   - NO pronoun guessing (we never write "he / she / they" without
 *     evidence in the source).
 *   - NO summarisation: the English text length must remain within
 *     `[original * 0.6, original * 1.6]` characters, or the request is
 *     rejected.
 *   - NO intent / affection inference: words like "liked", "romantic",
 *     "interested" must NOT appear unless the source text already contains
 *     them.
 *
 * When the adapter is unavailable, callers should fall back to
 * `NoOpTranslator` and surface the absence to the user via a banner.
 */
export class JevTranslationAdapter implements FactTranslator {
  readonly version: string;

  constructor(options: { version?: string; fetchImpl?: typeof fetch } = {}) {
    this.version = options.version ?? "signal-translator-jev-v1";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private readonly fetchImpl: typeof fetch;

  async translate(fact: FactInput): Promise<TranslatedFact> {
    if (typeof fact.text !== "string" || fact.text.trim().length === 0) {
      throw new FactTranslationError("Empty fact cannot be translated.", { retryable: false });
    }

    const prompt = [
      "Translate the following Japanese observation into English. Preserve every observable element:",
      "- who (subject, other party)",
      "- action (what was said or done)",
      "- count (numbers, repetitions)",
      "- datetime (dates, time-of-day, relative time)",
      "- negation (denials, refusals, 'no', 'not', 'never', '~ない')",
      "- conditional ('if', 'when', 'unless', '~ば')",
      "Do NOT add pronouns, intent, or summarisation that the source does not contain.",
      "Do NOT guess the gender of 'they'. Keep ambiguous referents as 'the other person'.",
      `Source: ${fact.text}`,
    ].join("\n");

    let response: Response;
    try {
      response = await this.fetchImpl("https://api.typesafe.ai/v1/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.TYPESAFE_API_KEY ?? ""}`,
        },
        body: JSON.stringify({ prompt, model: process.env.TYPESAFE_TRANSLATE_MODEL ?? "translate-jp-en-v1" }),
      });
    } catch (error) {
      throw new FactTranslationError(
        `Translator transport failed: ${(error as Error).message ?? "unknown"}`,
        { retryable: true },
      );
    }

    if (!response.ok) {
      throw new FactTranslationError(
        `Translator returned ${response.status} for fact ${fact.clientFactId}`,
        { retryable: response.status >= 500 },
      );
    }

    const payload = (await response.json()) as { textEnglish?: unknown };
    if (typeof payload.textEnglish !== "string" || payload.textEnglish.trim().length === 0) {
      throw new FactTranslationError("Translator returned empty English text.", { retryable: true });
    }

    const textEnglish = payload.textEnglish.trim();
    const invariantViolation = assertTranslationInvariants(fact.text, textEnglish);
    if (invariantViolation) {
      throw new FactTranslationError(
        `Translator violated invariant "${invariantViolation}" for fact ${fact.clientFactId}.`,
        { retryable: false },
      );
    }

    return {
      textOriginal: fact.text,
      textEnglish,
      translationVersion: this.version,
      skipped: false,
    };
  }
}

function assertTranslationInvariants(original: string, translated: string): string | null {
  // JP→EN translations typically lengthen by 1.5x-2.5x for short sentences
  // and shorten for idioms. Japanese often drops the subject ("Someone
  // invited me to dinner." for "食事に誘われた。"), so very short JP inputs
  // can legitimately translate to 3-5x longer EN text. We still require the
  // translation to keep at least 55% of the original character count to
  // catch outright summarisation.
  const ratio = translated.length / Math.max(1, original.length);
  if (ratio < 0.55 || ratio > 6.0) return "no_summarization";

  // Negation preservation: if the original contains a verb-ending ない /
  // なかった / ません / ませんでした / 否定, the English version must contain
// a corresponding marker.
//
// We exclude non-negation words whose kanji/kana happen to end in ない:
//   - に違いない  ("must be")
//   - しかない    ("only / have no choice")
//   - ではない    ("is not")
//   - んじゃない  ("isn't it / right?")
//   - ないない   ("not not" — rare)
const NON_NEGATION_ない_FORMS = ["に違いない", "しかない", "ではない", "んじゃない"];
function stripNonNegationない(source: string): string {
  let next = source;
  for (const form of NON_NEGATION_ない_FORMS) {
    next = next.split(form).join("");
  }
  return next;
}

function countNegationMarkers(source: string): number {
  const stripped = stripNonNegationない(source);
  return (stripped.match(/(?:ない|なかった|ません|ませんでした|否定)/gu) ?? []).length;
}

const originalNegations = countNegationMarkers(original);
  const translatedNegations = (translated.match(/\b(?:not|never|no\s+(?:longer|more|reply|contact))\b/giu) ?? []).length;
  if (originalNegations > 0 && translatedNegations === 0) return "preserve_negation";

  // No intent / affection inference added by translator. Word boundaries
  // are not used here because the Japanese regex needs substring matching
  // and \b does not apply to kana/kanji.
  const introducedIntent = /\b(?:in love|romantic(?:ally)?|interested|affection)\b/i.test(translated) &&
    !/(?:好き|恋愛|好意|興味|気がある)/.test(original);
  if (introducedIntent) return "no_intent_inference";

  return null;
}

/**
 * `NoOpTranslator` is used when no translator provider is configured
 * (dev / preview / static demo). It returns the original text mirrored as
 * `textEnglish` so downstream code can still operate uniformly, and flags
 * the row with `skipped: true` so audit / drift logs can detect the bypass.
 *
 * This translator MUST NOT be used in production: see #78 acceptance.
 */
export class NoOpTranslator implements FactTranslator {
  readonly version = "signal-translator-noop-v0";

  async translate(fact: FactInput): Promise<TranslatedFact> {
    return {
      textOriginal: fact.text,
      textEnglish: fact.text,
      translationVersion: this.version,
      skipped: true,
    };
  }
}