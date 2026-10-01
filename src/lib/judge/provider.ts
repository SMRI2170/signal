import type { AnalysisResult, FactInput, FactValidationResult } from "./types";

export interface JudgeProvider {
  validateFacts(facts: FactInput[]): Promise<FactValidationResult[]>;
  analyze(facts: FactInput[]): Promise<AnalysisResult>;
}
