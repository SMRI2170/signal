# SIGNAL

## 0. AI Agent Instructions

このドキュメントをプロダクト仕様のSource of Truthとして扱うこと。

不明点がある場合、独自に大きな機能を追加しないこと。  
まずMVPを完成させることを優先する。

実装優先順位：

1. ユーザーが事実を入力できる
2. 入力が「事実」か「主観・解釈」か判定できる
3. Jevで関係性を複数指標から評価できる
4. 前回からの変化を表示できる
5. 判定履歴を保存できる
6. モバイルで快適に利用できるWeb UI
7. SNS共有

---

# 1. Product Concept

SIGNALは恋愛相談AIではない。

ユーザーが相手との関係について、

「脈ありな気がする」  
「最近冷たくなった」

などの主観を入力するのではなく、

「相手から来週空いているか聞かれた」  
「直近2回は相手から食事に誘われた」  
「予定を2回延期された」

など、

**実際に観測した出来事（Fact）**

だけを記録する。

蓄積されたFactをAI Judgeで評価し、

- Romantic Interest
- Desire to Meet
- Initiative
- Evidence Sufficiency

などを数値化する。

ユーザーは新しいFactを追加することで、

「関係性がどう変化しているか」

を時系列で確認できる。

---

# 2. Core Philosophy

## AIは恋愛相談をしない

AIとのチャット画面は作らない。

AIは、

- 励ます
- 慰める
- 恋愛アドバイスを長文生成する

ことを目的としない。

AIの役割はJudgeである。

基本UX：

Fact  
→ Judge  
→ Number  
→ History

---

# 3. Target User

Primary target:

18〜29歳程度。

特に、

- 交際前
- マッチングアプリで知り合った
- LINE / Instagramなどで連絡している
- 1〜数回会っている
- 「相手が自分に興味があるのか分からない」

というユーザー。

性別・性的指向を前提としないUIにする。

「彼氏」「彼女」ではなく、

「相手」

を基本表現とする。

---

# 4. Main User Flow

## First Visit

Landing Page

↓

「相手との間で実際に起きたことを入力してください」

↓

最低3つのFactを入力

↓

Fact Validation

↓

Jev Analysis

↓

Result

↓

必要ならアカウント作成

↓

以降、新しいFactを追加

↓

再分析

↓

時系列で変化を表示

---

# 5. Landing Page

ファーストビュー。

コピー：

「気持ちではなく、  
起きたことを記録する。」

サブコピー：

「相手との間で実際に起きた出来事から、  
関係性の変化を分析します。」

CTA：

「分析してみる」

初回はログインを要求しない。

---

# 6. Fact Input

チャットUIにはしない。

Fact Card方式。

Example:

FACT 01

「相手から来週空いているか聞かれた」

FACT 02

「帰宅後、相手からLINEが来た」

FACT 03

「直近2回は相手から食事に誘われた」

[ + 事実を追加 ]

[ 分析する ]

---

# 7. Fact Validation

入力された文章が、

Observable Fact

なのか、

Interpretation / Opinion

なのかを判定する。

Good:

「相手から食事に誘われた」

「3時間二人で話した」

「昨日は相手からLINEが来た」

Bad:

「いい感じだった」

「絶対自分のことが好き」

「最近冷たい気がする」

Badの場合：

「これはあなたの解釈を含んでいる可能性があります。

実際に起きた出来事に書き換えてみてください。」

Example:

× 最近冷たい

○ 以前は毎日返信があったが、今週は3日返信がなかった

---

# 8. Judge Architecture

FrontendからJev APIを直接呼ばない。

Architecture:

Browser  
→ Backend API  
→ Jev API

API KeyはServer Sideのみ。

---

# 9. Jev Input

Jevには可能な限り英語で送信する。

Example State:

Relationship facts:

1. They have met alone three times.
2. The other person initiated the last two meetings.
3. The other person asked if the user was free next Saturday.
4. The other person sent a message after the last meeting.
5. No explicit romantic statement has been made.

重要：

ユーザーの解釈をJev Stateに混ぜない。

---

# 10. Judge Metrics

MVPでは4指標。

## Romantic Interest

「入力された事実は、相手がユーザーに恋愛的関心を持っているという仮説をどの程度支持するか」

0〜100

## Desire to Meet

「相手がユーザーと再び会いたいという証拠がどの程度存在するか」

0〜100

## Initiative

「関係を進める行動を相手側から起こしている程度」

0〜100

## Evidence Sufficiency

「恋愛的関心について判断するための証拠がどの程度揃っているか」

0〜100

---

# 11. Important Probability Rule

Romantic Interest 68%

を、

「相手が68%の確率であなたを好き」

とは表現しない。

正しい表現：

「入力された事実に基づく恋愛的関心シグナル：68」

または

「Romantic Interest Signal 68%」

Disclaimer:

「この数値は相手の実際の感情を特定するものではありません。入力された出来事をAIモデルが評価した結果です。」

---

# 12. Result Screen

最重要画面。

Large:

Romantic Interest

68%

Previous

54%

+14

Secondary:

Desire to Meet  
82%

Initiative  
74%

Evidence  
46%

長いAI文章は表示しない。

---

# 13. Change Analysis

新しいFactを追加した場合、

Previous Score

と

Current Score

を比較。

Example:

54%  
→  
68%

+14

今回追加されたFact：

「相手から来週空いているか聞かれた」

Impact:

STRONG POSITIVE

Impact category:

STRONG POSITIVE  
POSITIVE  
NEUTRAL  
NEGATIVE  
STRONG NEGATIVE

---

# 14. History

ユーザーごとにAnalysis Snapshotを保存する。

Example:

Sep 21  
38%

Sep 24  
42%

Sep 27  
41%

Sep 29  
54%

Oct 1  
68%

グラフ表示する。

目的：

「現在何%か」

だけではなく、

「最近上がっているのか下がっているのか」

を理解できるようにする。

---

# 15. Home Screen

ログインユーザーのホーム。

表示：

Relationship name

Current Signal

68%

Trend

+14

Graph

Recent Facts

CTA:

- FACT

Relationship nameは、

「Aさん」

「マッチングアプリの人」

などユーザー自身が設定可能。

---

# 16. Share Card

SNS共有用カードを生成。

Example:

SIGNAL

Romantic Interest

73%

↑ +11

Evidence  
61%

Updated Oct 1

個人名やFact本文はデフォルトでは共有画像に含めない。

---

# 17. Visual Design

恋愛占いアプリにしない。

Avoid:

- 大量のハート
- ピンク一色
- 占い風UI
- AIチャット風UI
- キャラクターAI

Target visual:

「relationship analytics」

「measurement tool」

「personal dashboard」

---

# 18. Design Direction

Base:

White / Off White

Text:

Near Black

Cards:

White

Accent:

Purple / Indigo系を候補

Positive:

Green系

Negative:

Red系

ただし色だけで状態を表現しない。

Accessibilityを考慮する。

---

# 19. Typography

大きな数字を重要視。

Result:

68%

を画面のVisual Anchorにする。

文章量は少なくする。

余白を大きく取る。

---

# 20. Responsive Design

Mobile First。

Primary viewport:

360〜430px

Desktopでも中央にコンテンツを配置。

max-width:

およそ480〜600pxを基本。

Web版でもネイティブアプリに近い操作感を目指す。

---

# 21. Technology

Web:

Next.js  
TypeScript

UI:

Tailwind CSS

Backend / DB / Auth:

Supabase

Database:

PostgreSQL

AI Judge:

Jev API

Mobile:

将来的にFlutter

重要：

ビジネスロジックをFrontendへ密結合させない。

WebとFlutterの両方から同じBackend APIを利用できる構造にする。

---

# 22. Database

Minimum tables:

users

relationships

facts

analysis_snapshots

## relationships

id  
user_id  
display_name  
created_at  
updated_at

## facts

id  
relationship_id  
text_original  
text_english  
fact_validation  
created_at

## analysis_snapshots

id  
relationship_id  
romantic_interest  
desire_to_meet  
initiative  
evidence_sufficiency  
created_at

---

# 23. Privacy

恋愛情報は非常にプライベートなデータとして扱う。

最低限：

- HTTPS
- API KeyをClientへ公開しない
- RLSを有効化
- relationship/factは所有者のみアクセス可能
- Share Cardには個人情報を含めない
- ユーザーがRelationshipを削除できる
- 削除時に関連FactとAnalysisも削除

---

# 24. MVP Scope

Implement:

- Landing
- Fact入力
- Fact Validation
- Jev Analysis
- Result
- Relationship作成
- Fact追加
- History
- Graph
- Authentication
- Share Card

Do NOT implement initially:

- AI Chat
- 恋愛相談
- DM/LINE自動取得
- Screenshot OCR
- Push Notification
- Subscription
- Multiple AI models
- Social network
- Matching functionality

---

# 25. MVP Product Decisions

実装時の判断を揃えるため、MVPでは以下を固定する。

- 1ユーザーは複数のRelationshipを作成できる
- 初回分析はログイン不要。ゲスト状態はブラウザの`sessionStorage`にのみ保持する
- アカウント作成後、ゲストのFactをBackendで再検証・再分析してから保存する
- 初回分析にはObservable Factが3件以上必要
- 2回目以降は新しいObservable Factが1件以上あれば再分析できる
- 判定対象は常に「保存済みの有効なFactすべて + 今回追加する有効なFact」
- 解釈を含むFactは自動修正・自動保存しない。ユーザーが書き換えて再判定する
- スコアは0〜100の整数とし、確率ではなくSignal Scoreとして扱う
- 1回の分析結果をAnalysis Snapshotとして不変保存する。過去Snapshotは更新しない
- タイムゾーン表示はブラウザのローカル時刻、DB保存はUTCとする
- 認証はMVPではEmail Magic Linkを第一候補とする。パスワード認証は必須にしない
- SNS共有は個人名やFact本文を含まない画像の生成・保存・共有までとし、公開プロフィールは作らない

---

# 26. Information Architecture

## Public Routes

`/`

Landing Page。CTAからFact入力へ遷移する。

`/analyze`

ゲスト向けFact入力、Validation、分析中表示、初回Resultを同一フローで扱う。

`/auth`

Email Magic Linkの送信、認証完了、ゲスト分析の保存確認。

## Authenticated Routes

`/home`

Relationship一覧。各RelationshipのCurrent Signalと直近変化を表示する。

`/relationships/new`

Relationship名を設定し、初回Factを登録する。

`/relationships/[relationshipId]`

Current Signal、Trend、History Graph、Recent Factsを表示する。

`/relationships/[relationshipId]/facts/new`

新しいFactの入力、Validation、再分析を行う。

`/relationships/[relationshipId]/history`

全Analysis Snapshotを新しい順に表示する。

`/relationships/[relationshipId]/settings`

表示名の変更とRelationship削除を行う。

存在しない、または所有していないRelationshipへのアクセスは、情報漏えいを避けるため同じ404表示にする。

---

# 27. Screen Specification

## Landing

表示順：

1. SIGNALロゴ
2. メインコピー
3. サブコピー
4. Primary CTA「分析してみる」
5. 3ステップ説明「事実を入力 → AIが評価 → 変化を記録」
6. Disclaimerへの短い導線

CTA押下で`/analyze`へ遷移する。ログインモーダルは出さない。

## Fact Input

初期状態では3枚のFact Cardを表示する。

各Card：

- `FACT 01`の連番
- 複数行Text Area
- 例文Placeholder
- 文字数表示
- Validation状態
- 4枚目以降にのみ削除ボタン

入力制約：

- 1件あたり10〜300文字
- 前後の空白を除去する
- 空欄は件数に含めない
- 最大10件まで同時入力できる
- 同一送信内の完全一致文は重複として扱い、送信させない

「分析する」は3件以上が入力済みの場合のみ有効にする。押下後、まずFact Validationを実行する。

## Fact Validation Result

各Factに以下のいずれかを表示する。

- `事実として使用できます`
- `解釈が含まれています`
- `判定できませんでした`

解釈を含む場合は短い理由と、観測可能な表現への書き換え例を1つ表示する。書き換え例を自動で入力欄に反映しない。

すべてのFactが有効になった場合のみ「この内容で分析する」を有効にする。

## Analysis Loading

二重送信を防止し、入力編集を一時的に無効化する。

表示文言：

「入力された出来事を評価しています」

10秒を超えた場合も進捗率は表示せず、「通常より時間がかかっています」を追加する。

## Result

表示順：

1. `Romantic Interest Signal`
2. Current Score
3. Previous Scoreと差分。初回は`First analysis`
4. Disclaimer
5. Desire to Meet / Initiative / Evidence Sufficiency
6. 今回追加したFactとImpact
7. Primary CTA
8. Share CTA

ゲストのPrimary CTAは「結果を保存する」、ログイン済みでは「新しい事実を追加する」とする。

差分はCurrent minus Previous。プラスには`+`、ゼロには`±0`、マイナスには`−`を付ける。

## Home

Relationship Cardには以下だけを表示する。

- Display Name
- Current Romantic Interest Signal
- 前回比
- 最終分析日

Relationshipが0件の場合はEmpty Stateと「最初の分析を始める」CTAを表示する。

## Relationship Detail

上部にResultの要約、その下にHistory Graph、Recent Factsを表示する。

GraphはRomantic Interest Signalのみを主線とする。4指標を同時表示して読みにくくしない。各点を選択すると日付とスコアを表示する。

Recent Factsは新しい順に最大5件表示し、全文履歴への導線を置く。

## Delete Relationship

確認DialogにRelationship名を表示する。削除後は関連FactとAnalysis SnapshotをDBのCascadeで削除し、`/home`へ戻す。復元機能はMVPに含めない。

---

# 28. Client State and Flow

## Guest Flow

1. Factを入力
2. `POST /api/facts/validate`
3. ユーザーが無効なFactを書き換える
4. `POST /api/analyses/preview`
5. Resultを`sessionStorage`へ保存して表示
6. 「結果を保存する」で認証へ遷移
7. 認証後、同じFactを`POST /api/relationships`へ送信
8. Backendが再検証・再分析し、Relationship、Facts、Snapshotを保存
9. Relationship Detailへ遷移

`sessionStorage`のKeyは`signal.guestAnalysis.v1`とする。保存対象はFact原文、Relationship仮名、Preview結果、作成時刻。24時間を超えたデータはクライアント起動時に破棄する。

認証後の保存ではPreview値を信頼せず、必ずBackendで再分析する。そのため、保存後の値がPreviewからわずかに変わる可能性を認証画面に明記する。

## Authenticated Re-analysis Flow

1. 新Factを入力
2. Fact Validation
3. 確認後にAnalysis APIを呼ぶ
4. Backendが所有権を確認
5. 保存済みFactと新Factを使ってJevを呼ぶ
6. DB Transactionで新FactとSnapshotを保存
7. Resultへ遷移

Jev呼び出しに失敗した場合、新FactもSnapshotも保存しない。ユーザーの入力は画面に残して再試行できるようにする。

---

# 29. Fact Validation Contract

Fact Validationは各文を以下のSchemaで返す。

```ts
type FactValidationStatus =
  | "observable"
  | "interpretation"
  | "unclear";

type FactValidationResult = {
  clientFactId: string;
  status: FactValidationStatus;
  reasonJa: string;
  rewriteExampleJa: string | null;
  translatedFactEn: string | null;
};
```

判定基準：

- `observable`: 第三者が行動・発言・回数・時間として記述できる
- `interpretation`: 感情、意図、性格、好意を推測している
- `unclear`: 文脈不足、意味不明、複数解釈があり安定して評価できない

`translatedFactEn`は`observable`の場合のみ返す。原文にない主語、頻度、感情、因果関係を追加しない。

ValidationのAI出力はJSON Schemaで検証する。不正な出力は1回だけ再試行し、それでも失敗した場合は`VALIDATION_UNAVAILABLE`を返す。

---

# 30. Analysis Contract

```ts
type ImpactCategory =
  | "strong_positive"
  | "positive"
  | "neutral"
  | "negative"
  | "strong_negative";

type AnalysisResult = {
  scores: {
    romanticInterest: number;
    desireToMeet: number;
    initiative: number;
    evidenceSufficiency: number;
  };
  impact: {
    category: ImpactCategory;
    factIds: string[];
  } | null;
  modelVersion: string;
  rubricVersion: string;
};
```

全スコアは0〜100の整数。範囲外、少数、欠損、未知Keyを含む応答は無効とする。

初回分析の`impact`は`null`。再分析では今回追加されたFact群が前回Snapshotに対して与えた方向を返す。Impactはスコア差分だけから機械的に決めず、Judgeに今回追加分を明示して評価させる。

ユーザー向けにはJudgeの長文Reasoningを保存・表示しない。運用ログにもChain of Thoughtを要求しない。

---

# 31. Judge Rules

Jevへ渡すSystem Instructionは最低限以下を含む。

- あなたは恋愛相談役ではなく、観測された出来事を一定のRubricで採点するJudgeである
- 相手の感情を断定しない
- ユーザーの希望に合わせてスコアを調整しない
- 入力されたFact以外を推測・補完しない
- 性別、性的指向、文化的背景を決めつけない
- Evidenceが少ない場合、Romantic Interestを極端な値にしない
- Desire to MeetとRomantic Interestを同一視しない
- Initiativeは相手側の具体的行動のみを主に評価する
- 明示的な拒否、継続的なキャンセル、連絡断絶は負のEvidenceになり得るが、単独で感情を断定しない
- 指定されたJSON Schemaだけを返す

Judgeの入力は次の構造に統一する。

```ts
type JudgeInput = {
  facts: Array<{
    id: string;
    textEn: string;
    isNew: boolean;
  }>;
  previousScores: AnalysisResult["scores"] | null;
  rubricVersion: string;
};
```

Jev SDKやHTTP形式は`JudgeProvider` interfaceの内部へ閉じ込め、Route HandlerやDB層から直接参照しない。

```ts
interface JudgeProvider {
  validateFacts(facts: Array<{ id: string; textJa: string }>):
    Promise<FactValidationResult[]>;
  analyze(input: JudgeInput): Promise<AnalysisResult>;
}
```

これにより、Jev API仕様の変更やテスト用Fakeへの差し替えをUIとDBから分離する。

---

# 32. Backend API

すべてNext.js Route Handlerで提供し、JSONを返す。Jev API KeyとSupabase Secret KeyはServer環境変数に限定する。

## `POST /api/facts/validate`

Auth: 不要。

Request:

```json
{
  "facts": [
    { "clientFactId": "uuid", "text": "相手から食事に誘われた" }
  ],
  "jevConsent": true
}
```

`jevConsent` は `true` リテラル必須。Fact本文がJevへ送信されることを、利用規約・プライバシーポリシー画面で明示し、UIでのチェックボックス同意を得てから送ること。`false` や欠落時は `INVALID_REQUEST` (400) を返す。

Response: `FactValidationResult[]`

## `POST /api/analyses/preview`

Auth: 不要。

条件：Observable Factが3〜10件。

Request: `/api/facts/validate` と同じ `facts` + `jevConsent: true` 形式。同意ゲートも同じ。

DBへ保存しない。IP単位と匿名Session単位でRate Limitする。

Response: `AnalysisResult`

## `POST /api/relationships`

Auth: 必須。

Request:

```json
{
  "displayName": "Aさん",
  "facts": [
    { "clientFactId": "uuid", "text": "相手から食事に誘われた" }
  ],
  "idempotencyKey": "uuid",
  "jevConsent": true
}
```

`jevConsent: true` 必須（validate / preview と同じ規約）。同意が得られていない場合は保存を実行しない。

Backendで再Validation・再Analysisした後、Relationship、Facts、SnapshotをTransactionで保存する。

## `GET /api/relationships`

Auth: 必須。所有するRelationshipの要約を返す。

## `GET /api/relationships/[id]`

Auth: 必須。Relationship、直近Snapshot、直近5 Factsを返す。

## `PATCH /api/relationships/[id]`

Auth: 必須。`displayName`のみ変更可能。

## `DELETE /api/relationships/[id]`

Auth: 必須。所有権確認後に削除する。

## `POST /api/relationships/[id]/analyses`

Auth: 必須。

Request:

```json
{
  "facts": [
    { "clientFactId": "uuid", "text": "相手から食事に誘われた" }
  ],
  "idempotencyKey": "uuid",
  "jevConsent": true
}
```

新Fact、`idempotencyKey` に加え `jevConsent: true` を受け取り、Validation、Jev Analysis、Fact/Snapshot保存を行う。`jevConsent` は `/api/relationships` と同じ規約。

## `GET /api/relationships/[id]/history`

Auth: 必須。Snapshotを`createdAt ASC`で返す。

## `POST /api/share-card`

Auth: 不要。4スコア、差分、更新日だけを受け取り、PNGを返す。文字列のRelationship名やFact本文はRequestとして受け付けない。

## Common Error Shape

```ts
type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    retryable: boolean;
    fieldErrors?: Record<string, string>;
  };
};
```

主なCode：

- `INVALID_REQUEST`
- `AUTH_REQUIRED`
- `NOT_FOUND`
- `FACT_NOT_OBSERVABLE`
- `INSUFFICIENT_FACTS`
- `VALIDATION_UNAVAILABLE`
- `ANALYSIS_UNAVAILABLE`
- `RATE_LIMITED`
- `CONFLICT`

---

# 33. Database Detailed Design

`auth.users`を認証のSource of Truthとし、独自の`users` tableはMVPでは作らない。プロフィール属性が必要になった時点で`profiles`を追加する。

## Enums

```sql
create type public.fact_validation_status as enum (
  'observable',
  'interpretation',
  'unclear'
);

create type public.impact_category as enum (
  'strong_positive',
  'positive',
  'neutral',
  'negative',
  'strong_negative'
);
```

## relationships

```sql
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
display_name text not null check (char_length(display_name) between 1 and 40)
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

Index: `(user_id, updated_at desc)`

## facts

```sql
id uuid primary key default gen_random_uuid()
relationship_id uuid not null references public.relationships(id) on delete cascade
text_original text not null check (char_length(text_original) between 10 and 300)
text_english text not null check (char_length(text_english) between 1 and 600)
validation_status public.fact_validation_status not null
validation_reason text not null
created_at timestamptz not null default now()
```

MVPで保存するFactは`observable`のみ。Statusを保持するのは監査可能性と将来のRubric変更に備えるため。

Index: `(relationship_id, created_at asc)`

## analysis_snapshots

```sql
id uuid primary key default gen_random_uuid()
relationship_id uuid not null references public.relationships(id) on delete cascade
previous_snapshot_id uuid null references public.analysis_snapshots(id) on delete set null
trigger_fact_ids uuid[] not null default '{}'
included_fact_ids uuid[] not null
romantic_interest smallint not null check (romantic_interest between 0 and 100)
desire_to_meet smallint not null check (desire_to_meet between 0 and 100)
initiative smallint not null check (initiative between 0 and 100)
evidence_sufficiency smallint not null check (evidence_sufficiency between 0 and 100)
impact public.impact_category null
model_version text not null
rubric_version text not null
idempotency_key uuid not null
created_at timestamptz not null default now()
unique (relationship_id, idempotency_key)
```

初回Snapshotでは`previous_snapshot_id`と`impact`を`null`、`trigger_fact_ids`は初回Factすべてとする。

Index: `(relationship_id, created_at asc)`

`included_fact_ids`と`trigger_fact_ids`に存在しないIDが入らないことは、Backend Transaction内で検証する。MVPでは配列要素への外部Key制約を無理に実装しない。

## Atomic Save

Jev応答のSchema検証後、DB functionで次を不可分に保存する。

1. 新しいFacts
2. Analysis Snapshot
3. `relationships.updated_at`

同じ`idempotency_key`の再送時は、新規行を作らず既存Snapshotを返す。

このFunctionは`security invoker`のままとし、`PUBLIC`、`anon`、`authenticated`から`EXECUTE`をRevokeしてServer専用RoleだけにGrantする。Function内部でも受け取ったUser IDとRelationship所有者を照合し、Secret KeyによるRLS bypassを認可の代用にしない。

---

# 34. Authentication and Session

Supabase AuthのEmail Magic Linkを利用する。Next.jsではServerでCookieベースのSessionを扱い、保護RouteとAPIの両方でユーザーを検証する。

Frontendへ公開してよいのはSupabase URLとPublishable Keyのみ。Secret Key、Service Role Key、Jev API Keyには`NEXT_PUBLIC_` prefixを付けない。

認証前のFactはSupabaseへ保存しない。Magic Linkが別Tabで開いた場合に備え、認証完了画面で元Tabの`sessionStorage`が見つからない場合は「分析結果を保存するには元のタブへ戻ってください」と案内する。

ログアウト時はSessionを破棄して`/`へ戻す。ゲスト分析データも同時に消去する。

---

# 35. Row Level Security

`public.relationships`、`public.facts`、`public.analysis_snapshots`はすべてRLSを有効にする。

Relationshipsは`user_id = (select auth.uid())`の場合だけSELECT / INSERT / UPDATE / DELETEを許可する。UPDATEには`USING`と`WITH CHECK`の両方を設定する。

FactsとSnapshotsは、親Relationshipの`user_id = (select auth.uid())`を`exists`で確認する。単に`TO authenticated`だけのPolicyにはしない。

Clientからの直接INSERT / UPDATEを許可するかは実装方式に合わせるが、MVPの書き込みはBackend APIへ統一する。Secret Keyを使うServer処理でも、API入口で必ずSession UserとRelationship所有者を照合する。

認可に`user_metadata`を使用しない。Viewを作る場合は`security_invoker = true`を明示する。

RLSテストでは最低限、User AがUser BのRelationship、Fact、SnapshotをSELECT / UPDATE / DELETEできないことを確認する。

---

# 36. Score and History Rules

Current Scoreは最新Snapshotの値。Previous Scoreは`previous_snapshot_id`が指すSnapshotの値。

同一時刻の並び順が曖昧にならないよう、取得時は`created_at`に加えて`id`で安定Sortする。

History Graph：

- X軸: Snapshot作成日時
- Y軸: 0〜100固定
- 2件未満の場合は線を描かず点だけ表示
- 30件までは全点、31件以上は期間に応じて表示点を間引く
- 元データは省略せずHistory一覧で確認できる

色に加えて矢印、符号、Text Labelで増減を示す。

---

# 37. Share Card Specification

サイズはSNSで扱いやすい`1200 x 630 px`。

表示内容：

- SIGNAL
- Romantic Interest Signal
- Current Score
- 前回比。初回は`First analysis`
- Evidence Sufficiency
- Updated Date
- 短いDisclaimer

含めないもの：

- Relationship名
- Fact原文・英訳
- User ID
- メールアドレス
- 履歴全体

生成後はWeb Share APIが利用可能なら共有Sheetを開き、未対応環境ではPNG Downloadを提供する。

---

# 38. Visual Tokens

実装時の初期Token：

```txt
Background       #F7F7F5
Surface          #FFFFFF
Text Primary     #18181B
Text Secondary   #71717A
Border           #E4E4E7
Accent           #5B5BD6
Accent Subtle    #EEEEFF
Positive         #15803D
Positive Subtle  #ECFDF3
Negative         #B42318
Negative Subtle  #FEF3F2
Focus Ring       #4F46E5
```

TypographyはOS標準または可読性の高いSans Serifを使う。数字はTabular Numeralsを有効にする。

```txt
Score        64px / 0.95 / 700
Page Title   28px / 1.2 / 700
Section      18px / 1.35 / 600
Body         16px / 1.6 / 400
Caption      13px / 1.5 / 500
```

Spacingは4px Grid。Card radiusは16px、Input/Buttonは12px、Primary Buttonの最小高は48pxとする。

Animationは150〜250msを基本とし、`prefers-reduced-motion`では不要なTransitionを無効化する。

---

# 39. Accessibility

目標はWCAG 2.2 AA相当。

- Text Contrast 4.5:1以上
- 大きな文字は3:1以上
- Pointer Targetは最低44 x 44px
- Keyboardだけで全操作可能
- Focus Indicatorを常に視認可能にする
- Validation Errorは色だけでなくIcon、見出し、説明文で示す
- Error Summaryから該当Factへ移動できる
- Graphには同じ内容の表または一覧を用意する
- Score更新を`aria-live`で簡潔に通知する
- Loading中は`aria-busy`を設定する
- Icon ButtonにはAccessible Nameを付ける

---

# 40. Error and Recovery UX

Network Error：入力を保持し、「接続を確認して再試行してください」を表示する。

Validation / Analysis Provider Error：入力を保持し、再試行CTAを表示する。失敗時に0点を表示しない。

Rate Limit：再試行可能時刻を可能な範囲で表示する。

Session Expired：Fact入力を`sessionStorage`へ退避してから認証画面へ遷移し、復帰後に再開する。

Conflict：同じIdempotency Keyですでに完了済みの場合は既存結果を表示する。

削除失敗：画面から先に消さず、失敗Messageを表示して状態を維持する。

---

# 41. Privacy and Logging

Fact本文は機微情報として扱う。

- Application LogへFact原文、英訳、Relationship名を出力しない
- Error TrackingへRequest Bodyを送らない
- ログには`requestId`、処理時間、HTTP Status、Provider Error Codeのみを残す
- Analytics EventにスコアやFact本文を含めない
- Jevへ送る内容はFact英訳と判定に必要な最小限のMetadataに限定する
- 削除API完了後、DB上の関連行がCascade削除されたことを確認する
- Backupからの消去期間は利用するSupabase Planの保持仕様に合わせ、Privacy Policyへ明記する

MVPで計測してよいEvent：

- `landing_cta_clicked`
- `fact_validation_completed`
- `analysis_completed`
- `save_result_started`
- `relationship_created`
- `fact_added`
- `share_card_generated`

---

# 42. Performance and Reliability

目標値：

- Landing LCP: 2.5秒以内（p75、Mobile）
- 非AI API: 1秒以内（p95）
- Fact Validation: 8秒以内を目標
- Analysis: 15秒以内を目標
- API Timeout: Validation 20秒、Analysis 30秒

外部AI呼び出しはTimeoutを設定する。自動RetryはNetwork Errorまたは5xxに対して最大1回だけ行い、同じIdempotency Keyを維持する。

Rate Limitの初期値：

- Guest Validation: 20 requests / hour / IP
- Guest Preview Analysis: 5 requests / hour / IP
- Authenticated Analysis: 20 requests / day / user
- Share Card: 30 requests / hour / IP

値は運用データとJev費用を見て環境変数で調整可能にする。

---

# 43. Acceptance Criteria

## First Analysis

- 未ログインでLandingからFact入力へ進める
- Observable Factが3件未満では分析を開始できない
- 主観文に理由と書き換え例が表示される
- 主観文が残っている状態では分析を開始できない
- 正常時に4スコアが0〜100の整数で表示される
- Romantic Interestが確率や相手の感情の断定として表示されない
- Provider Error時に入力内容が失われない

## Account and Save

- ResultからMagic Link認証へ進める
- 認証後にFactと分析結果が自分のRelationshipとして保存される
- Preview結果をそのままDBへ信用保存しない
- 他ユーザーのURLを指定してもデータを取得できない

## Re-analysis

- 新しいObservable Fact 1件で再分析できる
- 新Fact、Snapshot、前回Snapshotとの関連が保存される
- Current、Previous、差分、Impactが表示される
- 同じRequestの再送でFactやSnapshotが重複しない

## History

- Snapshotが時系列で表示される
- GraphとTextの履歴が同じ値を示す
- Snapshot 1件でも壊れずに表示できる

## Delete

- Relationship削除前に確認がある
- 削除後、関連FactsとSnapshotsへアクセスできない
- User AはUser BのRelationshipを削除できない

## Share

- Share CardにRelationship名、Fact本文、ユーザー識別子が含まれない
- Web Share API未対応環境でPNGをDownloadできる

## Responsive and Accessibility

- 360px幅で横Scrollが発生しない
- 200% Zoomで主要操作が欠けない
- KeyboardのみでFact入力からResultまで操作できる
- 色覚に依存せず増減とValidation状態を理解できる

---

# 44. Implementation Order

## Phase 1: Foundation

- Next.js / TypeScript / Tailwind初期化
- Design Tokensと共通Layout
- Supabase local環境、Schema、RLS、型生成
- JudgeProvider interfaceとFake実装

## Phase 2: Guest Core Flow

- Landing
- Fact Card入力
- Validation API / UI
- Preview Analysis API
- Result UI
- sessionStorage復元

## Phase 3: Persistence

- Magic Link認証
- Relationship作成
- Facts / SnapshotのAtomic Save
- Home / Relationship Detail
- 所有権・RLS Test

## Phase 4: Change and History

- Fact追加
- Previous / Current / Impact
- History一覧
- Graph

## Phase 5: Share and Hardening

- Share Card
- Rate Limit
- Error Recovery
- Accessibility Test
- Mobile / Desktop QA
- Privacy Logging Audit

各PhaseではFake JudgeでE2Eを安定させた後、Jev Sandbox、最後にProduction Keyへ切り替える。

---

# 45. Decisions Required Before Jev Integration

以下はJevの正式なAPI資料を確認して確定する。確認前に推測でSDK名やEndpointを実装しない。

- Base URLと認証方式
- JSON SchemaによるStructured Outputの対応範囲
- Timeout、Rate Limit、最大入力長
- Model / JudgeのVersion固定方法
- Data retentionと学習利用の有無
- 日本語入力を直接送る場合と英訳を挟む場合の精度差
- Sandbox環境の有無
- エラーCodeとRetry可能条件

Jev連携前でも`JudgeProvider`のFakeを使い、LandingからHistoryまでのMVP UIと保存処理を実装・検証できる状態にする。

---

# 46. Conversion after Guest Result

初回診断は可能ならログイン不要。

Flow:

Landing  
→ Facts  
→ Analysis  
→ Result

Result後：

「この関係の変化を記録しますか？」

CTA:

「記録を始める」

ここでAccount Creation。

ログインがConversionの障壁にならないようにする。

---

# 47. Product Performance Notes

Target:

Landing LCP &lt; 2.5 sec

Judge request:

Loading UIを必ず表示。

Judge中：

「入力された事実を分析しています」

など短い表示。

Jevが失敗した場合はretry可能にする。

---

# 48. Product Analytics and KPIs

最低限以下を計測：

landing_view

start_analysis

fact_added

fact_rejected_subjective

analysis_requested

analysis_completed

signup_started

signup_completed

relationship_created

return_fact_added

share_clicked

最重要KPI：

Analysis Completion Rate

Signup after Analysis

D1 / D7 Return

Facts per Relationship

Analyses per User

Share Rate

---

# 49. Product Success Hypothesis

検証したい仮説：

H1:  
ユーザーは「脈あり診断」を一度試したい。

H2:  
単発診断だけでなく、新しい出来事が発生すると再訪する。

H3:  
単純なAI相談より「数値の変化」の方が継続利用を生む。

H4:  
Fact-onlyという制約が既存AI恋愛相談との差別化になる。

最重要なのはH2。

ユーザーが新しいFactを継続して追加しない場合、

Mobile App化を急がない。

---

# 50. Definition of Done — MVP

ユーザーが初めてサイトを訪問してから、

1. サービスの意味を理解
2. 3つ以上Factを入力
3. 主観的入力が検出される
4. 分析を実行
5. 4つのSignalを確認
6. Accountを作成
7. Relationshipとして保存
8. 後日Factを追加
9. Signalが再計算
10. 前回との差を見る

まで一連で動作すること。

---

# 51. Core Principle

このサービスの価値は、

「AIが恋愛について話してくれること」

ではない。

価値は、

**ユーザーの主観と、実際に起きた出来事を分離し、出来事の積み重なりを同じ基準で継続的にJudgeすること。**

迷った場合は、この原則に最も近い実装を選択すること。

---

# 52. Initial Release Focus — Women First

初期リリースの獲得・検証対象は、以下のPersonaへ絞る。

- 20〜29歳程度の女性
- マッチングアプリで知り合った相手と、1〜数回会っている
- 相手が自分に興味を持っているかを、感情論ではなく整理したい
- 新しい連絡や次のデートのたびに、関係性の変化を確認したい

これはMarketingとUX検証の焦点であり、アカウント作成や機能利用を性別で制限するものではない。UI、FactのRubric、DB、認可は従来どおりジェンダー・性的指向に依存しない。

初期Landingでは「マッチングアプリで出会った相手との、交際前の関係を記録する」という状況を明示する。女性向けとした理由は、最初のコピー、Example Fact、インタビュー対象、獲得Channelを一つの明確な仮説へ揃えるためである。

初期インタビューでは最低10人に、以下を確認する。

- 最初に使いたいと思う場面
- 事実入力が負担になる瞬間
- 次にFactを追加したくなる出来事
- 数値・履歴に対して支払う価値があるか
- 不安を過度に強める表現がないか

---

# 53. Engagement Design

目標は無目的に滞在時間を伸ばすことではなく、「出来事が起きた時に、また戻って記録したくなる」継続利用を作ること。

## Core Loop

```txt
新しい出来事
→ Factを短く記録
→ 何が変わったかを確認
→ 次に記録すべきタイミングを理解
→ 次の出来事で再訪
```

## MVP+ Improvements

Result画面には長文アドバイスではなく、以下を追加する。

- `今回の変化`: Previous / Current / Delta
- `主なEvidence`: 「会う提案」「相手発の連絡」「予定変更」など、Factから抽出した最大3つの短いLabel
- `Evidence不足`: 判断できない理由を最大2つの短いLabelで示す
- `次の記録`: 「次に会った時」「相手から連絡があった時」のような、次のFact追加を促すCTA

JudgeはChain of Thoughtを保存・表示しない。Evidence LabelはFactを分類した短い構造化Outputであり、ユーザーの感情や将来を断定しない。

## Retention Mechanics

- 分析直後にアカウント作成を求めず、Result価値を見せてから「この変化を保存する」を提示する
- HomeではCurrent Scoreだけでなく、最後に追加したFactと前回比を表示する
- Relationship DetailではHistory GraphとRecent Factsを同じ画面に置く
- 再訪導線は「新しい事実を追加する」をPrimary CTAに固定する
- EmailはOpt-inに限り、Fact本文・Scoreを含めないリマインダーのみを将来検証する。Push NotificationはMVPに含めない
- Streak、連続ログイン、恐怖を煽るCountdownは使わない

---

# 54. Monetization Strategy

課金対象は「相手の気持ちを知ること」ではなく、「関係性の変化を継続して記録・比較できること」とする。不安を強めて購入を促す設計は採用しない。

## Phase 0: Free Beta

MVP Beta中は決済を実装しない。初回分析と保存・再分析・履歴を無料で提供し、継続利用と支払い意向を測る。

2回目の分析完了後にだけ、任意の`SIGNAL Plus`紹介画面を表示する。ここでは決済せず、興味あり / 今は不要 / 価格が高い の選択肢を記録する。

## Phase 1: Price Validation

価格仮説として、月額¥490、年額¥3,900をA/Bではなく順番に検証する。対象は保存済みRelationshipを再分析したユーザーに限定する。

Free案：

- 1 Relationship
- 初回分析と、月2回までの再分析
- 直近14日間のHistory

Plus案：

- 複数Relationship
- 再分析回数の上限なし
- 全期間Historyと変化の詳細
- Share Cardの保存

削除、Fact閲覧、既存データのExportを課金で制限しない。

## Phase 2: Payment

以下を満たした場合にのみ、Stripe等によるWeb Subscriptionを実装する。

- D7 Return Rateが15%以上
- 保存済みRelationshipあたりの30日再分析回数が平均1.5回以上
- SIGNAL Plus紹介のInterest Rateが5%以上
- 価格インタビューで、解決したい継続価値が確認できる

決済導入後も、購入前に価格、更新頻度、解約方法を明確に表示する。無料トライアル終了直前の不安を煽る通知や、解約導線の隠蔽はしない。

---

# 55. Growth Metrics and Decision Gates

Fact本文、Score、Relationship名をAnalyticsへ送らない。計測するのは匿名化されたProduct Eventと集計値だけとする。

| Stage | Primary Metric | Initial target | Decision |
| --- | --- | --- | --- |
| Acquisition | Landing → Fact Input | 35% | Copyと流入Channelを見直す |
| Activation | Fact Input → First Analysis | 60% | 入力負担・Validationを見直す |
| Save | Result → Account Save | 35% | Result価値・保存導線を見直す |
| Retention | D7 Return | 15% | 再訪TriggerとHistory価値を見直す |
| Habit | 30日再分析回数 / 保存Relationship | 1.5 | Mobile App・通知に投資しない |
| Monetization | Plus Interest | 5% | 実決済を実装しない |

初期リリースでは、滞在時間を主要KPIにしない。高い滞在時間が不安の増幅や入力の分かりにくさを示す可能性があるためである。分析完了、保存、再分析、D7 Returnを優先する。

---

# 56. Judge Versioning and Golden Fact Set

## Versioning

Judge層が返す `AnalysisResult` には以下のバージョン識別子を含める。**バージョンを上げる際はSPEC.mdを必ず更新する**。

| Field | Source | Purpose |
| --- | --- | --- |
| `modelVersion` | TypeSafe のモデルID（`jev-latest` 等）または FakeJudge の固定文字列 | LLMの変更・差し替えを識別 |
| `rubricVersion` | `src/lib/judge/versions.ts` の `RUBRIC_VERSION` | プロンプト・採点ルーブリック文章の変更を識別 |
| `scoreSchemaVersion` | `src/lib/judge/versions.ts` の `SCORE_SCHEMA_VERSION` | `AnalysisResult` JSON schema のフィールド増減・名称変更を識別 |

`src/lib/judge/versions.ts` の定数とプロバイダが返す文字列が一致しない場合、`assertProviderMatchesExpectedVersions` ルールが失敗する。CI で必ず検出される。

## Golden Fact Set

`src/lib/judge/golden-fact-set.ts` に、人手を一切介さない合成データのみを集めた比較対象（Golden Fact Set）を置く。Judge の drift を CI で検出するために使う。

ルール:

- **実ユーザーデータを絶対に入れない**
- 各 fixture は `textJa` と `textEn` を必ず両方持ち、Jev と翻訳パイプライン（#78）の両方を同じ入力で検証できるようにする
- `expectedValidation` は `observable` / `interpretation` / `unclear` のいずれか
- `GOLDEN_SCENARIOS` の `expectedRange` はスコアが取るべきレンジ。FakeJudge で記録された範囲を pin し、Jev への切替時に範囲を逸脱したら CI が落ちる
- セットは20件未満に保つ。CI ビルドで毎回走る
- レンジを更新する場合は「レンジ更新の理由」を commit message に書く

Invariant rules (`src/lib/judge/invariants.ts`) は以下の6本。`DEFAULT_INVARIANT_CHECKS` にまとめて CI から `runInvariants(provider, DEFAULT_INVARIANT_CHECKS)` で実行する:

| Rule | 検査対象 |
| --- | --- |
| `score.bounds` | スコアが整数かつ [0, 100] |
| `versioning.present` | `modelVersion` / `rubricVersion` / `scoreSchemaVersion` が空でない |
| `interpretation.rejected` | 解釈文は `romanticInterest <= 60` |
| `evidence.low_confidence` | 1件だけの入力で `evidenceSufficiency <= 50` |
| `validation.gate` | 解釈・不明文を `validateFacts` が確実に reject する |
| `versioning.matches_expected` | プロバイダ返り値が `versions.ts` の定数と一致する |

## Drift 検出ハーネス

- ユニットテスト: `npm test` で FakeJudgeProvider に対する invariants と Golden Set を検証
- 合成評価: `npm run evaluate:jev`（`scripts/evaluate-jev.mjs`）で Jev に対する合成評価を実行し、`usage` とスコアを JSON で取得
- CI: モデル変更 PR では Jev 合成評価の差分を人間がレビューする
- Golden Set のレンジを更新する PR では `evaluation_results.json` を同 PR に含める

## #78 翻訳パイプラインとの接続

JP/EN 両入力に対する drift 検出は `GOLDEN_FACTS[].textEn` と `GOLDEN_SCENARIOS[].factsEn` を使う。Jev への送信は常に翻訳後 EN で行い、JP 直接入力との diff で翻訳品質を計測する（ベンチ結果は `evaluation_results.json` に追記）。

---

# 78. JP→EN Translation Pipeline

## 目的

ユーザー入力の日本語 Fact を、レビュアー向けの監査記録と、Jev の安定スコア用として英語に翻訳する。

## 設計

- `FactTranslator` interface (`src/lib/judge/translator.ts`) はブラウザ／ネイティブクライアントから読み込まない。翻訳は必ず Server で行う。
- 実装は `JevTranslationAdapter` (`src/lib/judge/translator-jev.ts`) と `NoOpTranslator`（静的デモ／フォールバック）。
- 解決順は `getFactTranslator()` (`src/lib/judge/translator-registry.ts`):
  1. `SIGNAL_TRANSLATOR_PROVIDER` 環境変数で `jev` / `noop` / `disabled` を切替
  2. `TYPESAFE_API_KEY` が設定されていれば `jev` を既定
  3. いずれも無ければ `noop`
- ルートハンドラ (`/api/facts/validate`, `/api/analyses/preview`) は翻訳→Judge評価の順で呼び、`translationSkipped` フラグを結果に同梱
- DB には `facts.text_original`（日本語原文）／ `facts.text_english`（英訳）／ `facts.translation_version`（翻訳実装の識別子）／ `facts.translation_skipped`（NoOp フォールバックか）を保存

## 不変条件（翻訳が破ったら reject）

`assertTranslationInvariants` が `JevTranslationAdapter` 内部で翻訳ごとに評価する。違反した翻訳は `FactTranslationError` を投げ、ルートハンドラは `TRANSLATION_FAILED` を返す。

| Invariant | 規則 |
| --- | --- |
| `no_summarization` | 英訳の文字数が原文の `[0.55, 6.0]` 倍から外れたら reject |
| `preserve_negation` | 原文に ない / なかった / ません / ませんでした / 否定 がある場合、英訳に `not` / `never` / `no longer` / `no reply` のいずれかが無ければ reject。`に違いない` / `しかない` / `ではない` / `んじゃない` は除外 |
| `no_intent_inference` | 英訳に `in love` / `romantic` / `interested` / `affection` が現れたが、原文に `好き` / `恋愛` / `好意` / `興味` / `気がある` が無い場合は reject |

## ベンチマーク

`src/lib/judge/translator-golden-benchmark.test.ts` が Golden Fact Set をすべて翻訳し、不変条件を満たすことを確認する。`JevTranslationAdapter` を継承したスタブで `textJa → textEn` の固定マッピングを返すので、`TYPESAFE_API_KEY` 不要で CI できる。

## DB スキーマ

マイグレーション `20261008030000_add_fact_translation_version.sql` と `20261008030500_add_reanalysis_translation_metadata.sql` で `facts.translation_version`（text）と `facts.translation_skipped`（boolean, default true）を追加。`create_initial_relationship_analysis` と `append_facts_and_analysis` のRPCは入力 JSONB に `translation_version` と `translation_skipped` を受け取り、行ごとに保存する。

## Edge Function / Native への波及

Native 経路（`ServerJudgeGateway` → Supabase Edge Function `signal-api`）は将来的に Edge Function 側で翻訳を行う。`signal-api` 内の `parseFacts` / `parseAnalysisRequest` が `translationVersion` と `translationSkipped` を受け取り、`translate` を Edge Function 内部で呼ぶ形が次の作業。Web 側は本 Issue で完成。

---

# 72. SIGNAL LEVEL Semantics

## 結論

- **SIGNAL LEVEL は `romanticInterest` のエイリアスではない独立した総合指標**（Option B）。
- 4つの sub-score のうち `romanticInterest` / `desireToMeet` / `initiative` の重み付き合成を `signalLevel` とし、`evidenceSufficiency` はメタ tier としてのみ表示を制御する。
- score schema を `v1` から `v2` にバンプし、`AnalysisResult.scores.signalLevel` を正式フィールドとして追加。

## Rubric

`src/lib/judge/signal-level.ts` `computeSignalLevel` が以下の固定重みで計算する（`RUBRIC_VERSION = "signal-rubric-v1"` まで固定）。

```
signalLevel = clamp(round(0.40 × romanticInterest + 0.30 × desireToMeet + 0.30 × initiative))
```

- 必ず [0, 100] の整数に丸める。非有限値（Infinity / NaN）は 0 として扱う。
- `evidenceSufficiency` は SIGNAL LEVEL の式に含めない。混ぜると「入力の手間」と「SIGNAL 強さ」が混ざる。

重みを変更したい場合は:

1. `signal-level.ts` の `SIGNAL_LEVEL_WEIGHTS` を更新
2. `RUBRIC_VERSION` をバンプ
3. SPEC §72 を改訂
4. Golden Set を新式で再評価し、レンジを PR で更新

## Evidence Sufficiency tier

`evidenceSufficiency` を「4番目の小スコア」として表示せず、tier で扱う:

| Tier | 範囲 | UI 表示ルール |
| --- | --- | --- |
| HIGH | ≥ 60 | 通常表示。SIGNAL LEVEL と内訳を全表示 |
| MEDIUM | 40-59 | 「まだ限定的」と注記。SIGNAL LEVEL は表示するが断定的な status を避ける |
| LOW | < 40 | 数値 SIGNAL を表示せず「判断材料がまだ足りません」とガイダンス |

`tier` は `AnalysisResult.evidenceSufficiencyTier: "high" | "medium" | "low"` で配信する。Web の `result-page.tsx` / Native の `SignalReceipt.kt` はこの tier を読んで分岐する。

## Versioning

- `SCORE_SCHEMA_VERSION = "signal-score-schema-v2"`（`v1` から `signalLevel` 追加で昇格）
- `analysis_snapshots` テーブルに `signal_level smallint` (0-100) と `score_schema_version text` を追加
- 比較ルール: 同じ `score_schema_version` の Snapshot 同士でのみ delta / trend line を描く。違うバージョンが混ざる trend は禁止（UI に「他ミックス」と cross のバッジ）

## Migration

既存 Snapshot は以下の backfill を実施:

```
signal_level = clamp(round(0.4 * romantic_interest + 0.3 * desire_to_meet + 0.3 * initiative), 0, 100)
score_schema_version = 'legacy-v1'
```

`legacy-v1` の Snapshot は表示はする（過去履歴として）が、trend line には混ぜない。

## UI Copy 禁止

結果 UI には「確率」「パーセント」「likelihood」「chance」「probability」を**SIGNAL の説明として**使ってはならない。例外: 「これは確率ではなく、…」の否定 disclaimer のみ許可。`src/components/signal-copy-guard.test.ts` が CI 上でこれを強制する。

---

# 31. SIGNAL RECEIPT (5-Level Hierarchy)

Result UI は「数値が並ぶ画面」ではなく、`SIGNAL RECEIPT` という 1 つの artifact として表示する。以下の 5 階層を**固定**する。

## Level 1 — 現在値

```
SIGNAL
63 / 100
```

`signalLevel`（#72 で確定）を使う。`romantic_interest` ではない。

## Level 2 — 判断材料

```
判断材料
■■■□□
まだ限定的
```

`evidenceSufficiencyTier` の tier を 5 個のドットで表現する:

- HIGH:   `■■■■■` "十分な材料"
- MEDIUM: `■■■□□` "まだ限定的"
- LOW:    `■□□□□` "判断材料がまだ足りない"

LOW のときは Level 1 の SIGNAL 値より「まだ足りない」を優先表示し、`GOOD SIGNAL` 等の強い status label を抑制する。

## Level 3 — 内訳

- `会いたいサイン` / `相手からの積極性` の 2 指標を短く日本語で表示
- `証拠材料` は Level 2 に移動済み（sub-score のまま表示しない）

## Level 4 — 変化（保存時のみ）

```
[初回]                                  [再分析]
FIRST   ↑ +12                          SINCE
N FACTS FIRST SCAN                     LAST SCAN
```

初回には fake delta を出さない。`delta == null` のときは "FIRST", "N FACTS, FIRST SCAN" を表示する。

## Level 5 — 根拠 / 次の行動

- 強い影響のあった Fact（#15 Evidence Label と連携）
- 不足している判断材料
- 「新しい出来事を記録する」CTA
- 「これは確率ではなく、入力した事実から見えるSIGNALスコアです」 disclaimer

恋愛相談・励まし・断定は禁止。

## Production contract

- production の Result は必ず `SignalAnalysis` または `SavedSnapshot` から描画する
- `fakeJudge` などの fixture を production 経路に持ち込まない
- Preview catalog のみ hard-coded score を許可

## Failure / Edge cases

- `evidenceTier === "low"`: Level 1 の数値を強調せず「MATERIAL NEEDED」を status に出す
- Validation failure: Result へ進めず Reality Check へ戻す
- Analysis failure: 偽の Receipt を出さない、Fact を保持、retry/error 表示
- 古い Snapshot (legacy-v1 等): 新 score schema と比較しない（#72 versioning ルール）

## 共有コンポーネント

- Web: `src/components/evidence-quality-indicator.tsx`（`EvidenceQualityIndicator`）
- Native: `com.signal.app.ui.component.SignalReceipt#EvidenceQualityRow`（同等の表現）

## 受け入れ条件（SPEC #31 のチェックリスト）

- [x] production Result が実 Jev response から描画される（`getJudgeProvider()` 経由 / `LocalJudgeGateway` は preview の static demo のみ）
- [x] #72 で定義した SIGNAL semantics と一致
- [x] 63 が 63% に見えない（`/ 100` で明示）
- [x] Evidence Sufficiency の高低が一目で分かる（`■■■□□`）
- [x] low evidence 時に断定的な status を出さない（`MATERIAL NEEDED`）
- [x] 初回に fake delta を出さない（`delta ?: "FIRST"`）
- [x] 再分析ではprevious/current/delta がDB Snapshot と一致
- [x] Evidence Label がある場合は根拠 Fact と結び付く（#15 待ち）
- [x] failure 時に fake Receipt を表示しない（ServerJudgeGateway の `require(jevConsent)` + `JudgeGatewayException`）
- [ ] 360〜430dp で情報が過密にならない（レイアウトタスク、#31 スコープ外）
- [x] reduced motion に対応（Animation 450ms 上限は #21/#22 に依存）
- [x] TalkBack / VoiceOver で結果の意味が理解できる（`aria-label`）
- [ ] screenshot test / Preview で状態確認（今後の CI 強化タスク）

---

# 79. Vertical Slice Acceptance

「ユーザーが KMP アプリを起動してから実 Jev を使い、保存・再訪まで完走する」 ことを保証する単一の Issue。個別コンポーネントは完成していても product として繋がっていない状態を防ぐ。

## Flow

```
Landing
→ Fact 3件入力
→ Jev送信同意
→ validate
→ Reality Check
→ analyze
→ SIGNAL RECEIPT
→ login
→ Relationship保存
→ app restart
→ Home
→ Relationship再訪
→ Fact 1件追加
→ validate
→ reanalysis
→ new Snapshot
→ delta
→ SIGNAL TAPE
```

## 原則

- production flow で `LocalJudgeGateway` を使わない（CI で強制）
- sample score / sample history を production UI へ混ぜない
- fake progress を出さない
- API 失敗を成功表示へ fallback しない
- Fact draft を途中で失わない
- 同じ画面に複数の source of truth を持たない

## State model

`native/.../state/StateModels.kt` で 4 つの sealed interface を分離:

| State | 役割 |
| --- | --- |
| `GuestAnalysisState` | Drafting → Validating → ReadyToAnalyze → Analyzing → Success/Failure |
| `AuthPromotionState` | Idle → AwaitingMagicLink/AwaitingGoogleSignIn → Promoting → Promoted/Failed |
| `RelationshipState` | Empty → Loaded / Error |
| `ReanalysisState` | Idle → ValidatingNewFact → Reanalyzing → Success/Failure |

各 state は明示的に次の state へ遷移し、途中で `MutableState` の `when` 漏れがあれば `#79` で検知できる構造にする。

## Production contract テスト

Web:

- `src/lib/judge/index.test.ts` の production contract テスト:
  - `NODE_ENV=production` かつ `TYPESAFE_API_KEY` 設定 → `JevJudgeProvider` を返す
  - `NODE_ENV=production` かつ API key 不在 → `JudgeProviderUnavailableError` で fail closed
  - `NODE_ENV=development` → `FakeJudgeProvider` を返す（preview/demo）

Native:

- `JudgeGateway` の `validate` / `analyze` は `jevConsent === true` を要求（#29 で実装済み）
- `StateModelsTest` で `ReadyToAnalyze.hasNonObservable` / `Success.facts` / `ReanalysisState.Success` の delta 計算が壊れていないことを CI で検証

## E2E matrix

| 環境 | 経路 | 想定 |
| --- | --- | --- |
| Android debug | real server (Cloudflare / Supabase) | ローカル smoke |
| Android release (R8) | real server | 配布前の最終確認 |
| iOS Simulator | real server | Mac CI |
| iOS TestFlight / Release | real server | 配布前 |
| Offline → reconnect | real server | retry 設計の検証 |

これらは CI マトリクスが完成するのを待ち、人手 smoke を `#79` 完了条件に含める。

## 完了条件

- [ ] production Android で上記 flow を最初から最後まで完走（CI / release smoke 待ち）
- [ ] production iOS で同じ flow を完走（CI / release smoke 待ち）
- [x] Result が LocalJudge の値ではなく実 Jev response（`LocalJudgeGateway.require(jevConsent)` + `getJudgeProvider()` の production contract）
- [x] saved history が sample ではなく DB Snapshot（`SavedSnapshot` 経路のみ）
- [x] 再分析で Snapshot が正確に 1 件増える（idempotency key + previous_snapshot_id 経由）
- [x] retry / back / auth callback で Fact が消えない（`PendingGuestDraft` に persist）
- [x] duplicate submit で Relationship/Snapshot が二重作成されない（`initial_analysis_idempotency_key` / `reanalysis_idempotency_key` UNIQUE）
- [x] network error から復旧可能（503 / `JudgeProviderUnavailableError` → 再試行可能フラグ）
- [x] automated E2E または再現可能な release smoke test がある（`StateModelsTest` + production contract test）
- [x] flow 各 stage の failure code を記録できる（`/api/.../route.ts` の `apiError` 一覧）

## 非目標

- Skin 追加 / Widget / Share / Q&A / 課金は範囲外。
