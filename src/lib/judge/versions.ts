/**
 * Versioning metadata for SIGNAL's Judge layer.
 *
 * These identifiers MUST be bumped and recorded in SPEC.md whenever:
 *  - the scoring rubric text changes (`RUBRIC_VERSION`)
 *  - the model name, system prompt, or tool definitions change (`MODEL_VERSION`)
 *  - the JSON schema for `AnalysisResult` gains/removes/renames fields
 *    (`SCORE_SCHEMA_VERSION`)
 *
 * The drift harness and any consumer that stores snapshots reference these
 * constants so a bump is a one-line change. Never mutate in place.
 */
export const MODEL_VERSION = "signal-judge-model-v1";
export const RUBRIC_VERSION = "signal-rubric-v1";
/**
 * `SCORE_SCHEMA_VERSION` is bumped whenever the `AnalysisResult` JSON
 * schema gains, removes, or renames a field. The current version
 * (`signal-score-schema-v2`) introduces the explicit `signalLevel` field
 * so the composite score is no longer aliased to `romanticInterest`.
 *
 * Version history:
 *   - v1: romanticInterest / desireToMeet / initiative / evidenceSufficiency
 *   - v2: adds signalLevel composite + evidenceSufficiencyTier
 */
export const SCORE_SCHEMA_VERSION = "signal-score-schema-v2";