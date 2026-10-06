export const JEV_INPUT_PRICE_USD_PER_MILLION_TOKENS = 0.042;

export type JevUsage = {
  provider: "jev";
  modelVersion: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};

export function parseJevUsage(model: unknown, usage: unknown): JevUsage | null {
  if (typeof model !== "string" || model.trim().length === 0 || model.length > 100) return null;
  if (!usage || typeof usage !== "object") return null;

  const candidate = usage as Record<string, unknown>;
  const inputTokens = candidate.input_tokens;
  const outputTokens = candidate.output_tokens;
  if (
    typeof inputTokens !== "number" || !Number.isSafeInteger(inputTokens) || inputTokens < 0 ||
    typeof outputTokens !== "number" || !Number.isSafeInteger(outputTokens) || outputTokens < 0
  ) return null;

  // Jev's published early-access rate is $0.042 per million input tokens; output tokens are free.
  const estimatedCostUsd = Number((inputTokens * JEV_INPUT_PRICE_USD_PER_MILLION_TOKENS / 1_000_000).toFixed(12));
  return {
    provider: "jev",
    modelVersion: model,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
  };
}
