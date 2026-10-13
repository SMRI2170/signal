# SIGNAL Asset Pipeline

`assets/manifest.json` is the **Single Source of Truth** for every design asset
used by the Web and KMP clients. This directory is organised so that the file
on disk, the manifest entry, and the human-readable status stay in lockstep.

## Layout

```text
assets/
  manifest.json         # SoT — every asset has exactly one entry
  manifest.schema.json  # JSON Schema used by scripts/assets-validate.mjs
  README.md             # this file
  references/           # AI-generated originals and external references. Not delivered.
  stickers/             # Adopted masters — 1 file = 1 sticker (snake_case)
  controls/             # Decorative bitmaps for buttons, chips, tabs
  panels/               # Fact Ticket / Receipt / chrome bezel
  scanner/              # Judge flow ornaments, result frames
  branding/             # Wordmarks and app icons (vector preferred)
  textures/             # Background textures (hologram, paper, gel, grid)
```

Delivery copies that the runtime needs are produced by `npm run assets:build`
and land under `public/...`. The KMP `native/composeApp/src/commonMain/...`
drawable copy is documented below and still placed manually until the
generator can write to `composeResources` reliably.

## Status and checks

Each asset carries a `status` (the most advanced state) and a `checks` block
(the gates it has cleared). The pipeline never auto-promotes past
`checks.qaPassed = true` — defects and halo problems require a human eye.

| status        | meaning                                                      |
| ------------- | ------------------------------------------------------------ |
| `planned`     | Decided but no file yet. Tracked in issue #90, not in manifest until the file lands. |
| `generated`   | Source file exists. May still need cropping, isolating, or QA. |
| `needs_qa`    | File exists but a defect is suspected (alpha hole, bleed, multi-asset frame). |
| `adopted`     | Approved for product use. May not yet be optimised.         |
| `optimized`   | WebP/AVIF/PNG produced and byte budget held.                 |
| `integrated`  | Live in `public/` (Web) and/or `composeResources/drawable/` (KMP). |
| `rejected`    | Will not ship. `notes` must explain why.                     |

The same `status` and `checks` values are referenced in issue #90, so flipping
`checks.qaPassed` from `false` to `true` (or moving `status` to `adopted`) is
the place to record the human review.

## Commands

| script                | purpose                                                                 |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run assets:validate` | Walks `manifest.json`, checks IDs, file existence, sha256, byte size, naming, status/checks consistency, and duplicate sha256 across assets. Exits non-zero on failure. |
| `npm run assets:build`    | Re-homes every asset to its delivery path. Refreshes `public/stickers/`, `public/icons/`, and `public/assets/...` from the manifest. Logs which files were placed. |
| `npm run assets:preview`  | Writes `dist/asset-preview.html` with one card per asset, status badge, usage tags, sha256, and byte count. Open it in a browser to walk the catalog visually. |

All three scripts are pure Node ESM (`.mjs`) and add no dependencies. They can
run in CI without any image processing toolchain.

## ChatGPT ↔ Codex split

- **ChatGPT** generates new art and writes a manifest entry plus the file.
  It only sets `checks.generated = true` and `checks.isolated = true`. It
  does **not** mark `qaPassed`, `optimized`, `adopted`, or `integrated`.
- **Codex** validates the manifest, runs `npm run assets:validate`, performs
  the human review for `qaPassed`, runs `npm run assets:build`, and only then
  sets `checks.adopted` and `integrated`. Codex will not silently flip a
  visually-risky check to `true`.
- The `[x]` checkboxes in issue #90 record **generation only**. Adoption,
  optimisation, QA and integration live in `assets/manifest.json` so the
  Web and KMP clients never have to read the issue tracker.

## Web vs KMP delivery

Web consumes assets via `public/...`, which is regenerated from
`assets/manifest.json` by `npm run assets:build`. The build keeps the
historical URLs alive so existing `<img src="/stickers/...">` calls keep
working.

| manifest path                 | web delivery path                       | reason                              |
| ----------------------------- | --------------------------------------- | ----------------------------------- |
| `assets/stickers/*`           | `public/stickers/*`                     | Historical URL preserved.           |
| `assets/branding/brand_*.svg` | `public/icons/<stem>.svg`               | `src/app/manifest.ts` & `layout.tsx`. |
| `assets/controls/*`           | `public/assets/controls/<name>`         | New namespace, ready for Web use.   |
| `assets/panels/*`             | `public/assets/panels/<name>`           | Reserved.                           |
| `assets/scanner/*`            | `public/assets/scanner/<name>`          | Reserved.                           |

KMP delivery today is manual: copy the same file into
`native/composeApp/src/commonMain/composeResources/drawable/<name>`. Compose
Multiplatform picks it up on the next build. An automated copy will land
once we decide where generated files live inside the Gradle source set; see
issue #34 for the tracking issue.

## Adding a new asset

1. Drop the file into the matching `assets/<category>/` directory using a
   snake_case name. (e.g. `assets/stickers/sticker_pixel_spark.webp`.)
2. Add an entry to `assets/manifest.json` with `id`, `category`, `status`,
   `files`, `usage`, and `checks` (`generated` and `isolated` true, the rest
   false). `sha256` and `bytes` can be left to `npm run assets:validate` to
   fill in if you want.
3. Run `npm run assets:validate`. It will refuse to pass if the file is
   missing, the hash mismatches, the name is not snake_case, the status does
   not agree with the checks, or the sha256 collides with another asset.
4. Once QA is done, update `checks.qaPassed`, `status`, and `notes` in the
   same entry. Never edit issue #90 to claim QA passed — only `manifest.json`
   is the source of that fact.
5. Run `npm run assets:build` and `npm run assets:preview` to refresh the
   delivery copies and the catalog page.

## Acceptance criteria

The pipeline is healthy when all of these hold:

- `npm run assets:validate` exits 0 on a clean tree.
- Every asset reachable from the Web codebase (`/stickers/...`,
  `/icons/...`, `/assets/...`) has a matching `files` entry.
- Adding a new sticker, control, panel, scanner, branding or texture file
  requires only one manifest edit and one `assets:build` run.
- The catalog at `dist/asset-preview.html` matches the live `manifest.json`
  after every change.
- No two assets share a `sha256`; if they do, `validate` flags the duplicate
  before it can be adopted twice.
