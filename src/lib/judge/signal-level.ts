import { RUBRIC_VERSION } from "./versions";

/**
 * Rubric for SIGNAL LEVEL — the composite strength score surfaced to users.
 *
 * `signalLevel` is intentionally distinct from `romanticInterest`. The four
 * sub-scores have different semantics:
 *
 *   - romanticInterest      — emotional-affection signal in the actions
 *   - desireToMeet          — concrete willingness to spend time together
 *   - initiative            — asymmetry: who keeps the conversation going
 *   - evidenceSufficiency   — quality and quantity of the observable record
 *
 * Only the first three feed the SIGNAL LEVEL composite; `evidenceSufficiency`
 * is a *meta* tier that gates how the composite is displayed (see
 * `evidenceSufficiencyTier`). Mixing evidenceSufficiency into the formula
 * would couple "the user's input effort" to "the SIGNAL strength", which is
 * not what the metric is meant to convey.
 *
 * The weights below are pinned for `RUBRIC_VERSION = "signal-rubric-v1"`.
 * Bumping the rubric requires:
 *   - editing this file,
 *   - bumping `RUBRIC_VERSION` in `versions.ts`,
 *   - updating SPEC §72 with the new rubric and rationale,
 *   - re-running the Golden Set against the new formula to record the new
 *     expected ranges.
 */
export const SIGNAL_LEVEL_WEIGHTS = Object.freeze({
  romanticInterest: 0.4,
  desireToMeet: 0.3,
  initiative: 0.3,
});

export function computeSignalLevel(scores: {
  romanticInterest: number;
  desireToMeet: number;
  initiative: number;
}): number {
  const value =
    SIGNAL_LEVEL_WEIGHTS.romanticInterest * scores.romanticInterest +
    SIGNAL_LEVEL_WEIGHTS.desireToMeet * scores.desireToMeet +
    SIGNAL_LEVEL_WEIGHTS.initiative * scores.initiative;
  return clampScore(value);
}

/**
 * `evidenceSufficiencyTier` maps the numeric `evidenceSufficiency` score
 * to a categorical tier. The tiers are display contracts and MUST NOT be
 * used inside `computeSignalLevel`.
 *
 *   HIGH   — score >= 60: enough observable fact to support a confident SIGNAL
 *   MEDIUM — 40 <= score < 60: change is real but conclusions are tentative
 *   LOW    — score < 40: insufficient record; do not surface a numeric SIGNAL
 */
export type EvidenceSufficiencyTier = "high" | "medium" | "low";

export function evidenceSufficiencyTier(evidenceSufficiency: number): EvidenceSufficiencyTier {
  if (evidenceSufficiency >= 60) return "high";
  if (evidenceSufficiency >= 40) return "medium";
  return "low";
}

export const EVIDENCE_TIER_THRESHOLDS = Object.freeze({
  highMin: 60,
  mediumMin: 40,
});

/** Re-export the rubric version so callers can stamp it on persisted rows. */
export { RUBRIC_VERSION };

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}