"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { FactInput } from "@/lib/judge/types";

const STORAGE_KEY = "signal.guestAnalysis.v1";

type GuestAnalysis = { facts: FactInput[]; createdAt: string; idempotencyKey: string };

export function SaveGuestAnalysis() {
  const [state, setState] = useState<"saving" | "saved" | "missing" | "error">("saving");

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) {
      queueMicrotask(() => setState("missing"));
      return;
    }

    const guest = JSON.parse(stored) as GuestAnalysis;
    if (Date.now() - new Date(guest.createdAt).getTime() > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      queueMicrotask(() => setState("missing"));
      return;
    }

    void fetch("/api/relationships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "記録した相手",
        facts: guest.facts,
        idempotencyKey: guest.idempotencyKey,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("save failed");
        sessionStorage.removeItem(STORAGE_KEY);
        setState("saved");
      })
      .catch(() => setState("error"));
  }, []);

  const copy = {
    saving: "分析結果を安全に保存しています…",
    saved: "保存できました。新しい出来事があったら、またFactを追加できます。",
    missing: "保存する分析結果が見つかりませんでした。もう一度分析してからお試しください。",
    error: "保存できませんでした。入力内容はこのブラウザに残っています。もう一度お試しください。",
  }[state];

  return (
    <section className="auth-card" aria-live="polite">
      <p className="sticker-label">SAVE YOUR SIGNAL</p>
      <h1>{state === "saved" ? "記録できた！" : "あと少し。"}</h1>
      <p>{copy}</p>
      {state !== "saving" ? <Link className="button button-primary" href="/analyze">分析へ戻る</Link> : null}
    </section>
  );
}
