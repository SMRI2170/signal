import Link from "next/link";

import { MagicLinkForm } from "@/components/magic-link-form";
import { Sticker } from "@/components/sticker";

const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

export default function AuthPage() {
  if (isStaticDemo) return <StaticDemoAuth />;

  return (
    <main className="page-shell page-shell-compact auth-shell">
      <nav aria-label="認証ナビゲーション" className="site-nav y2k-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link className="back-link" href="/analyze">× CLOSE</Link>
      </nav>
      <section aria-labelledby="auth-title" className="auth-card">
        <Sticker className="auth-sticker" rotate={-10} size="md" type="heart" />
        <p className="sticker-label">SAVE YOUR THREAD</p>
        <h1 id="auth-title">結果を、<br />あとで見返そう。</h1>
        <p>メールのリンクでログイン。パスワードは必要ありません。次の出来事と、今日のSIGNALを比べられます。</p>
        <p className="auth-privacy-copy">PRIVATE BY DEFAULT — 本名は不要。記録はあなた以外には表示されません。</p>
        <MagicLinkForm />
      </section>
    </main>
  );
}

function StaticDemoAuth() {
  return (
    <main className="page-shell page-shell-compact auth-shell">
      <nav aria-label="公開デモナビゲーション" className="site-nav y2k-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link className="back-link" href="/analyze">× CLOSE</Link>
      </nav>
      <section aria-labelledby="demo-auth-title" className="auth-card">
        <Sticker className="auth-sticker" rotate={-10} size="md" type="heart" />
        <p className="sticker-label">PUBLIC DEMO</p>
        <h1 id="demo-auth-title">この公開版は、<br />保存しません。</h1>
        <p>ここではログイン不要で、FactからSIGNALを試せます。</p>
        <p className="auth-privacy-copy">本番版では、記録名もFactもあなた以外には表示されません。</p>
        <Link className="button button-primary" href="/analyze">デモを試す <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
