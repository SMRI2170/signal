"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";

import { getFactInputErrors, normalizeFact } from "@/lib/fact";
import { fakeJudge } from "@/lib/judge/fake-judge";
import type { AnalysisResult, FactInput as FactInputPayload, FactValidationResult } from "@/lib/judge/types";

const INITIAL_FACTS = ["", "", ""];
const MAX_FACTS = 10;
const isStaticDemo = process.env.NEXT_PUBLIC_STATIC_DEMO === "true";
const GUEST_ANALYSIS_STORAGE_KEY = "signal.guestAnalysis.v1";
const FACT_DRAFT_STORAGE_KEY = "signal.factDraft.v1";

const SCENE_HINTS = [
  {
    id: "meeting",
    label: "会ったあと",
    placeholders: ["例：相手からカフェを提案された", "例：帰り際に相手から次の予定を聞かれた", "例：帰宅後に相手からLINEが来た"],
  },
  {
    id: "message",
    label: "LINEのあと",
    placeholders: ["例：相手から昨日のことについてLINEが来た", "例：今週は相手から3回連絡が来た", "例：相手から来週空いているか聞かれた"],
  },
  {
    id: "plan",
    label: "次の予定",
    placeholders: ["例：相手から次の食事の日程を提案された", "例：相手から予定を別の日に変更したいと言われた", "例：次に会う日が10月8日に決まった"],
  },
] as const;

const DEFAULT_PLACEHOLDERS = [
  "例：相手から来週空いているか聞かれた",
  "例：帰宅後に相手からLINEが来た",
  "例：相手から次の食事の場所を提案された",
];

type AnalysisStage = "idle" | "checking" | "reading";
type StoredFactDraft = { facts: string[]; updatedAt: string };
type ViewTransitionDocument = Document & { startViewTransition?: (updateCallback: () => void) => unknown };

function getGuestSessionId() {
  const key = "signal.guestSession.v1";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  localStorage.setItem(key, created);
  return created;
}

export function FactInput() {
  const router = useRouter();
  const formId = useId();
  const [facts, setFacts] = useState<string[]>(INITIAL_FACTS);
  const [sceneHint, setSceneHint] = useState<(typeof SCENE_HINTS)[number]["id"] | null>(null);
  const [validations, setValidations] = useState<FactValidationResult[] | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("idle");
  const [draftReady, setDraftReady] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const errors = useMemo(() => getFactInputErrors(facts), [facts]);
  const filledFactCount = facts.filter((fact) => normalizeFact(fact).length > 0).length;
  const isReady = filledFactCount >= 3 && errors.length === 0;
  const selectedHint = SCENE_HINTS.find((hint) => hint.id === sceneHint);
  const placeholders = selectedHint?.placeholders ?? DEFAULT_PLACEHOLDERS;

  useEffect(() => {
    let restoredFacts: string[] = [];
    try {
      const stored = localStorage.getItem(FACT_DRAFT_STORAGE_KEY);
      if (stored) {
        const draft = JSON.parse(stored) as StoredFactDraft;
        restoredFacts = Array.isArray(draft.facts) ? draft.facts.filter((fact) => typeof fact === "string").slice(0, MAX_FACTS) : [];
      }
    } catch {
      localStorage.removeItem(FACT_DRAFT_STORAGE_KEY);
    }
    queueMicrotask(() => {
      if (restoredFacts.some((fact) => normalizeFact(fact).length > 0)) {
        setFacts([...restoredFacts, ...Array.from({ length: Math.max(0, INITIAL_FACTS.length - restoredFacts.length) }, () => "")]);
        setDraftRestored(true);
      }
      setDraftReady(true);
    });
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    if (!facts.some((fact) => normalizeFact(fact).length > 0)) {
      localStorage.removeItem(FACT_DRAFT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(FACT_DRAFT_STORAGE_KEY, JSON.stringify({ facts, updatedAt: new Date().toISOString() } satisfies StoredFactDraft));
  }, [draftReady, facts]);

  function updateFact(index: number, value: string) {
    setDraftRestored(false);
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setFacts((currentFacts) => currentFacts.map((fact, factIndex) => (factIndex === index ? value : fact)));
  }

  function removeFact(index: number) {
    setDraftRestored(false);
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setFacts((currentFacts) => currentFacts.filter((_, factIndex) => factIndex !== index));
  }

  function addFact() {
    setDraftRestored(false);
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setFacts((currentFacts) => [...currentFacts, ""]);
  }

  function clearDraft() {
    localStorage.removeItem(FACT_DRAFT_STORAGE_KEY);
    setFacts(INITIAL_FACTS);
    setSceneHint(null);
    setValidations(null);
    setResult(null);
    setRequestError(null);
    setDraftRestored(false);
  }

  function showResult(analysis: AnalysisResult) {
    const documentWithTransition = document as ViewTransitionDocument;
    const update = () => setResult(analysis);
    if (documentWithTransition.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      documentWithTransition.startViewTransition(update);
      return;
    }
    update();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReady) return;

    const requestFacts: FactInputPayload[] = facts.map((text) => ({ clientFactId: crypto.randomUUID(), text: normalizeFact(text) }));
    setAnalysisStage("checking");
    setRequestError(null);
    setResult(null);

    try {
      const validationResult = isStaticDemo ? await fakeJudge.validateFacts(requestFacts) : await validateFactsOnServer(requestFacts);
      setValidations(validationResult);

      if (validationResult.some((validation) => validation.status !== "observable")) return;

      setAnalysisStage("reading");
      const analysis = isStaticDemo ? await fakeJudge.analyze(requestFacts) : await analyzeOnServer(requestFacts);
      showResult(analysis);

      if (!isStaticDemo) {
        sessionStorage.setItem(
          GUEST_ANALYSIS_STORAGE_KEY,
          JSON.stringify({ facts: requestFacts, preview: analysis, createdAt: new Date().toISOString(), idempotencyKey: crypto.randomUUID(), relationshipLabel: "アプリの人" }),
        );
      }
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "予期しないエラーが発生しました。");
    } finally {
      setAnalysisStage("idle");
    }
  }

  function saveAndGoToAuth(relationshipLabel: string) {
    const stored = sessionStorage.getItem(GUEST_ANALYSIS_STORAGE_KEY);
    if (!stored) {
      setRequestError("分析結果を保存する準備ができませんでした。もう一度お試しください。");
      return;
    }

    try {
      const guest = JSON.parse(stored) as Record<string, unknown>;
      sessionStorage.setItem(GUEST_ANALYSIS_STORAGE_KEY, JSON.stringify({ ...guest, relationshipLabel }));
      localStorage.removeItem(FACT_DRAFT_STORAGE_KEY);
      router.push("/auth");
    } catch {
      setRequestError("分析結果を保存する準備ができませんでした。もう一度お試しください。");
    }
  }

  return (
    <form className="fact-form love-os-input-form" noValidate onSubmit={handleSubmit}>
      <fieldset className="scene-hints">
        <legend>思い出すヒント <span>（任意・保存されません）</span></legend>
        <div>
          {SCENE_HINTS.map((hint) => (
            <button
              aria-pressed={sceneHint === hint.id}
              className={sceneHint === hint.id ? "scene-hint scene-hint-selected" : "scene-hint"}
              key={hint.id}
              onClick={() => setSceneHint((current) => current === hint.id ? null : hint.id)}
              type="button"
            >
              {hint.label}
            </button>
          ))}
        </div>
      </fieldset>

      {draftReady && filledFactCount > 0 ? <div className="fact-draft-status">
        <div><span>ON THIS DEVICE</span><p>{draftRestored ? "前回の下書きを復元しました。" : "入力内容は、この端末だけに下書き保存されています。"}</p></div>
        <button onClick={clearDraft} type="button">下書きを消す</button>
      </div> : null}

      <div className="fact-list">
        {facts.map((fact, index) => {
          const characterCount = fact.length;
          const fieldId = `${formId}-${index}`;
          const fieldError = fact ? errors.find((error) => error.index === index)?.message : undefined;
          const validation = validations?.[index];

          return (
            <article className="fact-card fact-ticket" key={fieldId}>
              <div className="fact-card-header">
                <label htmlFor={fieldId}>FACT {String(index + 1).padStart(2, "0")}</label>
                {facts.length > 3 ? <button aria-label={`FACT ${index + 1}を削除`} className="text-button" onClick={() => removeFact(index)} type="button">削除</button> : <span>WRITE WHAT HAPPENED</span>}
              </div>
              <textarea
                aria-describedby={fieldError ? `${fieldId}-error` : `${fieldId}-hint`}
                aria-invalid={Boolean(fieldError)}
                id={fieldId}
                maxLength={300}
                onChange={(event) => updateFact(index, event.target.value)}
                placeholder={placeholders[index % placeholders.length]}
                rows={3}
                value={fact}
              />
              <div className="fact-card-footer">
                <span id={`${fieldId}-hint`}>{fieldError ?? "解釈ではなく、見たこと・聞いたことだけ。"}</span>
                <span aria-label={`${characterCount}文字入力済み`}>{characterCount} / 300</span>
              </div>
              {fieldError ? <p className="field-error" id={`${fieldId}-error`} role="alert">{fieldError}</p> : null}
              {validation ? <ValidationMirror validation={validation} /> : null}
            </article>
          );
        })}
      </div>

      {facts.length < MAX_FACTS ? <button className="add-fact-button" onClick={addFact} type="button"><span aria-hidden="true">+</span> ADD FACT</button> : null}
      {requestError ? <div className="form-error" role="alert">{requestError}</div> : null}

      <button className="button button-primary submit-button" disabled={!isReady || analysisStage !== "idle"} type="submit">
        {analysisStage === "idle" ? "この内容でSIGNALを見る" : "SIGNALを整理しています…"} <span aria-hidden="true">→</span>
      </button>
      <p className="form-status">{isReady ? "3つのFactがそろいました。" : `あと${Math.max(0, 3 - filledFactCount)}つでSIGNALを見られます`}</p>

      {analysisStage !== "idle" ? <AnalysisProgress stage={analysisStage} /> : null}
      {result ? <PreviewResult facts={facts.map(normalizeFact).filter(Boolean)} isStaticDemo={isStaticDemo} onSave={saveAndGoToAuth} result={result} /> : null}
    </form>
  );
}

function ValidationMirror({ validation }: { validation: FactValidationResult }) {
  if (validation.status === "observable") {
    return <div className="validation-message validation-observable" role="status"><strong>FACT OK</strong><span>事実として使用できます。</span></div>;
  }

  return (
    <div className={`validation-message validation-${validation.status}`} role="status">
      <strong>MAKE IT CLEARER</strong>
      <span>{validation.reasonJa}</span>
      {validation.rewriteExampleJa ? <span>例：{validation.rewriteExampleJa}</span> : null}
    </div>
  );
}

function AnalysisProgress({ stage }: { stage: AnalysisStage }) {
  const reading = stage === "reading";
  return (
    <div aria-live="polite" className="analysis-progress" role="status">
      <span className="analysis-progress-active">01 FACTを確認中</span>
      <span className={reading ? "analysis-progress-active" : ""}>02 同じ基準で整理中</span>
      <span className={reading ? "analysis-progress-active" : ""}>03 SIGNALをまとめています</span>
    </div>
  );
}

async function validateFactsOnServer(facts: FactInputPayload[]): Promise<FactValidationResult[]> {
  const response = await fetch("/api/facts/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signal-guest-session": getGuestSessionId() },
    body: JSON.stringify({ facts }),
  });
  if (!response.ok) throw new Error("入力内容を確認できませんでした。もう一度お試しください。");
  return (await response.json()) as FactValidationResult[];
}

async function analyzeOnServer(facts: FactInputPayload[]): Promise<AnalysisResult> {
  const response = await fetch("/api/analyses/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-signal-guest-session": getGuestSessionId() },
    body: JSON.stringify({ facts }),
  });
  if (!response.ok) throw new Error("分析を完了できませんでした。時間をおいてもう一度お試しください。");
  return (await response.json()) as AnalysisResult;
}

function PreviewResult({ facts, isStaticDemo, onSave, result }: { facts: string[]; isStaticDemo: boolean; onSave: (relationshipLabel: string) => void; result: AnalysisResult }) {
  const [relationshipLabel, setRelationshipLabel] = useState("アプリの人");
  const metrics = [
    ["会いたいサイン", result.scores.desireToMeet],
    ["相手からの積極性", result.scores.initiative],
    ["判断材料", result.scores.evidenceSufficiency],
  ] as const;

  return (
    <section aria-live="polite" className="preview-result signal-receipt love-os-receipt" aria-labelledby="result-title">
      <p className="receipt-kicker">FIRST ANALYSIS</p>
      <div className="result-title-row"><p className="result-label" id="result-title">SIGNAL LEVEL</p><span>FIRST</span></div>
      <output className="result-score">{result.scores.romanticInterest}<small>/ 100</small></output>
      <section className="result-evidence" aria-labelledby="recorded-facts-title">
        <h2 id="recorded-facts-title">今回記録した事実</h2>
        <ol>{facts.slice(0, 3).map((fact, index) => <li key={fact}><span>{String(index + 1).padStart(2, "0")}</span>{fact}</li>)}</ol>
      </section>
      <section className="result-unknown" aria-labelledby="unknown-title">
        <h2 id="unknown-title">まだ分からないこと</h2>
        <p>判断材料は{facts.length}件です。次の出来事を足すと、変化を読みやすくなります。</p>
      </section>
      <dl className="metric-list">
        {metrics.map(([label, score]) => <div key={label}><dt>{label}</dt><dd>{score}</dd></div>)}
      </dl>
      <p className="result-disclaimer">これは確率ではなく、入力された事実から見えるSIGNALスコアです。相手の実際の感情を特定するものではありません。</p>
      {isStaticDemo ? <p className="preview-note">これは公開デモ用のFake Judgeによる結果です。入力内容は保存・送信されません。</p> : <div className="save-prompt">
        <label htmlFor="relationship-label">この記録の名前</label>
        <input id="relationship-label" maxLength={80} onChange={(event) => setRelationshipLabel(event.target.value)} value={relationshipLabel} />
        <div className="label-suggestions"><span>候補</span>{["Aさん", "アプリの人", "先週会った人"].map((label) => <button key={label} onClick={() => setRelationshipLabel(label)} type="button">{label}</button>)}</div>
        <p className="privacy-mark">PRIVATE BY DEFAULT — 本名は不要。記録はあなた以外には表示されません。</p>
        <button className="button button-primary save-result-button" onClick={() => onSave(relationshipLabel.trim() || "アプリの人")} type="button">この記録を残す <span aria-hidden="true">→</span></button>
        <p className="preview-note">次の出来事と、今日のSIGNALを比べられます。</p>
      </div>}
    </section>
  );
}
