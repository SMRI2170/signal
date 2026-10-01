import Link from "next/link";

import { FactInput } from "@/components/fact-input";
import { Sticker } from "@/components/sticker";

export default function AnalyzePage() {
  return (
    <main className="page-shell page-shell-compact analyze-shell">
      <nav aria-label="分析ナビゲーション" className="site-nav y2k-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link className="back-link" href="/">× CLOSE</Link>
      </nav>

      <section className="input-heading" aria-labelledby="fact-title">
        <Sticker className="analyze-sticker analyze-heart" rotate={-12} size="md" type="heart" />
        <Sticker className="analyze-sticker analyze-star" rotate={9} size="sm" type="star" />
        <p className="sticker-label">♡ WHAT HAPPENED? ★</p>
        <h1 id="fact-title">最近あったこと、<br />そのまま教えて。</h1>
        <p>気持ちや推測じゃなくて、相手の発言・行動・回数を入力してね。</p>
      </section>

      <FactInput />

      <aside className="fact-tip" aria-label="入力のヒント">
        <span className="fact-tip-label">★ REALITY CHECK ★</span>
        <p>「最近冷たい」じゃなくて、「今週は3日返信がなかった」みたいに書くと、もっと正確に見えるよ。</p>
      </aside>
    </main>
  );
}
