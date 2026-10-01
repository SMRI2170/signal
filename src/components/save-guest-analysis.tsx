"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { FactInput } from "@/lib/judge/types";

const STORAGE_KEY = "signal.guestAnalysis.v1";

type GuestAnalysis = { facts: FactInput[]; createdAt: string; idempotencyKey: string; relationshipLabel?: string };
type SaveState = "saving" | "saved" | "missing" | "error";

export function SaveGuestAnalysis() {
  const [state, setState] = useState<SaveState>("saving");
  const [relationshipId, setRelationshipId] = useState<string | null>(null);

  useEffect(() => {
    let guest: GuestAnalysis;
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) {
        queueMicrotask(() => setState("missing"));
        return;
      }
      guest = JSON.parse(stored) as GuestAnalysis;
    } catch {
      queueMicrotask(() => setState("missing"));
      return;
    }

    if (Date.now() - new Date(guest.createdAt).getTime() > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => setState("missing"));
      return;
    }

    void fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: guest.relationshipLabel?.trim() || "アプリの人",
        facts: guest.facts,
        idempotencyKey: guest.idempotencyKey,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as { relationshipId?: string } | null;
        if (!response.ok || !payload?.relationshipId) throw new Error("save failed");
        sessionStorage.removeItem(STORAGE_KEY);
        setRelationshipId(payload.relationshipId);
        setState("saved");
      })
      .catch(() => setState("error"));
  }, []);

  const copy = {
    saving: "入力したFactをもう一度確認して、安全に保存しています…",
    saved: "記録できました。次の出来事があったら、このSIGNALと比べられます。",
    missing: "保存する分析結果が見つかりませんでした。もう一度分析してからお試しください。",
    error: "保存できませんでした。入力内容はこのブラウザに残っています。もう一度お試しください。",
  }[state];

  const destination = state === "saved" && relationshipId ? `/relationships/${relationshipId}` : "/analyze";
  const action = state === "saved" ? "SIGNAL BOARDを見る" : "分析へ戻る";

  return (
    <section className="auth-card" aria-live="polite">
      <p className="sticker-label">SAVE YOUR THREAD</p>
      <h1>{state === "saved" ? "記録できた！" : "あと少し。"}</h1>
      <p>{copy}</p>
      {state !== "saving" ? <Link className="button button-primary" href={destination}>{action} <span aria-hidden="true">→</span></Link> : null}
    </section>
  );
}
