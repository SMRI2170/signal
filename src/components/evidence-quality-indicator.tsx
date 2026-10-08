import type { EvidenceSufficiencyTier } from "@/lib/judge/signal-level";

/**
 * Evidence Quality Indicator (Level 2 of the SIGNAL RECEIPT hierarchy).
 *
 * Renders the tier both as a string of five squares (■■■□□) and as a short
 * Japanese phrase so the user understands the judgment at a glance — no extra
 * reading required.
 *
 *   HIGH   — ■■■■■  "十分な材料"
 *   MEDIUM — ■■■□□  "まだ限定的"
 *   LOW    — ■□□□□  "判断材料がまだ足りない"
 */

const TIER_LABELS: Record<EvidenceSufficiencyTier, string> = {
  high: "十分な材料",
  medium: "まだ限定的",
  low: "判断材料がまだ足りない",
};

const TIER_FILLED: Record<EvidenceSufficiencyTier, number> = {
  high: 5,
  medium: 3,
  low: 1,
};

export function EvidenceQualityIndicator({
  tier,
  label = "判断材料",
}: {
  tier: EvidenceSufficiencyTier;
  label?: string;
}) {
  const filled = TIER_FILLED[tier];
  const bullets = "■".repeat(filled) + "□".repeat(5 - filled);
  return (
    <div className="evidence-quality" data-tier={tier} aria-label={`${label}: ${TIER_LABELS[tier]}`}>
      <span className="evidence-quality-label">{label}</span>
      <span className="evidence-quality-bullets" aria-hidden="true">{bullets}</span>
      <span className="evidence-quality-text">{TIER_LABELS[tier]}</span>
    </div>
  );
}