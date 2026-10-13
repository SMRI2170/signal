#!/usr/bin/env node
// scripts/assets-build.mjs
// Re-home every asset listed in assets/manifest.json to its public delivery
// path. The historical URLs (e.g. /stickers/chrome-heart.webp,
// /icons/signal-mark.svg) are preserved so existing src/components and
// src/app references keep working; per-asset `delivery.public` overrides
// the default category-based mapping when the historical URL and the
// snake_case master name do not match.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const manifestPath = resolve(repoRoot, "assets/manifest.json");

// Default public/ destination when the asset has no `delivery.public`
// override. Branding historically lives at /icons/ and drops the
// `brand_` prefix so `brand_signal_mark.svg` becomes `signal-mark.svg`.
function defaultDeliveryPath(category, file) {
  const name = basename(file);
  if (category === "branding") {
    const stem = name.replace(/^brand_/, "").replace(/_/g, "-");
    return resolve(repoRoot, "public/icons", stem);
  }
  if (category === "stickers") return resolve(repoRoot, "public/stickers", name);
  if (category === "controls") return resolve(repoRoot, "public/assets/controls", name);
  if (category === "panels") return resolve(repoRoot, "public/assets/panels", name);
  if (category === "scanner") return resolve(repoRoot, "public/assets/scanner", name);
  if (category === "textures") return resolve(repoRoot, "public/assets/textures", name);
  return resolve(repoRoot, "public/assets/misc", name);
}

function deliveryDest(asset, relFile) {
  const override = asset.delivery?.public;
  if (override) return resolve(repoRoot, override);
  return defaultDeliveryPath(asset.category, relFile);
}

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyOne(srcAbs, destAbs) {
  await ensureDir(dirname(destAbs));
  const data = await readFile(srcAbs);
  await writeFile(destAbs, data);
}

async function readManifest() {
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

function deliverableSlots() {
  // `image` and `vector` are the slots we publish. `source` and `reference`
  // are kept on disk for provenance but are not copied to public/.
  return ["image", "vector"];
}

async function main() {
  const manifest = await readManifest();
  const placed = [];
  const skipped = [];
  const placedNames = new Set();

  for (const asset of manifest.assets) {
    for (const slot of deliverableSlots()) {
      const rel = asset.files?.[slot];
      if (!rel) continue;
      const abs = resolve(repoRoot, rel);
      if (!existsSync(abs)) {
        skipped.push(`${asset.id}: files.${slot} (${rel}) is missing on disk`);
        continue;
      }
      const dest = deliveryDest(asset, rel);
      await copyOne(abs, dest);
      const destRel = relative(repoRoot, dest);
      placed.push(`${asset.id} (${slot}) -> ${destRel}`);
      placedNames.add(basename(dest));
    }
  }

  // Warn about stale files in the historical delivery trees that the
  // manifest no longer references. We do not delete them automatically
  // because the user asked us to keep existing URLs alive.
  const stickerDir = resolve(repoRoot, "public/stickers");
  const iconsDir = resolve(repoRoot, "public/icons");
  const stale = [];
  for (const dir of [stickerDir, iconsDir]) {
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir);
    for (const entry of entries) {
      if (placedNames.has(entry)) continue;
      const abs = resolve(dir, entry);
      stale.push(relative(repoRoot, abs));
    }
  }

  console.log(`assets:build placed ${placed.length} file(s):`);
  for (const p of placed) console.log(`  + ${p}`);
  if (skipped.length) {
    console.log(`\nassets:build skipped ${skipped.length}:`);
    for (const s of skipped) console.log(`  - ${s}`);
  }
  if (stale.length) {
    console.log(`\nassets:build noticed ${stale.length} file(s) under public/ that the manifest no longer references. They were left in place to keep historical URLs alive. Move them to assets/ or remove them in a follow-up PR.`);
    for (const s of stale) console.log(`  ? ${s}`);
  }
  if (skipped.length) process.exit(1);
}

main().catch((err) => {
  console.error("assets:build crashed:", err);
  process.exit(2);
});
