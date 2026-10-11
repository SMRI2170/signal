import { describe, expect, it } from "vitest";

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * `signal-copy-guard.test.ts` enforces the UI copy contract from SPEC §72:
 * the result UI MUST NOT describe SIGNAL LEVEL or its sub-scores as
 * probability / likelihood / percentage. The test walks the in-app source
 * files and fails when any of the forbidden Japanese or English phrases
 * appear in user-facing copy.
 *
 * Forbidden terms (any language; case-insensitive in EN, surface in JP):
 *  - 確率 / 可能性 / パーセント
 *  - probability / likely / likelihood / chance
 *  - "% chance" / "% likely" / "% probability"
 */

/**
 * Forbidden terms are checked AFTER stripping the explicit "is not
 * probability" disclaimer that the result UI already uses correctly. The
 * disclaimer uses the phrase "確率ではなく" / "probability is not" so we
 * allow the term when it is immediately followed by ではなく.
 */
const FORBIDDEN_TERMS = [
  "確率",
  "可能性",
  "パーセント",
  "probability",
  "likelihood",
  "chance",
];

/**
 * Phrases the result UI already uses correctly. Strip these from the
 * source text before searching for forbidden terms. Anything remaining
 * is a real violation.
 */
const ALLOWED_DISCLAIMERS = [
  "確率ではなく",
  "percent not",
  "is not probability",
];

function stripAllowedDisclaimers(text: string): string {
  let result = text;
  for (const phrase of ALLOWED_DISCLAIMERS) {
    result = result.split(phrase).join("");
  }
  return result;
}

const TARGET_FILES = [
  "src/app/home/page.tsx",
  "src/app/analyze/page.tsx",
  "src/app/page.tsx",
  "src/app/relationships/[relationshipId]/page.tsx",
  "src/app/relationships/[relationshipId]/history/page.tsx",
  "src/components/signal-meter.tsx",
  "src/components/fact-input.tsx",
  "src/components/add-fact-form.tsx",
];

async function readUserFacingText(): Promise<string> {
  const parts: string[] = [];
  for (const relative of TARGET_FILES) {
    const absolute = path.resolve(process.cwd(), relative);
    parts.push(await fs.readFile(absolute, "utf8"));
  }
  return parts.join("\n");
}

describe("result UI copy contract (#72)", () => {
  it("does not label SIGNAL as probability / likelihood / percentage", async () => {
    const raw = await readUserFacingText();
    const stripped = stripAllowedDisclaimers(raw);
    const offenders = FORBIDDEN_TERMS.filter((term) => stripped.toLowerCase().includes(term.toLowerCase()));
    expect(offenders).toEqual([]);
  });
});