import Link from "next/link";
import { notFound } from "next/navigation";

import { Sticker } from "@/components/sticker";
import { createClient } from "@/lib/supabase/server";

export default async function RelationshipPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("relationships")
    .select("id, display_name, facts(text_original, created_at), analysis_snapshots(romantic_interest, desire_to_meet, initiative, evidence_sufficiency, created_at)")
    .eq("id", relationshipId)
    .maybeSingle();
  if (!data) notFound();

  const snapshots = [...data.analysis_snapshots].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const current = snapshots[0];
  const previous = snapshots[1];
  const delta = current && previous ? current.romantic_interest - previous.romantic_interest : null;
  const recentFacts = [...data.facts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);
  const metrics = [
    { label: "会いたいサイン", value: current?.desire_to_meet },
    { label: "相手からの積極性", value: current?.initiative },
    { label: "判断材料", value: current?.evidence_sufficiency },
  ];

  return (
    <main className="page-shell page-shell-compact product-shell detail-shell">
      <nav aria-label="詳細ナビゲーション" className="site-nav y2k-nav product-nav">
        <Link className="wordmark" href="/home">SIGNAL</Link>
        <Link className="back-link back-link-chip" href="/home">← DESK</Link>
      </nav>
      <header className="home-heading detail-heading">
        <Sticker className="detail-heading-sticker" rotate={-11} size="md" type="butterfly" />
        <p className="sticker-label">SIGNAL BOARD</p>
        <h1>{data.display_name}</h1>
        <p>記録したFactから見える、今のSIGNAL。</p>
      </header>
      <section aria-labelledby="signal-level-title" className="detail-card signal-board-card love-os-board">
        <div className="signal-board-topline">
          <p id="signal-level-title">SIGNAL LEVEL</p>
          <span className="snapshot-stamp">CURRENT</span>
        </div>
        <div className="signal-board-score-row">
          <strong>{current?.romantic_interest ?? "--"}<small>/ 100</small></strong>
          <p className={`score-change ${delta !== null && delta < 0 ? "score-change-down" : ""}`}>
            {delta === null ? "FIRST\nSIGNAL" : `${delta >= 0 ? "↑ +" : "↓ "}${Math.abs(delta)}`}<span>{delta === null ? "最初の記録" : "前回比"}</span>
          </p>
        </div>
        <p className="score-board-note">確率ではなく、入力された事実から算出したSIGNALスコアです。</p>
        <dl className="signal-metric-list">
          {metrics.map((metric, index) => (
            <div key={metric.label}>
              <dt><span>{String(index + 1).padStart(2, "0")}</span>{metric.label}</dt>
              <dd>
                <span aria-hidden="true" className="metric-track"><i style={{ width: `${metric.value ?? 0}%` }} /></span>
                <strong>{metric.value ?? "--"}</strong>
              </dd>
            </div>
          ))}
        </dl>
        <div className="detail-actions">
          <Link className="button button-primary" href={`/relationships/${relationshipId}/facts/new`}>新しいFactを追加 <span aria-hidden="true">+</span></Link>
          <Link className="history-link" href={`/relationships/${relationshipId}/history`}>SIGNALの変化を見る <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <section aria-labelledby="recent-facts-title" className="facts-card recent-facts-card">
        <div className="facts-heading-row">
          <div><p className="sticker-label">RECENT FACTS</p><h2 id="recent-facts-title">いまのSIGNALをつくる、<br />最近の出来事。</h2></div>
          <Sticker rotate={8} size="sm" type="heart" />
        </div>
        {recentFacts.length === 0 ? <p className="facts-empty">まだFactがありません。</p> : <ol className="fact-ticket-list">
          {recentFacts.map((fact, index) => <li key={fact.created_at}><span>FACT {String(recentFacts.length - index).padStart(2, "0")}</span><p>{fact.text_original}</p></li>)}
        </ol>}
      </section>
    </main>
  );
}
