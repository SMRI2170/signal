# SIGNAL Android Beta

## Install

1. Download `androidApp-release.apk` from the GitHub Release.
2. Allow installs from the browser or file manager that downloaded the APK.
3. Open the APK and install it. For an existing SIGNAL beta, install the newer APK over the current app to keep its local session.

The APK is signed with SIGNAL's stable beta upload key. Android only accepts an in-place update when the APK has the same signing key and a higher version code.

## Included files

- `androidApp-release.apk`: universal, minified Android APK.
- `androidApp-release.aab`: Android App Bundle for store workflows.
- `SHA256SUMS.txt`: SHA-256 checksums for the APK and AAB.

## Known constraints

- The beta requires an internet connection to validate Facts and analyze a SIGNAL score.
- Cloud save requires signing in. The local beta does not include a provider API key.
- Release version names come from the `android-vMAJOR.MINOR.PATCH` tag. The Actions run number supplies the monotonically increasing Android version code.
- This release channel distributes the APK directly. It is not a Play Store release and does not include Play Integrity or Play-managed app signing.

## Device acceptance before wider distribution

- Install the signed APK on a low-cost Android phone and enable gesture navigation.
- Upgrade over the previous signed Beta APK; confirm the package updates in place and keeps the login session.
- With a dedicated Beta test account and synthetic Facts, run Landing → Result → Save, force-stop the app, reopen the saved cartridge, and confirm its Facts and latest score return.
- Capture a real-device cold-start and Result-flow Macrobenchmark artifact using the `android-physical` runner.
- If a crash is observed, inspect only the app process log and confirm Fact text is absent. The automated forced-crash smoke uses synthetic text on an emulator and is not a substitute for this release-device check.
