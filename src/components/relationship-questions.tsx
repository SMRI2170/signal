"use client";

import Link from "next/link";
import { useState } from "react";

import {
  type RelationshipQuestionAnswer,
  type RelationshipQuestionTopic,
} from "@/lib/relationship-question";

const questionChoices: { topic: RelationshipQuestionTopic; label: string }[] = [
  { topic: "change", label: "前回から何が変わった？" },
  { topic: "evidence", label: "このスコアの根拠は？" },
  { topic: "unknowns", label: "まだ分からないことは？" },
  { topic: "next", label: "次に何を見ればいい？" },
];

const factDateFormatter = new Intl.DateTimeFormat("ja-JP", { year: "2-digit", month: "numeric", day: "numeric" });

export function RelationshipQuestions({ relationshipId }: { relationshipId: string }) {
  const [answer, setAnswer] = useState<RelationshipQuestionAnswer | null>(null);
  const [activeTopic, setActiveTopic] = useState<RelationshipQuestionTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask(topic: RelationshipQuestionTopic) {
    setLoading(true);
    setActiveTopic(topic);
    setAnswer(null);
    setError(null);
    try {
      const response = await fetch(`/api/relationships/${relationshipId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const answerPayload = payload as RelationshipQuestionAnswer | null;
      if (
        !response.ok || !answerPayload || typeof answerPayload.summary !== "string" ||
        typeof answerPayload.context !== "string" || !Array.isArray(answerPayload.facts)
      ) {
        setError("回答を作れませんでした。時間をおいてもう一度お試しください。");
        return;
      }
      setAnswer(answerPayload);
    } catch {
      setError("通信を確認できませんでした。時間をおいて再試行してください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="relationship-questions-title" className="ask-signal-card">
      <div className="ask-signal-heading">
        <div>
          <p className="sticker-label">ASK SIGNAL</p>
          <h2 id="relationship-questions-title">この人について聞く</h2>
        </div>
        <span aria-hidden="true" className="ask-signal-icon">?</span>
      </div>
      <p className="ask-signal-intro">保存したFactと分析履歴をもとに、前回からの変化や次に見ることを整理します。</p>
      <div className="ask-question-list" aria-label="質問を選ぶ">
        {questionChoices.map((question) => (
          <button
            aria-pressed={activeTopic === question.topic}
            className={`ask-question-button${activeTopic === question.topic ? " ask-question-active" : ""}`}
            disabled={loading}
            key={question.topic}
            onClick={() => ask(question.topic)}
            type="button"
          >
            {question.label}<span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
      {loading ? <p aria-live="polite" className="ask-signal-status" role="status">記録を読み返しています…</p> : null}
      {error ? <p className="ask-signal-error" role="alert">{error}</p> : null}
      {answer ? (
        <article aria-live="polite" className="ask-answer-card">
          <p className="ask-answer-label">SIGNAL ANSWER</p>
          <h3>{questionChoices.find((question) => question.topic === answer.topic)?.label}</h3>
          {answer.trend ? (
            <div aria-label={`${factDateFormatter.format(new Date(answer.trend.previousAt))}の分析 ${answer.trend.previousScore}、${factDateFormatter.format(new Date(answer.trend.currentAt))}の分析 ${answer.trend.currentScore}`} className="ask-trend-row">
              <span className="ask-trend-point"><small>{factDateFormatter.format(new Date(answer.trend.previousAt))}</small><b>{answer.trend.previousScore}<small>/ 100</small></b></span>
              <i aria-hidden="true">→</i>
              <span className="ask-trend-point ask-trend-current"><small>{factDateFormatter.format(new Date(answer.trend.currentAt))}</small><b>{answer.trend.currentScore}<small>/ 100</small></b></span>
            </div>
          ) : null}
          <p className="ask-answer-summary">{answer.summary}</p>
          <p className="ask-answer-context">{answer.context}</p>
          {answer.facts.length > 0 ? (
            <div className="ask-evidence-block">
              <h4>{answer.evidenceTitle}</h4>
              <ul>
                {answer.facts.map((fact, index) => (
                  <li key={fact.id}>
                    <details>
                      <summary>{factDateFormatter.format(new Date(fact.createdAt))} · FACT {String(index + 1).padStart(2, "0")}</summary>
                      <blockquote>{fact.text}</blockquote>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {answer.suggestFact ? (
            <Link className="button button-primary ask-add-fact-button" href={`/relationships/${relationshipId}/facts/new`}>
              次のFactを追加する <span aria-hidden="true">→</span>
            </Link>
          ) : null}
          <p className="ask-answer-note">記録された行動の整理です。相手の気持ちを断定するものではありません。</p>
        </article>
      ) : null}
    </section>
  );
}
