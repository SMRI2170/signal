import type { AnalysisResult, FactInput, FactValidationResult } from "./types";

export interface JudgeProvider {
  validateFacts(facts: FactInput[]): Promise<FactValidationResult[]>;
  analyze(facts: FactInput[]): Promise<AnalysisResult>;
}

export class JudgeProviderUnavailableError extends Error {
  constructor(message = "Judge provider is unavailable.") {
    super(message);
    this.name = "JudgeProviderUnavailableError";
  }
}
