"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";

import { getFactInputErrors, normalizeFact } from "@/lib/fact";
import { fakeJudge } from "@/lib/judge/fake-judge";
import type { AnalysisResult, FactInput as FactInputPayload, FactValidationResult } from "@/lib/judge/types";

const INITIAL_FACTS = ["", "", ""];
const MAX_FACTS = 10;
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
const GUEST_ANALYSIS_STORAGE_KEY = "signal.guestAnalysis.v1";

function getGuestSessionId() {
  const key = "signal.guestSession.v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function FactInput() {
  const formId = useId();
  const [facts, setFacts] = useState<string[]>(INITIAL_FACTS);
  const [validations, setValidations] = useState<FactValidationResult[] | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const errors = useMemo(() => getFactInputErrors(facts), [facts]);
  const filledFactCount = facts.filter((fact) => normalizeFact(fact).length > 0).length;
  const isReady = filledFactCount >= 3 && errors.length === 0;

  function updateFact(index: number, value: string) {
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setFacts((currentFacts) =>
      currentFacts.map((fact, factIndex) => (factIndex === index ? value : fact)),
    );
  }

  function removeFact(index: number) {
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setFacts((currentFacts) => currentFacts.filter((_, factIndex) => factIndex !== index));
  }

  function addFact() {
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setFacts((currentFacts) => [...currentFacts, ""]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isReady) {
      return;
    }

    const requestFacts: FactInputPayload[] = facts.map((text) => ({
      clientFactId: crypto.randomUUID(),
      text: normalizeFact(text),
    }));

    setIsLoading(true);
    setRequestError(null);
    setResult(null);

    try {
      const validationResult = isStaticDemo
        ? await fakeJudge.validateFacts(requestFacts)
        : await validateFactsOnServer(requestFacts);
      setValidations(validationResult);

      if (validationResult.some((validation) => validation.status !== "observable")) {
        return;
      }

      const analysis = isStaticDemo ? await fakeJudge.analyze(requestFacts) : await analyzeOnServer(requestFacts);
      setResult(analysis);

      if (!isStaticDemo) {
        sessionStorage.setItem(
          GUEST_ANALYSIS_STORAGE_KEY,
          JSON.stringify({ facts: requestFacts, preview: analysis, createdAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID() }),
        );
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "予期しないエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="fact-form" noValidate onSubmit={handleSubmit}>
      <div className="fact-list">
        {facts.map((fact, index) => {
          const characterCount = fact.length;
          const fieldId = `${formId}-${index}`;
          const fieldError = fact ? errors.find((error) => error.index === index)?.message : undefined;
          const validation = validations?.[index];

          return (
            <article className="fact-card" key={fieldId}>
              <div className="fact-card-header">
                <label htmlFor={fieldId}>FACT {String(index + 1).padStart(2, "0")}</label>
                {facts.length > 3 ? (
                  <button
                    aria-label={`FACT ${index + 1}を削除`}
                    className="text-button"
                    onClick={() => removeFact(index)}
                    type="button"
                  >
                    削除
                  </button>
                ) : null}
              </div>
              <textarea
                aria-describedby={fieldError ? `${fieldId}-error` : `${fieldId}-hint`}
                aria-invalid={Boolean(fieldError)}
                id={fieldId}
                maxLength={300}
                onChange={(event) => updateFact(index, event.target.value)}
                placeholder="例：相手から来週空いているか聞かれた"
                rows={3}
                value={fact}
              />
              <div className="fact-card-footer">
                <span id={`${fieldId}-hint`}>{fieldError ?? "10〜300文字"}</span>
                <span aria-label={`${characterCount}文字入力済み`}>{characterCount} / 300</span>
              </div>
              {fieldError ? (
                <p className="field-error" id={`${fieldId}-error`} role="alert">{fieldError}</p>
              ) : null}
              {validation ? (
                <div className={`validation-message validation-${validation.status}`} role="status">
                  <strong>
                    {validation.status === "observable" ? "事実として使用できます" : "書き換えが必要です"}
                  </strong>
                  <span>{validation.reasonJa}</span>
                  {validation.rewriteExampleJa ? <span>例：{validation.rewriteExampleJa}</span> : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {facts.length < MAX_FACTS ? (
        <button className="add-fact-button" onClick={addFact} type="button">
          <span aria-hidden="true">+</span> ADD FACT
        </button>
      ) : null}

      {requestError ? <div className="form-error" role="alert">{requestError}</div> : null}

      <button className="button button-primary submit-button" disabled={!isReady || isLoading} type="submit">
        {isLoading ? "分析しています…" : "分析する"} <span aria-hidden="true">→</span>
      </button>
      <p className="form-status">{filledFactCount < 3 ? "最低3つ入力してください" : "3つ以上のFactがそろいました"}</p>

      {result ? <PreviewResult isStaticDemo={isStaticDemo} result={result} /> : null}
    </form>
  );
}

async function validateFactsOnServer(facts: FactInputPayload[]): Promise<FactValidationResult[]> {
  const response = await fetch("/api/facts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signal-guest-session": getGuestSessionId() },
    body: JSON.stringify({ facts }),
  });

  if (!response.ok) {
    throw new Error("入力内容を確認できませんでした。もう一度お試しください。");
  }

  return (await response.json()) as FactValidationResult[];
}

async function analyzeOnServer(facts: FactInputPayload[]): Promise<AnalysisResult> {
  const response = await fetch("/api/analyses/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signal-guest-session": getGuestSessionId() },
    body: JSON.stringify({ facts }),
  });

  if (!response.ok) {
    throw new Error("分析を完了できませんでした。時間をおいてもう一度お試しください。");
  }

  return (await response.json()) as AnalysisResult;
}

function PreviewResult({ isStaticDemo, result }: { isStaticDemo: boolean; result: AnalysisResult }) {
  const metrics = [
    ["会いたいサイン", result.scores.desireToMeet],
    ["相手からの積極性", result.scores.initiative],
    ["判断材料", result.scores.evidenceSufficiency],
  ] as const;

  return (
    <section aria-live="polite" className="preview-result" aria-labelledby="result-title">
      <p className="eyebrow">FIRST ANALYSIS</p>
      <p className="result-label" id="result-title">SIGNAL LEVEL</p>
      <output className="result-score">{result.scores.romanticInterest}<small>/ 100</small></output>
      <p aria-label="5段階中4つのハート" className="result-hearts">♥ ♥ ♥ ♥ <span>♡</span></p>
      <p className="result-disclaimer">
        これは確率ではなく、入力された出来事から見えるSIGNALスコアです。相手の実際の感情を特定するものではありません。
      </p>
      <dl className="metric-list">
        {metrics.map(([label, score]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{score}</dd>
          </div>
        ))}
      </dl>
      {isStaticDemo ? (
        <p className="preview-note">これは公開デモ用のFake Judgeによる結果です。入力内容は保存・送信されません。</p>
      ) : (
        <>
          <Link className="button button-primary save-result-button" href="/auth">
            結果を保存する <span aria-hidden="true">→</span>
          </Link>
          <p className="preview-note">メールでログインすると、今回のFactとSIGNALをあとで見返せます。</p>
        </>
      )}
    </section>
  );
}
