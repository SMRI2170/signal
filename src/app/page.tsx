import Link from "next/link";

import { Sticker } from "@/components/sticker";

const exampleFacts = ["次のデートに誘われた", "相手からLINEが来た", "帰宅後にまた連絡があった"];

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="y2k-hero" aria-labelledby="hero-title">
        <nav aria-label="メインナビゲーション" className="site-nav y2k-nav">
          <span className="wordmark">SIGNAL</span>
          <span className="beta-badge">BETA ♡</span>
        </nav>
        <Sticker className="hero-sticker hero-butterfly" rotate={-16} size="xl" type="butterfly" />
        <Sticker className="hero-sticker hero-heart" rotate={12} size="lg" type="heart" />
        <Sticker className="hero-sticker hero-star" rotate={-9} size="md" type="star" />
        <Sticker className="hero-sticker hero-smiley" rotate={9} size="lg" type="smiley" />
        <Sticker className="hero-sticker hero-sparkle" rotate={13} size="sm" type="sparkle" />
        <div className="hero-copy-wrap">
          <div aria-hidden="true" className="hero-os-status"><span>CRUSH.SYS</span><i /><span>FACT MODE: ON</span></div>
          <p className="hero-kicker">REALITY CHECK FOR YOUR CRUSH</p>
          <p className="hero-logo">SIGNAL</p>
          <h1 id="hero-title">彼って、<br /><span>脈あり？</span></h1>
          <p className="hero-subtitle">起きたことだけ、教えて。</p>
          <p className="hero-explanation">「いい感じだった」じゃなく、起きたことだけ。<br />相手の行動を記録して、恋のSIGNALを数字で追おう。</p>
          <Link className="y2k-button hero-button" href="/analyze">CHECK IT <span aria-hidden="true">↗</span></Link>
          <p className="hero-context">マッチングアプリで出会った、交際前の関係を記録するために。</p>
        </div>
      </section>

      <section className="fact-vs-guess-section" aria-labelledby="what-title">
        <Sticker className="section-sticker" rotate={-10} size="md" type="flower" />
        <p className="sticker-label">NO OVERTHINKING</p>
        <h2 id="what-title">解釈じゃなく、<br />事実だけ。</h2>
        <p className="fact-vs-intro">SIGNALは「なんとなく」を判定しません。相手がしたこと、言ったことだけを記録します。</p>
        <div className="comparison-grid">
          <div className="comparison-card comparison-guess">
            <p>× GUESSING</p>
            <span>「なんとなく冷たい」</span>
            <span>「いい感じだった気がする」</span>
          </div>
          <div className="comparison-card comparison-fact">
            <p>○ FACT ONLY</p>
            <span>「相手から次の予定を聞かれた」</span>
            <span>「帰宅後、相手からLINEが来た」</span>
          </div>
        </div>
      </section>

      <section className="demo-section y2k-dots" aria-labelledby="demo-title">
        <div className="section-heading-row">
          <p className="sticker-label">♡ WHAT HAPPENED? ★</p>
          <Sticker rotate={8} size="sm" type="heart" />
        </div>
        <h2 id="demo-title">事実を、ぽんっと入力。</h2>
        <div className="demo-input-stack">
          {exampleFacts.map((fact, index) => <div className="demo-input" key={fact}><span>FACT 0{index + 1}</span>{fact}</div>)}
        </div>
        <Link className="y2k-button y2k-button-yellow" href="/analyze">JUDGE IT <span aria-hidden="true">♥</span></Link>
      </section>

      <section className="preview-section" aria-labelledby="preview-title">
        <Sticker className="preview-sticker" rotate={-13} size="lg" type="lightning" />
        <p className="sticker-label">SIGNAL LEVEL</p>
        <h2 id="preview-title">恋のSIGNALを、<br />数字で見よう。</h2>
        <div className="score-preview-card">
          <span className="good-signal-pill">★ GOOD SIGNAL ★</span>
          <p>SIGNAL LEVEL</p>
          <output>73<small>/ 100</small></output>
          <div aria-label="5段階中4つのハート" className="heart-meter">♥ ♥ ♥ ♥ <span>♡</span></div>
          <strong>↑ +11</strong>
          <span className="score-note">前回の分析から上がった</span>
          <dl className="score-breakdown">
            <div><dt>会いたいサイン</dt><dd>81</dd></div>
            <div><dt>相手からの積極性</dt><dd>68</dd></div>
            <div><dt>判断材料</dt><dd>57</dd></div>
          </dl>
          <span className="score-description">これは確率ではなく、入力した事実から見えるSIGNALスコアです。</span>
        </div>
      </section>

      <section className="history-section" aria-labelledby="history-title">
        <div className="section-heading-row">
          <p className="sticker-label">YOUR SIGNAL HISTORY</p>
          <Sticker rotate={14} size="md" type="checker" />
        </div>
        <h2 id="history-title">恋のSIGNALは、<br />1回じゃ分からない。</h2>
        <p className="history-intro">デートやLINEで何かあったら、事実を追加。SIGNALがどう変わったか、記録していきます。</p>
        <div className="history-card">
          <svg aria-label="Signalが上昇する履歴グラフ" className="history-graph" role="img" viewBox="0 0 320 130"><path d="M12 111H308M12 71H308M12 31H308" /><polyline points="15,100 87,81 159,87 231,52 305,26" /><circle cx="15" cy="100" r="5" /><circle cx="87" cy="81" r="5" /><circle cx="159" cy="87" r="5" /><circle cx="231" cy="52" r="5" /><circle cx="305" cy="26" r="7" /></svg>
          <ol className="history-points">
            <li><span>9/21</span><strong>38</strong></li>
            <li><span>9/24</span><strong>42</strong></li>
            <li><span>9/28</span><strong>41</strong></li>
            <li><span>10/1</span><strong>54</strong></li>
            <li className="history-current"><span>10/5</span><strong>73 ↑</strong></li>
          </ol>
        </div>
      </section>

      <section className="final-cta y2k-dots" aria-labelledby="cta-title">
        <Sticker className="cta-sticker cta-left" rotate={-12} size="lg" type="butterfly" />
        <Sticker className="cta-sticker cta-right" rotate={9} size="lg" type="smiley" />
        <p className="sticker-label">FACT ONLY. NO OVERTHINKING.</p>
        <h2 id="cta-title">気になるなら、<br />まず見てみよ？</h2>
        <Link className="y2k-button y2k-button-pink" href="/analyze">CHECK MY SIGNAL <span aria-hidden="true">↗</span></Link>
      </section>

      <p className="landing-disclaimer">SIGNALは相手の実際の感情を特定するものではありません。入力された出来事を評価した結果を表示します。</p>
    </main>
  );
}
