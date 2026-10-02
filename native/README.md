# SIGNAL Native

Kotlin Multiplatform / Compose MultiplatformによるiOS・Android向けアプリです。

- `composeApp/src/commonMain`: Fact入力、判定、Scanner、Historyを共有するUIとドメインロジック
- `composeApp/src/commonMain/kotlin/com/signal/app/ui`: Android / iOS共通のY2K theme、material、sticker、component
- `androidApp`: Androidの起動・OS設定
- `iosMain`: iOSアプリから埋め込む`MainViewController`

デザイン方針は[`../docs/native-y2k-design-system.md`](../docs/native-y2k-design-system.md)、共通素材の検証方法は[`docs/y2k-foundation-verification.md`](docs/y2k-foundation-verification.md)を参照してください。Android Studioでは`Y2kComponentCatalog.kt`から360 / 390 / 430dpのPreviewを確認できます。

このアプリは、APIキーを保持しません。`SIGNAL_API_BASE_URL`が空の場合はPreview・開発用の`LocalJudgeGateway`、設定されている場合はKtorの`ServerJudgeGateway`を使用します。TypeSafe AI / Jevのキーをネイティブアプリへ入れてはいけません。

AndroidはGradle propertyまたはenvironment variableから公開API URLだけを注入します。

```bash
SIGNAL_API_BASE_URL=https://your-signal-api.example ./gradlew :androidApp:assembleDebug
```

iOSはXcode build settingからInfo.plistへ公開API URLだけを渡します。

```bash
xcodebuild -project SIGNAL.xcodeproj -scheme SIGNAL SIGNAL_API_BASE_URL=https://your-signal-api.example build
```

どちらも値が空ならLocal gatewayへ戻るため、PreviewとオフラインのUI開発は継続できます。

## Build

Android SDKを設定したmacOSで実行します。

```bash
cd native
./gradlew :composeApp:testAndroidHostTest
./gradlew :androidApp:assembleDebug
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

Android APKは`androidApp/build/outputs/apk/debug/androidApp-debug.apk`に出力されます。iOSは`MainViewController()`をXcodeプロジェクトのroot viewへ接続します。

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
