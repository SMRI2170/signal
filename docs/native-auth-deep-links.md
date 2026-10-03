# SIGNAL Native Auth / Deep Link運用手順

## 現在の認証コールバック

SIGNALのMagic LinkとGoogle OAuthはPKCEを使用し、認証後に次のURLへ戻ります。

```text
com.signal.app://login-callback
```

Supabase DashboardのAuthentication > URL Configurationには同じURLをAdditional Redirect URLsとして登録します。アクセストークンをURLへ含めるImplicit flowは使いません。

### Androidでの確認

`AndroidManifest.xml`のBROWSABLE intent filterと`singleTask` Activityにより、起動中・コールドスタートの両方を`MainActivity.onNewIntent` / `onCreate`へ渡します。

```bash
adb shell am start -W \
  -a android.intent.action.VIEW \
  -d 'com.signal.app://login-callback?code=invalid-test-code' \
  com.signal.app
```

無効なテストcodeでは「リンクの有効期限が切れています」と表示され、入力済みFactが残ることを確認します。実際のMagic Linkでは認証後に自動保存されます。

### iOS Simulatorでの確認

`Info.plist`の`CFBundleURLTypes`とSwiftUIの`onOpenURL`から共通Kotlin層へURLを渡します。

```bash
xcrun simctl openurl booted 'com.signal.app://login-callback?code=invalid-test-code'
```

Androidと同様に、無効codeの復旧表示とFact保持を確認します。

## Android App Linksを本番ドメインで検証する

本番ドメイン決定後はcustom schemeに加え、HTTPS App Linksを設定します。

1. Manifestへ`android:autoVerify="true"`のHTTPS intent filterを追加し、callbackのhost/pathを限定する。
2. `https://<domain>/.well-known/assetlinks.json`へ`com.signal.app`と本番署名証明書のSHA-256 fingerprintを配置する。
3. HTTPS・リダイレクトなし・`application/json`で配信されることを`curl -I`で確認する。
4. 本番署名APKをインストールして次を実行する。

```bash
adb shell pm verify-app-links --re-verify com.signal.app
adb shell pm get-app-links com.signal.app
adb shell am start -W -a android.intent.action.VIEW \
  -d 'https://<domain>/auth/callback?code=invalid-test-code'
```

`verified`となり、ブラウザ選択を出さずSIGNALが開くことを確認します。debug署名と本番署名のfingerprintは別物なので、配布用APKで最終確認します。

## iOS Universal Linksを本番ドメインで検証する

1. Apple DeveloperでAssociated Domains entitlementを有効化し、Xcodeへ`applinks:<domain>`を追加する。
2. `https://<domain>/.well-known/apple-app-site-association`へ実Team IDと`com.signal.app`を設定する。
3. 拡張子なし、HTTPS、リダイレクトなし、`application/json`で配信する。
4. 実Teamで署名したアプリを端末へ入れ、メールまたはNotes内のリンクをタップする。Simulatorの補助確認は次で行う。

```bash
xcrun simctl openurl booted 'https://<domain>/auth/callback?code=invalid-test-code'
```

最終判定は実機で行い、アプリが直接開くこと、コールドスタートでもcallbackを処理すること、キャンセル・期限切れ時にFactが消えないことを確認します。

## セキュリティとデータ保持

- AndroidはAndroid KeystoreのAES/GCM鍵で暗号化したsession・PKCE verifier・未保存draftを保持します。
- iOSはKeychainへ同じ情報を保持します。
- ログアウト時はsession、最後のRelationship ID、未保存draftを削除し、画面上のRelationshipも破棄します。
- Secret keyとTypeSafe API keyは端末へ含めません。Supabase publishable keyだけをアプリへ含めます。
- 保存対象はFact、SIGNALスコア、記録名です。UI上で保存前に日本語で明示します。
