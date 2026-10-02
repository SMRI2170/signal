# Native Y2K foundation verification

Issue: #28  
Scope: shared Compose Multiplatform UI foundation

## Rendering constraints

- `DotField` builds dot positions inside `drawWithCache`; positions are recalculated only when size or density changes.
- Sticker shapes are Canvas paths. No raster asset, external font, blur, Lottie, video, or infinite animation is loaded.
- Chrome and gel are shared brushes. They are restricted to the device layer instead of every content surface.
- Decorative hearts, butterflies, sparks, and lightning do not rely on Unicode glyph rendering.
- Screen state and `JudgeGateway` remain outside the visual component layer.

## Viewport catalog

`Y2kComponentCatalog.kt` provides Android Studio previews at:

- 360 × 1200dp
- 390 × 1200dp
- 430 × 1200dp

The catalog includes every foundation material and the most constrained components: Fact Ticket, Validation Slip, Signal Receipt, and Signal Tape.

## Build verification

Run from `native/`:

```bash
./gradlew :composeApp:testAndroidHostTest :androidApp:assembleDebug
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

## Performance follow-up

This foundation adds no frame-driven state. Runtime jank, cold start, release shrinking, and baseline profile measurements remain part of #36, where they can be measured against a signed release build rather than debug output.
