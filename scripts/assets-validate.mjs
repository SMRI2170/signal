#!/usr/bin/env node
// scripts/assets-validate.mjs
// Validate assets/manifest.json against the zod schema, then walk every
// asset on disk to confirm file existence, sha256, byte count, snake_case
// id, status/checks consistency and duplicate sha256.
// Exits 0 on success, 1 on the first error (or lists all errors in --all).

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestSchema, mustTrueByStatus } from "./assets-schema.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const manifestPath = resolve(repoRoot, "assets/manifest.json");

const args = new Set(process.argv.slice(2));
const reportAll = args.has("--all");
const quiet = args.has("--quiet");

function fail(errors, code = 1) {
  if (quiet) {
    for (const e of errors) console.error(`${e.code}: ${e.message}`);
  } else {
    for (const e of errors) {
      const where = e.asset ? ` [${e.asset}]` : "";
      console.error(`${e.code}${where}: ${e.message}`);
    }
  }
  console.error(`\nassets:validate FAILED (${errors.length} error${errors.length === 1 ? "" : "s"}).`);
  process.exit(code);
}

async function hashAndSize(path) {
  const buf = await readFile(path);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return { sha256, bytes: buf.byteLength };
}

function flattenZodIssues(error) {
  const out = [];
  const walk = (issue, parentPath) => {
    if (issue.issues) {
      for (const child of issue.issues) walk(child, [...parentPath, ...(issue.path ?? [])]);
    } else {
      const where = [...parentPath, ...(issue.path ?? [])].join(".") || "/";
      out.push({ code: "schema", message: `${where} ${issue.message}` });
    }
  };
  walk(error, []);
  return out;
}

async function main() {
  const errors = [];
  const manifestText = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);

  // 1. Shape check via zod
  const parsed = manifestSchema.safeParse(manifest);
  if (!parsed.success) {
    errors.push(...flattenZodIssues(parsed.error));
    if (!reportAll) fail(errors);
  }

  // 2. Per-asset on-disk checks
  const categoryIds = new Set((manifest.categories ?? []).map((c) => c.id));
  const seenIds = new Set();
  const seenSha = new Map();

  for (const asset of manifest.assets ?? []) {
    if (seenIds.has(asset.id)) {
      errors.push({ code: "duplicate-id", asset: asset.id, message: `id "${asset.id}" is duplicated` });
    }
    seenIds.add(asset.id);

    if (!categoryIds.has(asset.category)) {
      errors.push({ code: "category-unknown", asset: asset.id, message: `category "${asset.category}" is not declared` });
    }
    if (asset.status === "rejected" && !(asset.notes ?? "").trim()) {
      errors.push({ code: "rejected-no-notes", asset: asset.id, message: `rejected assets must include notes` });
    }
    for (const key of mustTrueByStatus[asset.status] ?? []) {
      if (asset.checks?.[key] !== true) {
        errors.push({
          code: "status-checks-mismatch",
          asset: asset.id,
          message: `status "${asset.status}" requires checks.${key} = true`,
        });
      }
    }
    if (asset.files) {
      for (const [slot, relPath] of Object.entries(asset.files)) {
        const abs = resolve(repoRoot, relPath);
        if (!existsSync(abs)) {
          errors.push({
            code: "file-missing",
            asset: asset.id,
            message: `files.${slot} -> ${relative(repoRoot, abs)} does not exist`,
          });
          continue;
        }
        const { sha256, bytes } = await hashAndSize(abs);
        if (asset.sha256 && asset.sha256 !== sha256) {
          errors.push({
            code: "sha256-mismatch",
            asset: asset.id,
            message: `files.${slot} sha256 ${sha256} does not match manifest ${asset.sha256}`,
          });
        }
        if (asset.bytes != null && asset.bytes !== bytes) {
          errors.push({
            code: "bytes-mismatch",
            asset: asset.id,
            message: `files.${slot} bytes ${bytes} does not match manifest ${asset.bytes}`,
          });
        }
        const prior = seenSha.get(sha256);
        if (prior && prior !== asset.id) {
          errors.push({
            code: "duplicate-sha256",
            asset: asset.id,
            message: `sha256 ${sha256} also used by ${prior}`,
          });
        }
        seenSha.set(sha256, asset.id);
      }
    }
  }

  if (errors.length === 0) {
    if (!quiet) {
      const counts = new Map();
      for (const a of manifest.assets ?? []) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
      console.log(`assets:validate OK (${manifest.assets.length} assets across ${counts.size} categories).`);
      for (const [cat, n] of counts) console.log(`  ${cat.padEnd(12)} ${n}`);
    }
    return;
  }
  fail(errors);
}

main().catch((err) => {
  console.error("assets:validate crashed:", err);
  process.exit(2);
});
