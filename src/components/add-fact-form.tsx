"use client";

import Link from "next/link";
import { useState } from "react";

import type { AnalysisResult } from "@/lib/judge/types";

type SaveResponse = { analysis?: AnalysisResult; error?: { message?: string } };

export function AddFactForm({ relationshipId, factNumber }: { relationshipId: string; factNumber: number }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [savedAnalysis, setSavedAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const isReady = text.trim().length >= 10;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isReady) return;

    setLoading(true);
    setMessage(null);
    setSavedAnalysis(null);
    try {
      const response = await fetch(`/api/relationships/${relationshipId}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts: [{ clientFactId: crypto.randomUUID(), text: text.trim() }], idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (!response.ok || !payload.analysis) {
        setMessage(payload.error?.message ?? "保存できませんでした。Factを確認して再試行してください。");
        return;
      }
      setSavedAnalysis(payload.analysis);
    } catch {
      setMessage("通信を確認できませんでした。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  }

  if (savedAnalysis) {
    return (
      <section aria-live="polite" className="fact-saved-card">
        <p className="sticker-label">TICKET ADDED!</p>
        <p>新しいFactを記録しました。</p>
        <strong>{savedAnalysis.scores.romanticInterest}<small>/ 100</small></strong>
        <span>SIGNAL LEVEL</span>
        <p className="fact-saved-note">今のスコアと、その根拠をSIGNAL BOARDで見返せます。</p>
        <Link className="button button-primary" href={`/relationships/${relationshipId}`}>SIGNAL BOARDを見る <span aria-hidden="true">→</span></Link>
      </section>
    );
  }

  return (
    <form className="fact-form add-fact-ticket-form" noValidate onSubmit={submit}>
      <article className="fact-card fact-ticket-card">
        <div className="fact-ticket-perforation" aria-hidden="true" />
        <div className="fact-card-header fact-ticket-header">
          <label htmlFor="new-fact">FACT {String(factNumber).padStart(2, "0")}</label>
          <span>WRITE WHAT HAPPENED</span>
        </div>
        <textarea
          aria-describedby="new-fact-hint"
          id="new-fact"
          maxLength={300}
          minLength={10}
          onChange={(event) => { setText(event.target.value); setMessage(null); }}
          placeholder="例：相手から次の予定を聞かれた"
          required
          rows={4}
          value={text}
        />
        <div className="fact-card-footer">
          <span id="new-fact-hint">解釈ではなく、発言・行動・回数だけ。</span>
          <span>{text.length} / 300</span>
        </div>
      </article>
      {message ? <p className="form-error" role="alert">{message}</p> : null}
      <button className="button button-primary add-fact-submit" disabled={!isReady || loading} type="submit">
        {loading ? "SIGNALを更新しています…" : "Factを追加して更新"} <span aria-hidden="true">→</span>
      </button>
      <p className="form-status">{isReady ? "このFactを追加して、SIGNALの変化を見よう。" : "10文字以上で追加できます"}</p>
    </form>
  );
}
