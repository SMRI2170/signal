# SIGNAL Y2K Controls — Pack 01

This pack provides **five independent, transparent SVG decorative surfaces** for Web and KMP. See [Issue #90](https://github.com/SMRI2170/signal/issues/90).

- One asset per file, no embedded button labels, no numbers or dynamic state.
- Use CSS/Compose for the actual interactive surface, hit area, focus semantics, disabled/loading states and labels.
- Treat the SVG as the background or decoration, not the clickable view itself.
- On Web, use the SVG directly; for Compose Multiplatform, rasterize to appropriately sized transparent WebP/PNG and verify on Android and iOS.
- For variable-width pills, stretch may distort corners/highlights. Prefer an implementation drawn with Compose/CSS; use this SVG for fixed-size previews or as a 9-slice design reference.
- Generated and isolated are set true. QA, adoption and integration remain pending until rendered comparison on target platforms.

| ID | Use |
|---|---|
| `control_primary_gloss_surface` | landing, fact_input |
| `control_secondary_glass_frame` | fact_input, result |
| `control_floating_add_decoration` | history, fact_input |
| `control_selection_chip_accent` | fact_input, filters |
| `control_tab_indicator` | history, detail |
