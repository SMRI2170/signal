#!/usr/bin/env node
// scripts/assets-build.mjs
// Re-home every asset listed in assets/manifest.json to its public delivery
// path. Historical URLs (e.g. /stickers/chrome-heart.webp, /icons/signal-mark.svg)
// are preserved so existing src/components and src/app references keep working.

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const manifestPath = resolve(repoRoot, "assets/manifest.json");

// Map each manifest files.* slot to the public/... tree it should land in.
// Branding historically lives at /icons/ and drops the brand_ prefix so the
// manifest name brand_signal_mark.svg becomes /icons/signal-mark.svg.
function deliveryPath(category, file) {
  const name = basename(file);
  if (category === "stickers") {
    return resolve(repoRoot, "public/stickers", name);
  }
  if (category === "branding") {
    const stem = name.replace(/^brand_/, "").replace(/_/g, "-");
    return resolve(repoRoot, "public/icons", stem);
  }
  if (category === "controls") {
    return resolve(repoRoot, "public/assets/controls", name);
  }
  if (category === "panels") {
    return resolve(repoRoot, "public/assets/panels", name);
  }
  if (category === "scanner") {
    return resolve(repoRoot, "public/assets/scanner", name);
  }
  if (category === "textures") {
    return resolve(repoRoot, "public/assets/textures", name);
  }
  return resolve(repoRoot, "public/assets/misc", name);
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

function slotUsesFileKey() {
  // We deliver `image` and `vector` slots. `source` and `reference` are kept on
  // disk for provenance but are not copied to public/.
  return ["image", "vector"];
}

async function main() {
  const manifest = await readManifest();
  const placed = [];
  const skipped = [];

  for (const asset of manifest.assets) {
    const slots = slotUsesFileKey();
    for (const slot of slots) {
      const rel = asset.files?.[slot];
      if (!rel) continue;
      const abs = resolve(repoRoot, rel);
      if (!existsSync(abs)) {
        skipped.push(`${asset.id}: files.${slot} (${rel}) is missing on disk`);
        continue;
      }
      const dest = deliveryPath(asset.category, rel);
      await copyOne(abs, dest);
      placed.push(`${asset.id} -> ${relative(repoRoot, dest)}`);
    }
  }

  // Warn about stale files in the historical delivery trees that the
  // manifest no longer references. We do not delete them automatically
  // because the user asked us to keep existing URLs stable.
  const stickerDir = resolve(repoRoot, "public/stickers");
  const iconsDir = resolve(repoRoot, "public/icons");
  const stale = [];
  for (const dir of [stickerDir, iconsDir]) {
    if (!existsSync(dir)) continue;
    const entries = await readdir(dir);
    for (const entry of entries) {
      const abs = resolve(dir, entry);
      const referenced = placed.some((p) => p.endsWith(`/${entry}`) || p.endsWith(`\\${entry}`));
      if (!referenced) stale.push(relative(repoRoot, abs));
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
