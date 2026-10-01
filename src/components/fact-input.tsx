"use client";

import { useId, useMemo, useState } from "react";

import { getFactInputErrors, normalizeFact } from "@/lib/fact";
import { fakeJudge } from "@/lib/judge/fake-judge";
import type { AnalysisResult, FactInput as FactInputPayload, FactValidationResult } from "@/lib/judge/types";

const INITIAL_FACTS = ["", "", ""];
const MAX_FACTS = 10;
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";

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

      setResult(isStaticDemo ? await fakeJudge.analyze(requestFacts) : await analyzeOnServer(requestFacts));
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
          <span aria-hidden="true">+</span> 事実を追加
        </button>
      ) : null}

      {requestError ? <div className="form-error" role="alert">{requestError}</div> : null}

      <button className="button button-primary submit-button" disabled={!isReady || isLoading} type="submit">
        {isLoading ? "分析しています…" : "分析する"} <span aria-hidden="true">→</span>
      </button>
      <p className="form-status">{filledFactCount} / 3 facts entered</p>

      {result ? <PreviewResult result={result} /> : null}
    </form>
  );
}

async function validateFactsOnServer(facts: FactInputPayload[]): Promise<FactValidationResult[]> {
  const response = await fetch("/api/facts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facts }),
  });

  if (!response.ok) {
    throw new Error("分析を完了できませんでした。時間をおいてもう一度お試しください。");
  }

  return (await response.json()) as AnalysisResult;
}

function PreviewResult({ result }: { result: AnalysisResult }) {
  const metrics = [
    ["Desire to Meet", result.scores.desireToMeet],
    ["Initiative", result.scores.initiative],
    ["Evidence", result.scores.evidenceSufficiency],
  ] as const;

  return (
    <section aria-live="polite" className="preview-result" aria-labelledby="result-title">
      <p className="eyebrow">FIRST ANALYSIS</p>
      <p className="result-label" id="result-title">Romantic Interest Signal</p>
      <output className="result-score">{result.scores.romanticInterest}<small>%</small></output>
      <p aria-label="5段階中4つのハート" className="result-hearts">♥ ♥ ♥ ♥ <span>♡</span></p>
      <p className="result-disclaimer">
        この数値は相手の実際の感情を特定するものではありません。入力された出来事を評価した結果です。
      </p>
      <dl className="metric-list">
        {metrics.map(([label, score]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{score}%</dd>
          </div>
        ))}
      </dl>
      <p className="preview-note">これはローカル検証用のFake Judgeによる結果です。Jev連携後に実際の評価へ切り替わります。</p>
    </section>
  );
}
