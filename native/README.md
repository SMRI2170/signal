# SIGNAL Native

Kotlin Multiplatform / Compose MultiplatformによるiOS・Android向けアプリです。

- `composeApp/src/commonMain`: Fact入力、判定、Scanner、Historyを共有するUIとドメインロジック
- `composeApp/src/commonMain/kotlin/com/signal/app/ui`: Android / iOS共通のY2K theme、material、sticker、component
- `androidApp`: Androidの起動・OS設定
- `iosMain`: iOSアプリから埋め込む`MainViewController`

デザイン方針は[`../docs/native-y2k-design-system.md`](../docs/native-y2k-design-system.md)、共通素材の検証方法は[`docs/y2k-foundation-verification.md`](docs/y2k-foundation-verification.md)を参照してください。Android Studioでは`Y2kComponentCatalog.kt`から360 / 390 / 430dpのPreviewを確認できます。

このアプリはAI providerのsecret keyを保持しません。通常のビルドは公開済みのSupabase Edge Functionへ接続し、TypeSafe AI / Jevのキーはサーバー側のSecretsだけで管理します。`SIGNAL_API_BASE_URL`が空の場合は設定エラーを表示して判定を止めます。ローカル判定の`LocalJudgeGateway`はPreview・unit testから明示的に注入する場合と、`SIGNAL_BENCHMARK_MODE=true`の専用テストビルドでのみ使用します。TypeSafe AI / Jevのキーをネイティブアプリへ入れてはいけません。

AndroidはGradle propertyまたはenvironment variableから公開API URLだけを注入します。

```bash
./gradlew :androidApp:assembleDebug

# 別環境へ向ける場合だけ上書き
SIGNAL_API_BASE_URL=https://your-signal-api.example ./gradlew :androidApp:assembleDebug
```

iOSはXcode build settingからInfo.plistへ公開API URLだけを渡します。

```bash
xcodebuild -project SIGNAL.xcodeproj -scheme SIGNAL build

# 別環境へ向ける場合だけ上書き
xcodebuild -project SIGNAL.xcodeproj -scheme SIGNAL SIGNAL_API_BASE_URL=https://your-signal-api.example build
```

公開APIをKtor Darwin経由で確認するiOS E2Eは、通常のCIでは外部通信を行いません。必要なときだけ次のように有効化します。

```bash
SIMCTL_CHILD_SIGNAL_LIVE_E2E=1 \
SIMCTL_CHILD_SIGNAL_API_BASE_URL=https://deufcadognkhymqxrejo.supabase.co/functions/v1/signal-api \
./gradlew :composeApp:iosSimulatorArm64Test --rerun-tasks
```

URLが空のまま実行すると設定エラーになります。PreviewとオフラインのUI開発では`SignalApp`へ`LocalJudgeGateway`を明示的に注入してください。

## Build

Android SDKを設定したmacOSで実行します。

```bash
cd native
./gradlew :composeApp:testAndroidHostTest
./gradlew :androidApp:assembleDebug
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

Android APKは`androidApp/build/outputs/apk/debug/androidApp-debug.apk`に出力されます。iOSは`MainViewController()`をXcodeプロジェクトのroot viewへ接続します。

## Android Beta Release

`androidApp`の安定したapplication IDは`com.signal.app`です。配布開始後に変更すると既存Betaへ上書き更新できなくなるため、変更時は移行方針を決めてください。既定のversionは`0.1.0` / version code `1`で、ローカル確認時は`SIGNAL_ANDROID_VERSION_NAME`と`SIGNAL_ANDROID_VERSION_CODE`で上書きできます。

Release buildはR8とresource shrinkingを有効にしています。GitHub Actionsのrelease workflowは`android-vMAJOR.MINOR.PATCH`形式のtagで起動し、version codeにはworkflow run numberを使います。署名にはrepository Actions Secretsを使います。

- `ANDROID_RELEASE_KEYSTORE_BASE64`: Base64化したJKS keystore
- `ANDROID_RELEASE_STORE_PASSWORD`: keystore password
- `ANDROID_RELEASE_KEY_ALIAS`: signing key alias
- `ANDROID_RELEASE_KEY_PASSWORD`: signing key password

Keystoreとpasswordはrepositoryへcommitしないでください。Keystoreは安全な保管先にもバックアップしてください。Secretsが揃わない状態でrelease tagをpushするとworkflowはAPKを公開せずに停止します。成功するとuniversal APK、AAB、`SHA256SUMS.txt`、install手順をGitHub Releaseへ添付します。

ローカルでR8適用後のAPKを確認する場合は次を実行できます。Release signing secretsがないローカル/CI buildはdebug証明書で署名し、配布には使えません。GitHub Release workflowだけがSecretsのrelease keyで署名します。

```bash
./gradlew :androidApp:assembleRelease
```

Performance checksは専用`:macrobenchmark` moduleでBaseline Profileを生成します。Facts入力からResult表示までのviewport smokeは`:androidApp`のinstrumentation testで実行します。テスト実行時だけ`-PSIGNAL_BENCHMARK_MODE=true`を渡すと、Judgeを`LocalJudgeGateway`へ切り替え、cloud account storageも無効にします。テストで実アカウントのデータや外部APIを使いません。通常のdebug/release buildはServer APIとaccount storageを使用します。接続済みAndroid emulatorでprofileとviewport smokeを実行できます:

```bash
./gradlew :androidApp:generateReleaseBaselineProfile --rerun-tasks -PSIGNAL_BENCHMARK_MODE=true
./gradlew :androidApp:connectedDebugAndroidTest --rerun-tasks \
  -PSIGNAL_BENCHMARK_MODE=true \
  -Pandroid.testInstrumentationRunnerArguments.class=com.signal.smoke.SignalUiSmokeTest
```

MacrobenchmarkはAndroidライブラリがemulatorを不正確な性能測定環境として拒否するため、GitHub Actionsの性能測定jobは物理Android 14+端末を接続した`self-hosted`, `linux`, `android-physical` runnerでのみ実行します。`workflow_dispatch`で`run_physical_benchmark`を選ぶとcold startup / Result flowの計測とBaseline Profileをartifactに保存します。通常のGitHub-hosted emulator jobはProfile生成と360dp・430dp相当のLanding → Result UI smokeを実行します。

Release前には低価格の実Android端末へ署名済みAPKをインストールし、上書き更新・gesture navigation・クラッシュ時にFact本文がログへ出ないことを確認してください。

## iOS Simulator

先にFrameworkを生成してから、Xcodeプロジェクトを生成します。

```bash
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
cd iosApp
xcodegen generate
xcodebuild -project SIGNAL.xcodeproj -scheme SIGNAL -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' build
```

`iosApp/Sources/SignalNativeApp.swift`はSwiftUIの薄いOSシェルだけを持ち、画面そのものは共有のCompose Multiplatform UIです。

`CADisableMinimumFrameDurationOnPhone`はCompose Multiplatform iOSの必須設定として、`iosApp/Sources/Info.plist`へ追加済みです。
