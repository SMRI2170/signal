"use client";

import { useId, useMemo, useState } from "react";

import { getFactInputErrors, normalizeFact } from "@/lib/fact";

const INITIAL_FACTS = ["", "", ""];
const MAX_FACTS = 10;

export function FactInput() {
  const formId = useId();
  const [facts, setFacts] = useState<string[]>(INITIAL_FACTS);
  const [submitted, setSubmitted] = useState(false);

  const errors = useMemo(() => getFactInputErrors(facts), [facts]);
  const filledFactCount = facts.filter((fact) => normalizeFact(fact).length > 0).length;
  const isReady = filledFactCount >= 3 && errors.length === 0;

  function updateFact(index: number, value: string) {
    setSubmitted(false);
    setFacts((currentFacts) =>
      currentFacts.map((fact, factIndex) => (factIndex === index ? value : fact)),
    );
  }

  function removeFact(index: number) {
    setSubmitted(false);
    setFacts((currentFacts) => currentFacts.filter((_, factIndex) => factIndex !== index));
  }

  function addFact() {
    setFacts((currentFacts) => [...currentFacts, ""]);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    if (!isReady) {
      return;
    }
  }

  return (
    <form className="fact-form" noValidate onSubmit={handleSubmit}>
      <div className="fact-list">
        {facts.map((fact, index) => {
          const characterCount = fact.length;
          const fieldId = `${formId}-${index}`;
          const fieldError = submitted
            ? errors.find((error) => error.index === index)?.message
            : undefined;

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
            </article>
          );
        })}
      </div>

      {facts.length < MAX_FACTS ? (
        <button className="add-fact-button" onClick={addFact} type="button">
          <span aria-hidden="true">+</span> 事実を追加
        </button>
      ) : null}

      {submitted && !isReady ? (
        <div className="form-error" role="alert">
          <strong>分析を始める前に確認してください。</strong>
          <span>{filledFactCount < 3 ? "3件以上のFactを入力してください。" : "各Factを確認してください。"}</span>
        </div>
      ) : null}

      <button className="button button-primary submit-button" type="submit">
        分析する <span aria-hidden="true">→</span>
      </button>
      <p className="form-status">{filledFactCount} / 3 facts entered</p>
    </form>
  );
}
