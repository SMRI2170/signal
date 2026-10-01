import Link from "next/link";

const steps = [
  ["01", "事実を記録", "実際に起きた出来事だけを入力します。"],
  ["02", "AIが評価", "入力された事実を、同じ基準で評価します。"],
  ["03", "変化を見る", "新しい出来事で、関係性の変化を追えます。"],
] as const;

export default function HomePage() {
  return (
    <main className="page-shell">
      <nav aria-label="メインナビゲーション" className="site-nav">
        <span className="wordmark">SIGNAL</span>
        <span className="nav-note">RELATIONSHIP ANALYTICS</span>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">FOR THE EARLY STAGE OF DATING</p>
        <h1 id="hero-title">気持ちではなく、<br />起きたことを記録する。</h1>
        <p className="hero-copy">
          相手との間で実際に起きた出来事から、
          <br />
          関係性の変化を分析します。
        </p>
        <Link className="button button-primary" href="/analyze">
          分析してみる
          <span aria-hidden="true">→</span>
        </Link>
        <p className="hero-meta">マッチングアプリで出会った、交際前の関係を記録するために。</p>
      </section>

      <section aria-labelledby="how-it-works" className="steps-section">
        <p className="section-label" id="how-it-works">HOW IT WORKS</p>
        <ol className="steps-list">
          {steps.map(([number, title, description]) => (
            <li className="step-card" key={number}>
              <span className="step-number">{number}</span>
              <h2>{title}</h2>
              <p>{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <p className="disclaimer">
        SIGNALは相手の実際の感情を特定するものではありません。入力された出来事をAIが評価した結果を表示します。
      </p>
    </main>
  );
}
