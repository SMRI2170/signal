# SIGNAL

相手との間で起きた出来事を記録し、関係性の変化を数値で確認するWebアプリです。恋愛相談チャットではなく、観測可能なFactをAI Judgeが一貫した基準で評価します。

プロダクト仕様は [SPEC.md](./SPEC.md) をSource of Truthとします。

## Tech Stack

- Next.js App Router / React / TypeScript
- Tailwind CSS
- Supabase（Auth・PostgreSQL・RLS、後続Issueで接続）
- Jev API（JudgeProvider経由、後続Issueで接続）

## Local Development

Node.js 22以上とnpmが必要です。

```bash
npm install
cp .env.example .env.local
npm run dev
```

`http://localhost:3000` を開きます。現時点では外部サービスの接続前なので、`.env.local`は空のままでもUIを確認できます。

## Quality Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

GitHub Actionsでも、`main`へのpushとPull Requestごとに同じチェックを実行します。

## Environment Variables

`.env.example`を参照してください。

- `NEXT_PUBLIC_*` はブラウザへ公開される値だけに限定します。
- `SUPABASE_SECRET_KEY` と `JEV_API_KEY` はServer専用です。リポジトリへコミットしないでください。
