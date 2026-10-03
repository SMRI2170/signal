# Android beta release

Android betaはGitHub ReleaseからAPKを配布します。Play Store公開ではありません。

## 署名鍵

アプリ更新を同じインストールへ配布するには、初回リリースで使った署名鍵を以後も保持する必要があります。鍵ファイルとパスワードはパスワードマネージャー等に安全にバックアップしてください。鍵やパスワードをリポジトリ、Issue、チャット、Actions logへ貼り付けないでください。

リポジトリの **Settings → Secrets and variables → Actions** で、次のRepository secretsを作成します。

| Secret name | 値 |
| --- | --- |
| `SIGNAL_ANDROID_KEYSTORE_BASE64` | リリース用JKS keystoreのBase64表現 |
| `SIGNAL_ANDROID_KEYSTORE_PASSWORD` | keystoreのパスワード |
| `SIGNAL_ANDROID_KEY_ALIAS` | 署名鍵のalias |
| `SIGNAL_ANDROID_KEY_PASSWORD` | aliasのパスワード |

Base64値はローカルで生成し、クリップボードやターミナル出力の扱いにも注意してください。macOSでは例えば `base64 -i signal-release.jks | pbcopy` を使えます。値をGitHub secretへ登録した後、クリップボードを消してください。

## リリース手順

1. 署名鍵4項目を登録し、GitHub Actionsの **Native Android checks** を手動実行して `Android release performance` が完了することを確認します。
2. `android-v0.2.0-beta.1` のようなsemver形式のタグを作成してpushします。
3. `Publish signed Android beta` が完了したら、GitHub ReleasesからAPKと`SHA256SUMS.txt`を取得します。
4. Android端末でAPKを開いてインストールします。初回のみ、ブラウザ等からのアプリインストールを許可する操作が必要な場合があります。

タグのバージョンが`versionName`になります。`versionCode`は現在のbeta設定値より大きくなるようGitHub Actionsのworkflow run番号から設定されます。既存インストールを更新する場合は、必ず同一署名鍵を使用してください。Actionsは署名の検証に失敗したAPK/AABを公開しません。

## 検証と制約

- PR / `main`: host tests、debug APK、minified release APK、release AABをビルドします。ここで生成されるrelease artifactは署名なしで、配布用ではありません。
- タグ / 手動実行: Android emulatorでcold startとSignal receiptのmacrobenchmarkを実行し、HTMLレポートと計測サマリーをActions artifactへ30日保存します。
- emulatorの性能値は仮想デバイス由来のため、実機の保証値ではありません。実機の低価格端末・360–430dp・ジェスチャーナビでの操作確認はbeta配布前後に別途必要です。
- Crash logやbenchmarkへユーザーのFact本文を出さないこと。betaでは個人を特定できる情報やセンシティブな内容を入力しないでください。
