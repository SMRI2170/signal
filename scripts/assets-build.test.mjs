// scripts/assets-build.test.mjs
// Regression test for npm run assets:build. Runs the build script as a
// subprocess and confirms the historical /stickers/<name>.webp and
// /icons/signal-mark.svg URLs are still served from public/ after a build
// that uses the new manifest-driven pipeline. This protects the public
// delivery URLs that src/components/real-sticker.tsx, src/app/manifest.ts
// and src/app/layout.tsx still depend on.

import { describe, it, expect, beforeAll } from "vitest";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, rmSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");

const publicStickers = resolve(repoRoot, "public/stickers");
const publicIcons = resolve(repoRoot, "public/icons");
const publicControls = resolve(repoRoot, "public/assets/controls");

function build() {
  return spawnSync("node", ["scripts/assets-build.mjs"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

beforeAll(() => {
  // Start every test from a known-empty public/ delivery tree so the build
  // is the only thing placing files.
  for (const dir of [publicStickers, publicIcons, publicControls]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  const result = build();
  if (result.status !== 0) {
    throw new Error(`assets:build failed in beforeAll:\n${result.stdout}\n${result.stderr}`);
  }
});

describe("assets:build — historical URL preservation", () => {
  it("keeps /stickers/chrome-heart.webp reachable", () => {
    const dest = resolve(publicStickers, "chrome-heart.webp");
    expect(existsSync(dest)).toBe(true);
  });

  it("keeps /stickers/scanner-orb.webp reachable", () => {
    const dest = resolve(publicStickers, "scanner-orb.webp");
    expect(existsSync(dest)).toBe(true);
  });

  it("keeps /icons/signal-mark.svg reachable", () => {
    const dest = resolve(publicIcons, "signal-mark.svg");
    expect(existsSync(dest)).toBe(true);
  });

  it("delivers the same bytes as the master under assets/stickers/", () => {
    const master = resolve(repoRoot, "assets/stickers/sticker_chrome_heart.webp");
    const dest = resolve(publicStickers, "chrome-heart.webp");
    expect(sha256(master)).toBe(sha256(dest));
  });

  it("delivers the same bytes as the master under assets/stickers/ (scanner_orb)", () => {
    const master = resolve(repoRoot, "assets/stickers/sticker_scanner_orb.webp");
    const dest = resolve(publicStickers, "scanner-orb.webp");
    expect(sha256(master)).toBe(sha256(dest));
  });

  it("delivers the same bytes as the master under assets/branding/", () => {
    const master = resolve(repoRoot, "assets/branding/brand_signal_mark.svg");
    const dest = resolve(publicIcons, "signal-mark.svg");
    expect(sha256(master)).toBe(sha256(dest));
  });
});

describe("assets:build — control namespace", () => {
  it("places every control under public/assets/controls/<name>.svg", () => {
    for (const name of [
      "control_primary_gloss_surface.svg",
      "control_secondary_glass_frame.svg",
      "control_floating_add_decoration.svg",
      "control_selection_chip_accent.svg",
      "control_tab_indicator.svg",
    ]) {
      expect(existsSync(resolve(publicControls, name))).toBe(true);
    }
  });
});
