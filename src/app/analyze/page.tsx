import Link from "next/link";

import { FactInput } from "@/components/fact-input";

export default function AnalyzePage() {
  return (
    <main className="page-shell page-shell-compact">
      <nav aria-label="分析ナビゲーション" className="site-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link className="back-link" href="/">← 戻る</Link>
      </nav>

      <section className="input-heading" aria-labelledby="fact-title">
        <p className="eyebrow">FIRST ANALYSIS</p>
        <h1 id="fact-title">相手との間で実際に起きたことを入力してください。</h1>
        <p>気持ちや推測ではなく、相手の発言・行動・回数を記録します。</p>
      </section>

      <FactInput />

      <aside className="fact-tip" aria-label="入力のヒント">
        <span className="fact-tip-label">INPUT TIP</span>
        <p>「最近冷たい」ではなく、「今週は3日返信がなかった」のように書くと、より正確に評価できます。</p>
      </aside>
    </main>
  );
}
