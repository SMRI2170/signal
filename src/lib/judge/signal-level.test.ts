import { describe, expect, it } from "vitest";

import {
  computeSignalLevel,
  EVIDENCE_TIER_THRESHOLDS,
  evidenceSufficiencyTier,
  SIGNAL_LEVEL_WEIGHTS,
} from "./signal-level";

describe("computeSignalLevel", () => {
  it("uses the documented 40/30/30 weighting", () => {
    expect(SIGNAL_LEVEL_WEIGHTS.romanticInterest).toBe(0.4);
    expect(SIGNAL_LEVEL_WEIGHTS.desireToMeet).toBe(0.3);
    expect(SIGNAL_LEVEL_WEIGHTS.initiative).toBe(0.3);
  });

  it("returns a weighted integer in [0, 100]", () => {
    const value = computeSignalLevel({ romanticInterest: 80, desireToMeet: 60, initiative: 40 });
    const expected = Math.round(0.4 * 80 + 0.3 * 60 + 0.3 * 40);
    expect(value).toBe(expected);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  });

  it("clamps values below 0 and above 100", () => {
    expect(computeSignalLevel({ romanticInterest: -50, desireToMeet: -10, initiative: -10 })).toBe(0);
    expect(computeSignalLevel({ romanticInterest: 200, desireToMeet: 200, initiative: 200 })).toBe(100);
  });

  it("returns 0 for non-finite inputs instead of throwing", () => {
    expect(computeSignalLevel({ romanticInterest: Number.NaN, desireToMeet: 50, initiative: 50 })).toBe(0);
    expect(computeSignalLevel({ romanticInterest: 50, desireToMeet: Number.POSITIVE_INFINITY, initiative: 50 })).toBe(0);
  });
});

describe("evidenceSufficiencyTier", () => {
  it("classifies scores by the documented thresholds", () => {
    expect(EVIDENCE_TIER_THRESHOLDS.highMin).toBe(60);
    expect(EVIDENCE_TIER_THRESHOLDS.mediumMin).toBe(40);
    expect(evidenceSufficiencyTier(0)).toBe("low");
    expect(evidenceSufficiencyTier(39)).toBe("low");
    expect(evidenceSufficiencyTier(40)).toBe("medium");
    expect(evidenceSufficiencyTier(59)).toBe("medium");
    expect(evidenceSufficiencyTier(60)).toBe("high");
    expect(evidenceSufficiencyTier(100)).toBe("high");
  });
});