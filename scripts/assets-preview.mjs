#!/usr/bin/env node
// scripts/assets-preview.mjs
// Render a one-page HTML catalog of every asset in assets/manifest.json with a
// preview, status badge, usage tags, byte count and sha256. Output goes to
// dist/asset-preview.html so the deliverable is never inside src/.

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const manifestPath = resolve(repoRoot, "assets/manifest.json");
const outPath = resolve(repoRoot, "dist/asset-preview.html");

const STATUS_LABEL = {
  planned: "planned",
  generated: "generated",
  needs_qa: "needs QA",
  adopted: "adopted",
  optimized: "optimized",
  integrated: "integrated",
  rejected: "rejected",
};

const STATUS_TONE = {
  planned: "#9ca3af",
  generated: "#facc15",
  needs_qa: "#fb923c",
  adopted: "#22d3ee",
  optimized: "#60a5fa",
  integrated: "#34d399",
  rejected: "#f87171",
};

function escape(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function thumbPath(asset) {
  // For preview, we point at the on-disk source under assets/. The catalog is
  // for humans inspecting the manifest; the runtime never reads it.
  const file = asset.files?.vector ?? asset.files?.image ?? asset.files?.source ?? asset.files?.reference;
  if (!file) return null;
  return file;
}

function cardHtml(asset) {
  const tone = STATUS_TONE[asset.status] ?? "#9ca3af";
  const file = thumbPath(asset);
  const tags = (asset.usage ?? []).map((t) => `<span class="tag">${escape(t)}</span>`).join(" ");
  const preview = file
    ? extname(file).toLowerCase() === ".svg"
      ? `<object class="thumb" type="image/svg+xml" data="../${escape(file)}" aria-label="${escape(asset.id)}"></object>`
      : `<img class="thumb" src="../${escape(file)}" alt="${escape(asset.id)}" loading="lazy" />`
    : `<div class="thumb placeholder">no file</div>`;
  const checks = Object.entries(asset.checks ?? {})
    .map(([k, v]) => `<span class="check ${v ? "on" : "off"}">${v ? "✓" : "·"} ${escape(k)}</span>`)
    .join(" ");
  return `
    <article class="card" data-status="${escape(asset.status)}" data-category="${escape(asset.category)}">
      ${preview}
      <header>
        <h2>${escape(asset.id)}</h2>
        <span class="badge" style="background:${tone}">${escape(STATUS_LABEL[asset.status] ?? asset.status)}</span>
      </header>
      <p class="meta">
        <span>${escape(asset.category)}</span>
        <span>${escape(asset.rendering)}</span>
      </p>
      <p class="usage">${tags}</p>
      <p class="path">${escape(file ?? "—")}</p>
      <p class="hash">sha256: <code>${escape(asset.sha256 ?? "—")}</code></p>
      <p class="bytes">bytes: <code>${escape(asset.bytes ?? "—")}</code></p>
      <p class="checks">${checks}</p>
      ${asset.notes ? `<p class="notes">${escape(asset.notes)}</p>` : ""}
    </article>`;
}

async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const byCategory = new Map();
  for (const a of manifest.assets ?? []) {
    if (!byCategory.has(a.category)) byCategory.set(a.category, []);
    byCategory.get(a.category).push(a);
  }
  const sections = [...byCategory.entries()]
    .map(([cat, list]) => {
      const cards = list.map(cardHtml).join("\n");
      return `<section><h1>${escape(cat)} <small>${list.length}</small></h1>${cards}</section>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>SIGNAL Asset Catalog</title>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 24px; background: #0b0b10; color: #f4f4f5; }
      h1 { margin: 24px 0 12px; font-size: 1.4rem; }
      h1 small { color: #a1a1aa; font-weight: 400; }
      h2 { font-size: 1rem; margin: 0; font-family: ui-monospace, monospace; }
      section { margin-bottom: 24px; }
      .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
      .card { background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
      .thumb { width: 100%; aspect-ratio: 1 / 1; background: repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%) 50% / 16px 16px; border-radius: 8px; object-fit: contain; }
      .thumb.placeholder { display: grid; place-items: center; color: #a1a1aa; }
      header { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
      .badge { padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; color: #0b0b10; text-transform: uppercase; letter-spacing: 0.04em; }
      .meta, .usage, .path, .hash, .bytes, .notes, .checks { margin: 0; font-size: 0.78rem; color: #d4d4d8; }
      .tag { display: inline-block; padding: 1px 6px; border-radius: 4px; background: #27272a; color: #f4f4f5; margin-right: 4px; font-size: 0.7rem; }
      code { color: #a5f3fc; }
      .check { display: inline-block; margin-right: 6px; font-size: 0.7rem; }
      .check.on { color: #34d399; }
      .check.off { color: #71717a; }
      .notes { color: #fbbf24; }
    </style>
  </head>
  <body>
    <header><h1>SIGNAL Asset Catalog</h1><p>${manifest.assets?.length ?? 0} assets · generated ${escape(manifest.generatedAt ?? "")}</p></header>
    ${sections.split("<section>").filter(Boolean).map((s) => `<section><div class="grid">${s.replace(/^<h1>.*?<\/h1>/, "")}</div></section>`).join("")}
  </body>
</html>
`;

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, html);
  console.log(`assets:preview wrote ${relative(repoRoot, outPath)} (${manifest.assets?.length ?? 0} cards).`);
}

main().catch((err) => {
  console.error("assets:preview crashed:", err);
  process.exit(2);
});
