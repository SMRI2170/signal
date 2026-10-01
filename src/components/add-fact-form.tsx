"use client";
import { useState } from "react";

export function AddFactForm({ relationshipId }: { relationshipId: string }) {
  const [text, setText] = useState(""); const [message, setMessage] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function submit(event: React.FormEvent) { event.preventDefault(); setLoading(true); setMessage(null); const response = await fetch(`/api/relationships/${relationshipId}/analyses`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({facts:[{clientFactId:crypto.randomUUID(),text}],idempotencyKey:crypto.randomUUID()}) }); setLoading(false); setMessage(response.ok ? "再分析を保存しました。詳細へ戻って変化を見てみよう。" : "保存できませんでした。Factを確認して再試行してください。"); }
  return <form className="fact-form" onSubmit={submit}><article className="fact-card"><label htmlFor="new-fact">NEW FACT</label><textarea id="new-fact" minLength={10} maxLength={300} onChange={(e)=>setText(e.target.value)} placeholder="例：相手から次の予定を聞かれた" required value={text} /></article><button className="button button-primary" disabled={loading} type="submit">{loading ? "再分析しています…" : "Factを追加して再分析"}</button>{message ? <p className="auth-message">{message}</p> : null}</form>;
}
