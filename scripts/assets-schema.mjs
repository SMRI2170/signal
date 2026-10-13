// scripts/assets-schema.mjs
// Pure zod schema definitions for the SIGNAL asset manifest. Kept separate
// from assets-validate.mjs so that tests can import the schema without
// pulling in the CLI entry point that calls process.exit.

import { z } from "zod";

export const snakeCase = /^[a-z][a-z0-9_]*$/;

export const categories = [
  "references",
  "stickers",
  "controls",
  "panels",
  "scanner",
  "branding",
  "textures",
];
export const statusValues = [
  "planned",
  "generated",
  "needs_qa",
  "adopted",
  "optimized",
  "integrated",
  "rejected",
];
export const renderingValues = [
  "decorative_image",
  "logo_vector",
  "background_texture",
  "reference",
];

export const fileKeys = ["image", "vector", "source", "reference"];

export const checksSchema = z
  .object({
    generated: z.boolean(),
    isolated: z.boolean(),
    qaPassed: z.boolean(),
    optimized: z.boolean(),
    adopted: z.boolean(),
    integrated: z.boolean(),
  })
  .strict();

export const assetSchema = z
  .object({
    id: z.string().regex(snakeCase, "id must be snake_case"),
    category: z.enum(categories),
    status: z.enum(statusValues),
    rendering: z.enum(renderingValues),
    source: z.string().optional(),
    files: z
      .object({
        image: z.string().min(1).optional(),
        vector: z.string().min(1).optional(),
        source: z.string().min(1).optional(),
        reference: z.string().min(1).optional(),
      })
      .strict()
      .refine((v) => Object.keys(v).length > 0, { message: "files object is empty" }),
    usage: z.array(z.string().min(1)).min(1),
    width: z.number().int().nonnegative().optional(),
    height: z.number().int().nonnegative().optional(),
    bytes: z.number().int().nonnegative().optional(),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/, "sha256 must be 64 hex chars")
      .optional(),
    checks: checksSchema,
    notes: z.string().optional(),
  })
  .strict();

export const manifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    generatedAt: z.string().datetime().optional(),
    description: z.string().optional(),
    categories: z
      .array(
        z
          .object({
            id: z.string().regex(snakeCase, "category id must be snake_case"),
            label: z.string().min(1),
            description: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
    assets: z.array(assetSchema),
  })
  .strict();

export const mustTrueByStatus = {
  generated: ["generated"],
  needs_qa: ["generated"],
  adopted: ["generated", "adopted"],
  optimized: ["generated", "optimized"],
  integrated: ["generated", "optimized", "adopted", "integrated"],
  rejected: ["generated"],
  planned: [],
};
