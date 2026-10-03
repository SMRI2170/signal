import { z } from "zod";

const factValidationStatusSchema = z.enum(["observable", "interpretation", "unclear"]);
type FactValidationStatus = z.infer<typeof factValidationStatusSchema>;

const impactCategorySchema = z.enum([
  "strong_positive",
  "positive",
  "neutral",
  "negative",
  "strong_negative",
]);
type ImpactCategory = z.infer<typeof impactCategorySchema>;

export const factInputSchema = z.object({
  clientFactId: z.uuid(),
  text: z.string().trim().min(10).max(300),
});
export type FactInput = z.infer<typeof factInputSchema>;

const factValidationResultSchema = z.object({
  clientFactId: z.uuid(),
  status: factValidationStatusSchema,
  reasonJa: z.string(),
  rewriteExampleJa: z.string().nullable(),
  translatedFactEn: z.string().nullable(),
});
export type FactValidationResult = z.infer<typeof factValidationResultSchema>;

const scoreSchema = z.number().int().min(0).max(100);

const analysisResultSchema = z.object({
  scores: z.object({
    romanticInterest: scoreSchema,
    desireToMeet: scoreSchema,
    initiative: scoreSchema,
    evidenceSufficiency: scoreSchema,
  }),
  impact: z
    .object({
      category: impactCategorySchema,
      factIds: z.array(z.uuid()).min(1),
    })
    .nullable(),
  modelVersion: z.string(),
  rubricVersion: z.string(),
});
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const validateFactsRequestSchema = z.object({
  facts: z.array(factInputSchema).min(1).max(10),
});

export const previewAnalysisRequestSchema = z.object({
  facts: z.array(factInputSchema).min(3).max(10),
});
