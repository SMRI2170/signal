"use client";

import Link from "next/link";
import { useState } from "react";

import type { AnalysisResult, FactValidationResult } from "@/lib/judge/types";

type SaveResponse = {
  analysis?: AnalysisResult;
  currentScore?: number;
  error?: { message?: string };
  previousScore?: number | null;
  validations?: FactValidationResult[];
};

type SavedUpdate = { analysis: AnalysisResult; currentScore: number; previousScore: number | null };

export function AddFactForm({ relationshipId, factNumber }: { relationshipId: string; factNumber: number }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [savedUpdate, setSavedUpdate] = useState<SavedUpdate | null>(null);
  const [validation, setValidation] = useState<FactValidationResult | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isReady = text.trim().length >= 10;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!isReady) return;

    setLoading(true);
    setMessage(null);
    setSavedUpdate(null);
    setValidation(null);
    try {
      const response = await fetch(`/api/relationships/${relationshipId}/analyses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facts: [{ clientFactId: crypto.randomUUID(), text: text.trim() }], idempotencyKey: crypto.randomUUID() }),
      });
      const payload = (await response.json().catch(() => ({}))) as SaveResponse;
      if (response.status === 422 && payload.validations?.[0]) {
        setValidation(payload.validations[0]);
        return;
      }
      if (!response.ok || !payload.analysis || typeof payload.currentScore !== "number") {
        setMessage(payload.error?.message ?? "保存できませんでした。Factを確認して再試行してください。");
        return;
      }
      setSavedUpdate({ analysis: payload.analysis, currentScore: payload.currentScore, previousScore: payload.previousScore ?? null });
    } catch {
      setMessage("通信を確認できませんでした。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  }

  async function copyRewrite() {
    if (!validation?.rewriteExampleJa) return;
    try {
      await navigator.clipboard.writeText(validation.rewriteExampleJa);
      setCopyMessage("例をコピーしました。自分の出来事に合わせて書いてみよう。");
    } catch {
      setCopyMessage("例を長押ししてコピーしてください。");
    }
  }

  if (savedUpdate) {
    const delta = savedUpdate.previousScore === null ? null : savedUpdate.currentScore - savedUpdate.previousScore;
    return (
      <section aria-live="polite" className="fact-saved-card fact-update-card">
        <p className="sticker-label">UPDATE COMPLETE</p>
        <p>新しいFactを、SIGNAL THREADに追加しました。</p>
        <div className="update-score-row">
          <span>{savedUpdate.previousScore ?? "--"}<small>/ 100</small></span>
          <i aria-hidden="true">→</i>
          <strong>{savedUpdate.currentScore}<small>/ 100</small></strong>
        </div>
        <p className="update-delta">{delta === null ? "FIRST SIGNAL" : `${delta >= 0 ? "↑ +" : "↓ "}${Math.abs(delta)} 前回比`}</p>
        <div className="update-fact"><span>今回のFact</span><p>{text}</p></div>
        <p className="fact-saved-note">今のスコアと、これまでのFactをSIGNAL BOARDで見返せます。</p>
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
          onChange={(event) => { setText(event.target.value); setMessage(null); setValidation(null); setCopyMessage(null); }}
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
      {validation && validation.status !== "observable" ? <div className={`validation-message validation-${validation.status}`} role="status">
        <strong>MAKE IT CLEARER</strong>
        <span>{validation.reasonJa}</span>
        {validation.rewriteExampleJa ? <><span>例：{validation.rewriteExampleJa}</span><button className="validation-copy-button" onClick={copyRewrite} type="button">例をコピー</button></> : null}
        {copyMessage ? <span className="validation-copy-message">{copyMessage}</span> : null}
      </div> : null}
      {message ? <p className="form-error" role="alert">{message}</p> : null}
      <button className="button button-primary add-fact-submit" disabled={!isReady || loading} type="submit">
        {loading ? "SIGNALを整理しています…" : "Factを追加して更新"} <span aria-hidden="true">→</span>
      </button>
      <p className="form-status">{isReady ? "このFactを追加して、前回からの変化を見よう。" : "10文字以上で追加できます"}</p>
    </form>
  );
}
