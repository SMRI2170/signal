import Link from "next/link";

import { MagicLinkForm } from "@/components/magic-link-form";
import { Sticker } from "@/components/sticker";

export default function AuthPage() {
  return (
    <main className="page-shell page-shell-compact auth-shell">
      <nav aria-label="認証ナビゲーション" className="site-nav y2k-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link className="back-link" href="/analyze">× CLOSE</Link>
      </nav>
      <section aria-labelledby="auth-title" className="auth-card">
        <Sticker className="auth-sticker" rotate={-10} size="md" type="heart" />
        <p className="sticker-label">SAVE YOUR SIGNAL</p>
        <h1 id="auth-title">結果を、<br />あとで見返そう。</h1>
        <p>メールのリンクでログイン。パスワードは必要ありません。</p>
        <MagicLinkForm />
      </section>
    </main>
  );
}
