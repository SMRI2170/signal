import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type Snapshot = { romantic_interest: number; created_at: string };
type Relationship = { id: string; display_name: string; updated_at: string; analysis_snapshots: Snapshot[] };

export default async function HomePage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/auth");

  const { data } = await supabase
    .from("relationships")
    .select("id, display_name, updated_at, analysis_snapshots(romantic_interest, created_at)")
    .order("updated_at", { ascending: false });
  const relationships = (data ?? []) as Relationship[];

  return (
    <main className="page-shell page-shell-compact home-shell">
      <nav aria-label="ホームナビゲーション" className="site-nav y2k-nav"><Link className="wordmark" href="/">SIGNAL</Link><Link className="back-link" href="/analyze">+ ADD</Link></nav>
      <header className="home-heading"><p className="sticker-label">YOUR SIGNALS</p><h1>記録した恋を、<br />見返そう。</h1></header>
      {relationships.length === 0 ? <section className="empty-card"><h2>まだ記録がないよ。</h2><p>最初のFactを追加して、SIGNALを記録しよう。</p><Link className="button button-primary" href="/analyze">分析を始める →</Link></section> : <section className="relationship-list" aria-label="保存したRelationship">
        {relationships.map((relationship) => {
          const snapshots = [...relationship.analysis_snapshots].sort((a, b) => b.created_at.localeCompare(a.created_at));
          const current = snapshots[0]; const previous = snapshots[1]; const delta = current && previous ? current.romantic_interest - previous.romantic_interest : null;
          return <Link className="relationship-card" href={`/relationships/${relationship.id}`} key={relationship.id}><span>RELATIONSHIP</span><h2>{relationship.display_name}</h2><strong>{current?.romantic_interest ?? "--"}<small>/ 100</small></strong><p>{delta === null ? "最初の記録" : `前回比 ${delta >= 0 ? "+" : ""}${delta}`}</p></Link>;
        })}
      </section>}
    </main>
  );
}
