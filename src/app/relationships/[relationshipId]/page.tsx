import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function RelationshipPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("relationships").select("id, display_name, facts(text_original, created_at), analysis_snapshots(romantic_interest, desire_to_meet, initiative, evidence_sufficiency, created_at)").eq("id", relationshipId).maybeSingle();
  if (!data) notFound();
  const snapshots = [...data.analysis_snapshots].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const current = snapshots[0];
  return <main className="page-shell page-shell-compact home-shell"><nav aria-label="詳細ナビゲーション" className="site-nav y2k-nav"><Link className="wordmark" href="/home">SIGNAL</Link><Link className="back-link" href="/home">× CLOSE</Link></nav><header className="home-heading"><p className="sticker-label">CURRENT SIGNAL</p><h1>{data.display_name}</h1></header><section className="detail-card"><p>SIGNAL LEVEL</p><strong>{current?.romantic_interest ?? "--"}<small>/ 100</small></strong><dl><div><dt>会いたいサイン</dt><dd>{current?.desire_to_meet ?? "--"}</dd></div><div><dt>相手からの積極性</dt><dd>{current?.initiative ?? "--"}</dd></div><div><dt>判断材料</dt><dd>{current?.evidence_sufficiency ?? "--"}</dd></div></dl></section><section className="facts-card"><p className="sticker-label">RECENT FACTS</p>{data.facts.slice(-5).reverse().map((fact) => <p key={fact.created_at}>• {fact.text_original}</p>)}</section></main>;
}
