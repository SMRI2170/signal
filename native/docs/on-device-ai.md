# On-device AI: Issue #94 prototype

## Current implementation boundary

The analysis form now lets the user explicitly select on-device AI. The default remains the existing gateway. Once selected, the app downloads and verifies the pinned model over HTTPS into app-private storage; inference runs locally and never falls back to `ServerJudgeGateway`. Model download is a separate user action; Fact text is not part of the download request. `LocalJudgeGateway` remains a deterministic test/demo implementation and is not treated as an AI model.

This remains an experimental model and the default mode is unchanged. The first download is 347 MB; the UI discloses the size and recommends Wi-Fi and at least 500 MB free space. SHA-256 is verified before atomic installation. On-device inference itself is network independent after download. The command-line provisioner remains available for repeatable device QA.

## Candidate decision for the prototype

| Candidate | Weights / package size | Runtime and platform | License | Status |
|---|---:|---|---|---|
| Qwen3-0.6B INT4 no-think | 347,251,840 bytes (model file) | LiteRT-LM 0.18.1; Kotlin Android API and Swift iOS API | Apache-2.0 (base and quantized artifact) | Prototype selected; Japanese Fact quality and Pixel 8/iPhone performance remain unmeasured here |
| Qwen3-0.6B BF16 | 1.5 GB model file | Multiple runtimes | Apache-2.0 | Too large for the first mobile prototype |
| Gemma 3 270M | Quantized deployable file size not established for this build | LiteRT-LM | Gemma Terms of Use, with redistribution notice and use restrictions | Not selected: current model card says LiteRT-LM GPU acceleration is WIP; Japanese domain quality unmeasured |
| Dedicated Japanese classifier | Potentially below 100 MB | LiteRT CompiledModel could serve Android and iOS | Depends on training data and resulting artifact | Deferred: no labeled SIGNAL dataset/model is present; fabricating labels or reporting unmeasured precision would be unsafe |

Qwen is a general-purpose learned language model, not a SIGNAL-trained classifier. It can return the existing four score fields, but this does not establish those scores as valid or calibrated. #72's score semantics and #73's gold-set evaluation remain release gates. Do not enable this path for production until the rubric is fixed and the model has been evaluated against human-reviewed synthetic cases and Jev.

The Qwen artifact is pinned to LiteRT Community revision `6aa2daf8aba4aa456797fb8040b36a3948bcfda7`; file SHA-256 is `2df6821ec12702dafd33915e7a1a1adc7c4b053f3672fd9555dfaf3a114c4139`. It is not stored in Git. Android runtime is pinned to Maven `com.google.ai.edge.litertlm:litertlm-android:0.18.1`; iOS uses the official LiteRT-LM Swift package `0.18.1`.

Android inference currently sets the runtime context allocation to 768 tokens and the output cap to 256 tokens. The model artifact has a 1,280-token KV cache. LiteRT-LM/Qwen benchmark reports indicate that smaller runtime token allocations can improve CPU decode speed; this setting remains subject to physical-device validation and may need adjustment for longer Fact sets. The prototype evaluation uses three Facts.

The Android AAR is 50,925,284 bytes uncompressed, including a 22,155,680-byte arm64 JNI library and a 26,353,160-byte x86_64 JNI library. These are dependency archive measurements, not the final APK delta. The iOS Swift package uses a prebuilt XCFramework; the downloaded archive is about 124 MB. Its final IPA delta and the Android APK delta were not measured. Neither platform bundles the 347 MB model in the app package.

### Published measurements (not SIGNAL measurements)

The model card reports Qwen3-0.6B INT4 on a Samsung Galaxy S26, Android 16, using LiteRT-LM 0.16.0 and a fixed 205-token prompt. The no-think CPU run reports 0.68 s time-to-first-token, 47.2–47.3 generated tokens/s, and 1,032–1,036 MB peak RSS; engine initialization is reported separately at 0.9–1.3 s. These measurements are from a different and newer device and do not prove the Pixel 8 will meet Issue #94. They also indicate substantial memory use. The 347 MB model is above the 100 MB ideal.

## Local verification

1. Build/install the standard debug app:

   ```sh
   cd native
   ./gradlew :androidApp:installDebug
   ```

2. Open the Fact form, select "端末内AIで分析", and tap "モデルを取得 · 約347 MB". The app verifies the pinned SHA-256 before enabling inference. To provision the model outside the UI for QA, use:

   ```sh
   ./scripts/provision-ondevice-model.sh android
   # or
   ./scripts/provision-ondevice-model.sh ios-simulator
   ```

3. For iOS Simulator or a physical iPhone, build the shared XCFramework first. It contains both device (`ios-arm64`) and Apple Silicon Simulator slices. Then regenerate the Xcode project and open it:

   ```sh
   ./gradlew :composeApp:assembleSignalSharedDebugXCFramework
   cd iosApp && xcodegen generate
   open SIGNAL.xcodeproj
   ```

   In Xcode, select the connected iPhone and `SIGNAL` scheme, set an Apple Development Team under Signing & Capabilities, then Run. An Apple Developer account and a provisioning profile for `com.signal.app` are required for physical installation. Simulator builds do not need device provisioning.

4. Enter three synthetic Japanese Facts. To verify the no-network claim, download the model first, enable airplane mode, select the on-device option and rerun. The app's other cloud-backed functions remain network dependent.

The in-app model download runs on the device and stores the file only in the app container; it is not bundled in APK/IPA or Git. The QA provision command instead downloads on the development host before copying the verified model to the app container.

## Measurement procedure and reporting

- Use Pixel 8 and record Android build, device build fingerprint, available memory, thermal state, backend, and whether model initialization was warm or cold.
- Use at least three synthetic Japanese Facts; include negation, changed subject, ambiguity, and contradictory events. Do not use user-submitted Fact text.
- Measure from the analyze action through result composition/display. Also report model download time, model initialization, and inference separately.
- Run one cold load and at least 30 consecutive warm analyses. Report p50, p95, failures, median and max output tokens, peak RSS/PSS, battery/thermal observations, model bytes, and installed APK size.
- Compare the same synthetic fixture with Jev. Human-reviewed labels and per-field agreement matter; numeric similarity alone is not correctness.
- An Android 15 arm64 emulator (`ramen_test`, 4 GiB guest RAM, CPU backend) completed two 30-run Gateway batches. The first batch reported 1,398 ms model preparation, 5,838/7,504 ms p50/p95, and max sampled PSS 1,056,006 KiB. A repeat on 2026-10-23 reported 1,390 ms preparation, 5,688/11,045 ms p50/p95, and max sampled PSS 1,091,801 KiB; the slowest run was 11,300 ms. Both batches had valid JSON and expected labels 30/30 with stable labels and scores 30/30. The repeat exceeded the 10-second p95 target. These are Gateway measurements, not UI button-to-result measurements; the emulator runs on a Mac host, and sampled PSS is not a true peak.
- The earlier Pixel 8 / Android 17 run used the prior 1,280-token allocation: the cold Gateway run took 15,438 ms and misclassified an explicit negative action. The Pixel disconnected before the revised 768-token configuration could be tested. The emulator result therefore does not replace the Pixel 8 acceptance run.
- Do not present published S26 numbers or emulator numbers as Pixel 8 results, or claim performance acceptance from emulator-only testing.

To provision the pinned artifact and run the device-only test, connect an installed debug app and use:

```sh
./scripts/provision-ondevice-model.sh android
./gradlew :androidApp:connectedDebugAndroidTest \
  -Pandroid.testInstrumentationRunnerArguments.class=com.signal.smoke.OnDeviceJudgeModelTest \
  -Pandroid.testInstrumentationRunnerArguments.iterations=30
```

The test emits only run number, latency, label names, score stability, output character count, and sampled PSS. It never logs Fact text or model explanations. For a short smoke run, set `iterations=1`.

### Run record template

| Field | Result |
|---|---|
| Device / OS / app commit | ramen_test AVD / Android 15 / `f9d7700` |
| Model file bytes / SHA-256 | 347,251,840 / `2df6821ec12702dafd33915e7a1a1adc7c4b053f3672fd9555dfaf3a114c4139` |
| Runtime / backend | LiteRT-LM 0.18.1 / CPU prototype |
| Model initialization, cold | AVD repeat: 1,390 ms (`prepare()`; separate from inference) |
| Button-to-result, cold | Not measured; Gateway only |
| Button-to-result, warm p50 / p95 (30+ runs) | AVD Gateway repeat: 5,688 / 11,045 ms; UI not included; p95 target missed |
| Expected labels / score stability | AVD repeat: all 3 expected OBSERVABLE, 30/30; scores identical, 30/30 |
| Peak RSS or PSS / failures | AVD repeat sampled PSS max: 1,091,801 KiB; no test failures; not a true transient peak |
| Human review / Jev agreement | Not measured |

## Primary sources

- [Qwen3-0.6B INT4 model card, artifact hash/size, usage, license, and measurements](https://huggingface.co/litert-community/Qwen3-0.6B-int4)
- [LiteRT-LM Android API](https://ai.google.dev/edge/litert-lm/android)
- [LiteRT-LM source and Swift API status](https://github.com/google-ai-edge/LiteRT-LM)
- [LiteRT-LM report on CPU decode speed and max-token allocation](https://github.com/google-ai-edge/LiteRT-LM/issues/2568)
- [Gemma 3 270M model card](https://huggingface.co/litert-community/gemma-3-270m-it)
- [Gemma Terms of Use](https://ai.google.dev/gemma/terms)
