import Link from "next/link";
import { notFound } from "next/navigation";

import { Sticker } from "@/components/sticker";
import { createClient } from "@/lib/supabase/server";

type HistorySnapshot = { romantic_interest: number; created_at: string };
type HistoryFact = { text_original: string; created_at: string };

const dateFormatter = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" });

export default async function HistoryPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  const db = await createClient();
  const { data } = await db
    .from("relationships")
    .select("display_name, facts(text_original, created_at), analysis_snapshots(romantic_interest, created_at)")
    .eq("id", relationshipId)
    .maybeSingle();
  if (!data) notFound();

  const points = [...(data.analysis_snapshots as HistorySnapshot[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const facts = [...(data.facts as HistoryFact[])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const chartPoints = points.map((point, index) => {
    const x = points.length === 1 ? 160 : 18 + (284 * index) / (points.length - 1);
    const y = 128 - (point.romantic_interest / 100) * 100;
    return { ...point, x, y };
  });

  return (
    <main className="page-shell page-shell-compact product-shell history-screen">
      <nav aria-label="履歴ナビゲーション" className="site-nav y2k-nav product-nav">
        <Link className="wordmark" href={`/relationships/${relationshipId}`}>SIGNAL</Link>
        <Link className="back-link back-link-chip" href={`/relationships/${relationshipId}`}>← BOARD</Link>
      </nav>
      <header className="home-heading history-heading">
        <Sticker className="history-heading-sticker" rotate={11} size="sm" type="checker" />
        <p className="sticker-label">SIGNAL TAPE</p>
        <h1>{data.display_name}の<br /><span>変化。</span></h1>
        <p>1回の結果ではなく、出来事が積み重なった流れを見よう。</p>
      </header>
      {points.length === 0 ? <section className="empty-card"><p className="sticker-label">NO HISTORY YET</p><h2>次のFactで、<br />変化が残ります。</h2><Link className="button button-primary" href={`/relationships/${relationshipId}/facts/new`}>Factを追加する <span aria-hidden="true">→</span></Link></section> : <>
        <figure className="signal-tape-chart love-os-tape material-gel-panel" aria-labelledby="history-chart-caption">
          <figcaption id="history-chart-caption"><span>SIGNAL LEVEL</span><strong>{points.at(-1)?.romantic_interest}<small>/ 100</small></strong></figcaption>
          <svg aria-label="時系列のSIGNAL LEVEL" role="img" viewBox="0 0 320 154">
            <title>SIGNAL LEVELの履歴グラフ</title>
            <path className="history-grid-line" d="M18 28H302M18 78H302M18 128H302" />
            {chartPoints.length > 1 ? <polyline className="history-line" points={chartPoints.map((point) => `${point.x},${point.y}`).join(" ")} /> : null}
            {chartPoints.map((point, index) => <circle className={index === chartPoints.length - 1 ? "history-dot history-dot-current" : "history-dot"} cx={point.x} cy={point.y} key={point.created_at} r={index === chartPoints.length - 1 ? 7 : 5} />)}
          </svg>
          <div className="chart-endpoints"><span>{dateFormatter.format(new Date(points[0].created_at))}</span><span>NOW</span></div>
        </figure>
        <section aria-labelledby="timeline-title" className="history-timeline-section">
          <div className="facts-heading-row"><div><p className="sticker-label">READ THE TAPE</p><h2 id="timeline-title">いつ、何が<br />変わった？</h2></div><Sticker rotate={-8} size="sm" type="sparkle" /></div>
          <ol className="signal-timeline-list">
            {[...points].reverse().map((point, reversedIndex) => {
              const index = points.length - reversedIndex - 1;
              const previous = points[index - 1];
              const delta = previous ? point.romantic_interest - previous.romantic_interest : null;
              const factsAtPoint = facts.filter((fact) => fact.created_at <= point.created_at);
              return <li className={index === points.length - 1 ? "timeline-current" : ""} key={point.created_at}>
                <details open={index === points.length - 1}>
                  <summary>
                    <time dateTime={point.created_at}>{dateFormatter.format(new Date(point.created_at))}</time>
                    <strong>{point.romantic_interest}<small>/100</small></strong>
                    <span className={`timeline-delta ${delta !== null && delta < 0 ? "timeline-delta-down" : ""}`}>{delta === null ? "FIRST" : `${delta >= 0 ? "↑ +" : "↓ "}${Math.abs(delta)}`}</span>
                  </summary>
                  <div className="timeline-evidence">
                    <p>この時点までのFact <strong>{factsAtPoint.length}件</strong></p>
                    <ul>{factsAtPoint.slice(-3).reverse().map((fact) => <li key={fact.created_at}>{fact.text_original}</li>)}</ul>
                  </div>
                </details>
              </li>;
            })}
          </ol>
        </section>
      </>}
    </main>
  );
}
