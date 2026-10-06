import { z } from "zod";

const factValidationStatusSchema = z.enum(["observable", "interpretation", "unclear"]);

const impactCategorySchema = z.enum([
  "strong_positive",
  "positive",
  "neutral",
  "negative",
  "strong_negative",
]);

export const factInputSchema = z.object({
  clientFactId: z.uuid(),
  text: z.string().trim().min(10).max(300),
}).strict();
export type FactInput = z.infer<typeof factInputSchema>;

export const factValidationResultSchema = z.object({
  clientFactId: z.uuid(),
  status: factValidationStatusSchema,
  reasonJa: z.string(),
  rewriteExampleJa: z.string().nullable(),
  translatedFactEn: z.string().nullable(),
}).strict();
export type FactValidationResult = z.infer<typeof factValidationResultSchema>;

const scoreSchema = z.number().int().min(0).max(100);

export const analysisResultSchema = z.object({
  scores: z.object({
    romanticInterest: scoreSchema,
    desireToMeet: scoreSchema,
    initiative: scoreSchema,
    evidenceSufficiency: scoreSchema,
  }).strict(),
  impact: z
    .object({
      category: impactCategorySchema,
      factIds: z.array(z.uuid()).min(1),
    }).strict()
    .nullable(),
  modelVersion: z.string(),
  rubricVersion: z.string(),
}).strict();
export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const validateFactsRequestSchema = z.object({
  facts: z.array(factInputSchema).min(1).max(10),
  jevConsent: z.literal(true),
}).strict();

export const previewAnalysisRequestSchema = z.object({
  facts: z.array(factInputSchema).min(3).max(10),
  jevConsent: z.literal(true),
}).strict();
