# SIGNAL

相手との間で起きた出来事を記録し、関係性の変化を数値で確認するWebアプリです。恋愛相談チャットではなく、観測可能なFactをAI Judgeが一貫した基準で評価します。

プロダクト仕様は [SPEC.md](./SPEC.md) をSource of Truthとします。

## Public Demo

GitHub Pagesでは、サーバーAPIを使わない静的デモを公開します。Fact判定とスコアはブラウザ内のFake Judgeで実行され、入力内容は保存・送信されません。本番のSupabase / Jev連携版はCloudflareへデプロイします。

## Tech Stack

- Next.js App Router / React / TypeScript
- Tailwind CSS
- Kotlin Multiplatform / Compose Multiplatform（ネイティブiOS・Androidクライアントは[`native/`](./native)）
- Supabase（Auth・PostgreSQL・RLS、後続Issueで接続）
- TypeSafe AI / Jev（JudgeProvider経由）

## Local Development

Node.js 22以上とnpmが必要です。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000` を開きます。Supabaseを接続するまでは、`.env.local`を空のままでもUIを確認できます。

## Supabase（無料Beta用）

Relationship・Fact・分析履歴はSupabaseに保存します。ローカルで接続する場合は、次を行います。

1. Supabase Freeプロジェクトを作り、EmailのMagic Linkを有効にする。
2. AuthのRedirect URLに`http://localhost:3000/auth/callback`を追加する。本番環境を作る際は、その環境の`/auth/callback`も追加する。
3. Project URLとPublishable keyを`.env.local`の`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`へ設定する。
4. Secret keyは`SUPABASE_SECRET_KEY`としてサーバー環境だけへ設定する。チャット・Git・ブラウザには貼らない。
5. プロジェクトをCLIへリンクしてからMigrationを適用する。

```bash
supabase link --project-ref <project-ref>
supabase db push
```

`supabase/tests/signal_rls_test.sql`は、所有者以外がRelationship、Fact、Snapshotを読んだり変更したりできないことを検証します。DockerでローカルSupabaseを起動した状態では、次で実行できます。

```bash
supabase test db --local
```

## Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actionsでも、`main`へのpushとPull Requestごとに同じチェックを実行します。

## Native iOS / Android

`native/`は、同じCompose UIとFact判定ロジックを共有するKotlin Multiplatform版です。現在のWeb/PWAは集客・検証用として維持し、継続利用が見えた段階でネイティブ配布へ進められます。

```bash
cd native
./gradlew :composeApp:testAndroidHostTest
./gradlew :androidApp:assembleDebug
./gradlew :composeApp:linkDebugFrameworkIosSimulatorArm64
```

ネイティブアプリにAPIキーは置きません。`JudgeGateway`を、認証済みのSIGNALサーバーAPIへ接続する方式です。詳細は[`native/README.md`](./native/README.md)を参照してください。

## Environment Variables

`.env.example`を参照してください。

- `NEXT_PUBLIC_*` はブラウザへ公開される値だけに限定します。
- `SUPABASE_SECRET_KEY` と `TYPESAFE_API_KEY` はServer専用です。リポジトリへコミットしないでください。
