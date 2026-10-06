"use client";

import { useId } from "react";

export function JevConsent({
  checked,
  onChange,
  includesSavedFacts = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  includesSavedFacts?: boolean;
}) {
  const id = useId();

  return (
    <fieldset className="jev-consent">
      <legend>Jevによる分析と入力内容の取り扱い</legend>
      <p>
        {includesSavedFacts
          ? "今回のFactと、この記録に保存済みのFactをTypeSafe AIのJevへ送信して再分析します。"
          : "入力したFactをTypeSafe AIのJevへ送信して分析します。"}
        {" "}TypeSafeの契約では、入力内容はサービス提供などのために処理され、テレメトリは継続利用される場合があります。入力内容の保存期間は明示されていません。
        {" "}本名や連絡先など、本人を特定できる情報は入力しないでください。
      </p>
      <p className="jev-consent-links">
        <a href="https://typesafe.ai/legal/mca" rel="noreferrer" target="_blank">TypeSafeの利用条件</a>
        {" · "}
        <a href="https://typesafe.ai/legal/privacy-policy" rel="noreferrer" target="_blank">プライバシーポリシー</a>
      </p>
      <label className="jev-consent-check" htmlFor={id}>
        <input checked={checked} id={id} onChange={(event) => onChange(event.currentTarget.checked)} required type="checkbox" />
        <span>内容を確認し、FactをJevへ送信することに同意します。</span>
      </label>
    </fieldset>
  );
}
