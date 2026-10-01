import Link from "next/link";
import { redirect } from "next/navigation";

import { Sticker } from "@/components/sticker";
import { createClient } from "@/lib/supabase/server";

type Snapshot = { romantic_interest: number; created_at: string };
type Relationship = { id: string; display_name: string; updated_at: string; analysis_snapshots: Snapshot[] };
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

export default async function HomePage() {
  if (isStaticDemo) return <StaticDemoHome />;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");

  const { data } = await supabase
    .from("relationships")
    .select("id, display_name, updated_at, analysis_snapshots(romantic_interest, created_at)")
    .order("updated_at", { ascending: false });
  const relationships = (data ?? []) as Relationship[];

  return (
    <main className="page-shell page-shell-compact product-shell home-shell">
      <nav aria-label="ホームナビゲーション" className="site-nav y2k-nav product-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link aria-label="新しいSIGNALを記録する" className="nav-add-fact" href="/analyze">+ ADD</Link>
      </nav>
      <header className="home-heading home-heading-desk">
        <Sticker className="desk-heading-sticker" rotate={10} size="sm" type="sparkle" />
        <p className="sticker-label">SIGNAL DESK</p>
        <h1>今日の恋、<br /><span>どう動いた？</span></h1>
        <p>起きたことを足すたび、恋のSIGNALが更新されます。</p>
      </header>
      {relationships.length === 0 ? <section className="empty-card desk-empty-card"><Sticker rotate={-8} size="lg" type="heart" /><p className="sticker-label">NO SIGNAL YET</p><h2>まだ記録がないよ。</h2><p>最初のFactを追加して、恋の変化を見始めよう。</p><Link className="button button-primary" href="/analyze">最初のFactを記録する <span aria-hidden="true">→</span></Link></section> : <section className="relationship-list" aria-label="保存したRelationship">
        {relationships.map((relationship) => {
          const snapshots = [...relationship.analysis_snapshots].sort((a, b) => b.created_at.localeCompare(a.created_at));
          const current = snapshots[0]; const previous = snapshots[1]; const delta = current && previous ? current.romantic_interest - previous.romantic_interest : null;
          const movement = delta === null ? "FIRST SIGNAL" : delta > 0 ? "UP" : delta < 0 ? "DOWN" : "STAY";
          return (
            <Link className="relationship-card" href={`/relationships/${relationship.id}`} key={relationship.id}>
              <div className="relationship-card-top">
                <span className="relationship-card-label">RELATIONSHIP</span>
                <span className={`movement-stamp movement-${movement.toLowerCase().replace(" ", "-")}`}>
                  {delta === null ? movement : `${delta > 0 ? "↑" : delta < 0 ? "↓" : "→"} ${movement}`}
                </span>
              </div>
              <h2>{relationship.display_name}</h2>
              <div className="relationship-score-row">
                <div>
                  <span className="score-kicker">SIGNAL LEVEL</span>
                  <strong>{current?.romantic_interest ?? "--"}<small>/ 100</small></strong>
                </div>
                <span className="relationship-score-arrow" aria-hidden="true">↗</span>
              </div>
              <p className="relationship-card-footer">{delta === null ? "最初の記録を保存済み" : `前回から ${delta >= 0 ? "+" : ""}${delta} ポイント`}</p>
            </Link>
          );
        })}
      </section>}
    </main>
  );
}

function StaticDemoHome() {
  return (
    <main className="page-shell page-shell-compact product-shell home-shell">
      <nav aria-label="公開デモナビゲーション" className="site-nav y2k-nav product-nav">
        <Link className="wordmark" href="/">SIGNAL</Link>
        <Link aria-label="デモを試す" className="nav-add-fact" href="/analyze">TRY DEMO</Link>
      </nav>
      <header className="home-heading home-heading-desk">
        <Sticker className="desk-heading-sticker" rotate={10} size="sm" type="sparkle" />
        <p className="sticker-label">PUBLIC DEMO</p>
        <h1>ここでは、<br /><span>Factだけ。</span></h1>
        <p>公開版では保存せず、入力からSIGNALの見え方を試せます。</p>
      </header>
      <section className="empty-card desk-empty-card">
        <Sticker rotate={-8} size="lg" type="heart" />
        <p className="sticker-label">NO ACCOUNT NEEDED</p>
        <h2>3つの出来事で、<br />SIGNALを見てみよう。</h2>
        <p>本番版では、ログイン後に出来事の追加と履歴の比較ができます。</p>
        <Link className="button button-primary" href="/analyze">デモをはじめる <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
