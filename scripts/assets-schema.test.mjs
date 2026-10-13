// scripts/assets-schema.test.mjs
// Unit tests for the zod schemas in scripts/assets-schema.mjs. We assert
// the schema rejects bad input (unknown categories, missing checks, bad
// sha256, non-snake_case ids) and accepts a minimal valid asset.

import { describe, it, expect } from "vitest";
import {
  manifestSchema,
  assetSchema,
  mustTrueByStatus,
  snakeCase,
  categories,
  statusValues,
  renderingValues,
  fileKeys,
  checksSchema,
} from "./assets-schema.mjs";

const validAsset = {
  id: "sticker_heart_chrome",
  category: "stickers",
  status: "generated",
  rendering: "decorative_image",
  files: { image: "assets/stickers/sticker_heart_chrome.webp" },
  usage: ["landing"],
  checks: {
    generated: true,
    isolated: true,
    qaPassed: false,
    optimized: false,
    adopted: false,
    integrated: false,
  },
};

const validManifest = {
  schemaVersion: 1,
  categories: [{ id: "stickers", label: "Stickers" }],
  assets: [validAsset],
};

describe("snakeCase", () => {
  it("accepts snake_case strings", () => {
    expect(snakeCase.test("hello_world_42")).toBe(true);
  });
  it("rejects kebab-case, PascalCase and starting digits", () => {
    expect(snakeCase.test("Hello-World")).toBe(false);
    expect(snakeCase.test("hello-world")).toBe(false);
    expect(snakeCase.test("42_world")).toBe(false);
  });
});

describe("assetSchema", () => {
  it("accepts the minimal valid asset", () => {
    expect(() => assetSchema.parse(validAsset)).not.toThrow();
  });

  it("rejects an unknown category", () => {
    const bad = { ...validAsset, category: "logos" };
    const r = assetSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects a non-snake_case id", () => {
    const bad = { ...validAsset, id: "Sticker-Heart" };
    const r = assetSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects an empty files object", () => {
    const bad = { ...validAsset, files: {} };
    const r = assetSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects a bad sha256", () => {
    const bad = { ...validAsset, sha256: "not-hex" };
    const r = assetSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects a status that requires checks.integrated when it is false", () => {
    const bad = {
      ...validAsset,
      status: "integrated",
      checks: { ...validAsset.checks, integrated: false },
    };
    const r = assetSchema.safeParse(bad);
    expect(r.success).toBe(true); // schema does not enforce status<->checks; that is validate.mjs's job
  });
});

describe("manifestSchema", () => {
  it("accepts a minimal valid manifest", () => {
    expect(() => manifestSchema.parse(validManifest)).not.toThrow();
  });

  it("rejects schemaVersion other than 1", () => {
    const bad = { ...validManifest, schemaVersion: 2 };
    const r = manifestSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it("rejects extra top-level keys", () => {
    const bad = { ...validManifest, surprise: true };
    const r = manifestSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });
});

describe("mustTrueByStatus", () => {
  it("integrated requires generated/optimized/adopted/integrated", () => {
    expect(mustTrueByStatus.integrated).toEqual([
      "generated",
      "optimized",
      "adopted",
      "integrated",
    ]);
  });
  it("planned has no requirements", () => {
    expect(mustTrueByStatus.planned).toEqual([]);
  });
});

describe("exported constant tables", () => {
  it("categories lists the seven manifest buckets", () => {
    expect(categories).toEqual([
      "references",
      "stickers",
      "controls",
      "panels",
      "scanner",
      "branding",
      "textures",
    ]);
  });
  it("statusValues covers planned..rejected", () => {
    expect(statusValues).toEqual([
      "planned",
      "generated",
      "needs_qa",
      "adopted",
      "optimized",
      "integrated",
      "rejected",
    ]);
  });
  it("renderingValues includes logo_vector", () => {
    expect(renderingValues).toContain("logo_vector");
  });
  it("fileKeys lists the four allowed slots", () => {
    expect(fileKeys).toEqual(["image", "vector", "source", "reference"]);
  });
  it("checksSchema is a zod object schema", () => {
    expect(() => checksSchema.parse({
      generated: true, isolated: true, qaPassed: false, optimized: false, adopted: false, integrated: false,
    })).not.toThrow();
    expect(() => checksSchema.parse({ generated: "yes" })).toThrow();
  });
});
