import Link from "next/link";
import { notFound } from "next/navigation";

import { AddFactForm } from "@/components/add-fact-form";
import { Sticker } from "@/components/sticker";
import { createClient } from "@/lib/supabase/server";

export default async function NewFactPage({ params }: { params: Promise<{ relationshipId: string }> }) {
  const { relationshipId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("relationships")
    .select("display_name, facts(id)")
    .eq("id", relationshipId)
    .maybeSingle();
  if (!data) notFound();

  return (
    <main className="page-shell page-shell-compact product-shell analyze-shell fact-ticket-shell">
      <nav aria-label="Fact追加ナビゲーション" className="site-nav y2k-nav product-nav">
        <Link className="wordmark" href={`/relationships/${relationshipId}`}>SIGNAL</Link>
        <Link className="back-link back-link-chip" href={`/relationships/${relationshipId}`}>← BOARD</Link>
      </nav>
      <section className="input-heading fact-ticket-heading" aria-labelledby="new-fact-title">
        <Sticker className="fact-ticket-heading-sticker" rotate={-13} size="md" type="lightning" />
        <p className="sticker-label">FACT TICKET</p>
        <h1 id="new-fact-title">新しい出来事、<br />追加しよう。</h1>
        <p>{data.display_name}との間で、実際に起きたことだけを書いてね。</p>
      </section>
      <AddFactForm factNumber={data.facts.length + 1} relationshipId={relationshipId} />
    </main>
  );
}
