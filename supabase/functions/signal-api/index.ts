import { choice, score, TypeSafeClient } from "npm:@typesafe-ai/sdk@0.6.0";

type FactInput = {
  clientFactId: string;
  text: string;
};

type ValidationStatus = "observable" | "interpretation" | "unclear";
type UsageStage = "validation" | "analysis";

const SCORE_LEVELS = [
  "根拠がない、または明確に否定的な出来事だけがある。",
  "肯定的な根拠はほぼない。",
  "弱い根拠が少数ある。",
  "根拠はあるが、まだ限定的である。",
  "中立的な根拠が中心である。",
  "肯定的な根拠が中程度ある。",
  "肯定的な相手の行動が複数ある。",
  "明確な肯定的行動が繰り返しある。",
  "強い肯定的な行動が一貫している。",
  "非常に強く一貫した根拠がある。",
] as const;

const OBSERVABILITY_CRITERIA = {
  observable: "第三者が、発言・行動・回数・日時として確認できる記述。相手の感情や意図を推測していない。",
  interpretation: "相手の好意、気持ち、意図、性格を推測している記述。",
  unclear: "誰がいつ何をしたか不十分で、安定して判定できない記述。",
} as const;

const ALLOWED_ORIGINS = new Set([
  "https://smri2170.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANALYSIS_ANSWER_KEYS = ["romanticInterest", "desireToMeet", "initiative", "evidenceSufficiency"] as const;
const encoder = new TextEncoder();

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function jsonResponse(body: unknown, status: number, requestId: string, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}

function apiError(
  code: string,
  message: string,
  status: number,
  requestId: string,
  origin: string | null,
  retryable = false,
) {
  return jsonResponse({ error: { code, message, requestId, retryable } }, status, requestId, origin);
}

function isFactInput(value: unknown): value is FactInput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.clientFactId === "string" &&
    UUID_PATTERN.test(candidate.clientFactId) &&
    typeof candidate.text === "string" &&
    candidate.text.trim().length >= 10 &&
    candidate.text.trim().length <= 300;
}

function parseFacts(body: unknown, minimum: number, maximum = 10): FactInput[] | null {
  if (!body || typeof body !== "object") return null;
  const facts = (body as Record<string, unknown>).facts;
  if (!Array.isArray(facts) || facts.length < minimum || facts.length > maximum || !facts.every(isFactInput)) {
    return null;
  }
  return facts.map((fact) => ({ ...fact, text: fact.text.trim() }));
}

function hasJevConsent(body: unknown) {
  return Boolean(body && typeof body === "object" && (body as Record<string, unknown>).jevConsent === true);
}

function validationCopy(status: ValidationStatus) {
  switch (status) {
    case "observable":
      return { reasonJa: "観測可能な出来事として使用できます。", rewriteExampleJa: null };
    case "interpretation":
      return {
        reasonJa: "相手の気持ちや意図についての解釈が含まれています。",
        rewriteExampleJa: "相手が実際に言ったこと、したこと、回数や日時を書いてみてください。",
      };
    case "unclear":
      return {
        reasonJa: "出来事の内容を判断するには情報が不足しています。",
        rewriteExampleJa: "誰が、いつ、何をしたかが分かる形で書いてみてください。",
      };
  }
}

function normalizeScore(value: number) {
  return Math.round((value / (SCORE_LEVELS.length - 1)) * 100);
}

function hasExactKeys(value: unknown, expected: readonly string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  const expectedSorted = [...expected].sort();
  return actual.length === expectedSorted.length && actual.every((key, index) => key === expectedSorted[index]);
}

function reportJevUsage(
  requestId: string,
  stage: UsageStage,
  model: unknown,
  usage: unknown,
) {
  if (typeof model !== "string" || model.trim().length === 0 || model.length > 100) {
    throw new Error("Invalid Jev model metadata");
  }
  if (!usage || typeof usage !== "object") throw new Error("Invalid Jev usage metadata");
  const candidate = usage as Record<string, unknown>;
  const inputTokens = candidate.input_tokens;
  const outputTokens = candidate.output_tokens;
  if (
    typeof inputTokens !== "number" || !Number.isSafeInteger(inputTokens) || inputTokens < 0 ||
    typeof outputTokens !== "number" || !Number.isSafeInteger(outputTokens) || outputTokens < 0
  ) throw new Error("Invalid Jev usage metadata");

  // Jev's published early-access rate is $0.042 per million input tokens; output tokens are free.
  const estimatedCostUsd = Number((inputTokens * 0.042 / 1_000_000).toFixed(12));
  console.info("jev_usage", {
    requestId,
    provider: "jev",
    stage,
    modelVersion: model,
    inputTokens,
    outputTokens,
    estimatedCostUsd,
  });
}

function createJudge() {
  const apiKey = Deno.env.get("TYPESAFE_API_KEY");
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is not configured");
  return new TypeSafeClient({
    apiKey,
    defaultModel: Deno.env.get("TYPESAFE_DEFAULT_MODEL") ?? "jev-latest",
    logLevel: "off",
    timeout: 8_000,
    retry: { maxRetries: 1 },
  });
}

async function validateFacts(judge: TypeSafeClient, facts: FactInput[], requestId: string) {
  const questions = Object.fromEntries(
    facts.map((fact, index) => [
        `fact_${index}`,
        choice(
          `facts配列の${index}番目（clientFactId=${fact.clientFactId}）だけを判定してください。他のFactを根拠にせず、このFactは相手との間で実際に起きた出来事だけを記録していますか。文章に書かれていない事情は推測しないでください。`,
          OBSERVABILITY_CRITERIA,
        ),
    ]),
  );
  const response = await judge.systemOne({
    state: { facts: facts.map(({ clientFactId, text }) => ({ clientFactId, text })) },
    questions,
  });
  reportJevUsage(requestId, "validation", response.model, response.usage);

  const answerKeys = facts.map((_fact, index) => `fact_${index}`);
  if (!hasExactKeys(response.answers, answerKeys)) throw new Error("Invalid validation response");

  return facts.map((fact, index) => {
    const answer = response.answers[`fact_${index}`];
    const status = answer?.choice;
    if (
      answer?.type !== "choice" || typeof status !== "string" ||
      !Object.hasOwn(OBSERVABILITY_CRITERIA, status)
    ) throw new Error("Invalid validation response");
    return {
      clientFactId: fact.clientFactId,
      status: status as ValidationStatus,
      ...validationCopy(status as ValidationStatus),
      translatedFactEn: null,
    };
  });
}

async function analyzeFacts(judge: TypeSafeClient, facts: FactInput[], requestId: string, translationSkipped: boolean = true) {
  const response = await judge.systemOne({
    state: {
      facts: facts.map(({ clientFactId, text }) => ({ clientFactId, text })),
      instructions:
        "これは恋愛相談ではなく、観測された出来事だけを一定のRubricで評価する処理です。相手の感情を断定せず、入力以外を推測・補完しないでください。スコアは好意の確率ではなく、記録された行動から得られるSIGNALの強さです。",
    },
    questions: {
      romanticInterest: score(
        "恋愛的な関心を示す行動のSIGNALの強さを評価してください。感情の確率ではありません。",
        SCORE_LEVELS,
      ),
      desireToMeet: score("会いたい意思を示す具体的な行動のSIGNALの強さを評価してください。", SCORE_LEVELS),
      initiative: score(
        "相手側から始めた具体的な連絡、提案、調整などの積極性を評価してください。",
        SCORE_LEVELS,
      ),
      evidenceSufficiency: score(
        "判断できる観測可能なFactの量・具体性・一貫性を評価してください。",
        SCORE_LEVELS,
      ),
    },
  });
  reportJevUsage(requestId, "analysis", response.model, response.usage);

  const answers = response.answers as unknown as Record<string, { type?: unknown; score?: unknown }>;
  if (!hasExactKeys(answers, ANALYSIS_ANSWER_KEYS)) {
    throw new Error("Invalid analysis response");
  }
  const values = ANALYSIS_ANSWER_KEYS.map((key) => answers[key]?.score);
  if (
    ANALYSIS_ANSWER_KEYS.some((key) => answers[key]?.type !== "score") ||
    values.some((value) => typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > SCORE_LEVELS.length - 1)
  ) throw new Error("Invalid analysis response");
  const romanticInterest = normalizeScore(answers.romanticInterest.score as number);
  const desireToMeet = normalizeScore(answers.desireToMeet.score as number);
  const initiative = normalizeScore(answers.initiative.score as number);
  const evidenceSufficiency = normalizeScore(answers.evidenceSufficiency.score as number);
  const signalLevel = clampScore(0.40 * romanticInterest + 0.30 * desireToMeet + 0.30 * initiative);
  return {
    scores: {
      signalLevel,
      romanticInterest,
      desireToMeet,
      initiative,
      evidenceSufficiency,
    },
    evidenceSufficiencyTier: evidenceSufficiencyTier(evidenceSufficiency),
    impact: null,
    modelVersion: response.model,
    rubricVersion: "signal-rubric-v1",
    scoreSchemaVersion: "signal-score-schema-v2",
    translationSkipped,
  };
}

/**
 * Translation pipeline for the Native path. The Web path uses
 * `src/lib/judge/translator-jev.ts`; the Edge Function uses an inline
 * minimal translator because Deno cannot import the TypeScript module.
 *
 * Behaviour:
 *   - When SIGNAL_TRANSLATOR_PROVIDER === "disabled" / "noop", or when
 *     no API key is configured, return text mirrored as textEnglish with
 *     `skipped: true`. Audit / drift tests must detect this.
 *   - Otherwise call `https://api.typesafe.ai/v1/translate` and assert
 *     invariants: no_summarization, preserve_negation, no_intent_inference.
 */
type TranslatedFact = { textOriginal: string; textEnglish: string; translationVersion: string; skipped: boolean; };

async function translateFacts(facts: FactInput[], _requestId: string): Promise<TranslatedFact[]> {
  const provider = (Deno.env.get("SIGNAL_TRANSLATOR_PROVIDER") ?? "").toLowerCase();
  const apiKey = Deno.env.get("TYPESAFE_API_KEY");
  const useNoop = provider === "disabled" || provider === "noop" || (!provider && !apiKey);
  if (useNoop) {
    return facts.map((fact) => ({
      textOriginal: fact.text,
      textEnglish: fact.text,
      translationVersion: "signal-translator-noop-v0",
      skipped: true,
    }));
  }

  const results: TranslatedFact[] = [];
  for (const fact of facts) {
    const prompt = [
      "Translate the following Japanese observation into English. Preserve every observable element:",
      "- who (subject, other party)",
      "- action (what was said or done)",
      "- count (numbers, repetitions)",
      "- datetime (dates, time-of-day, relative time)",
      "- negation (denials, refusals, 'no', 'not', 'never', '~ない')",
      "- conditional ('if', 'when', 'unless', '~ば')",
      "Do NOT add pronouns, intent, or summarisation that the source does not contain.",
      "Do NOT guess the gender of 'they'. Keep ambiguous referents as 'the other person'.",
      `Source: ${fact.text}`,
    ].join("\n");

    let response: Response;
    try {
      response = await fetch("https://api.typesafe.ai/v1/translate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey ?? ""}`,
        },
        body: JSON.stringify({ prompt, model: Deno.env.get("TYPESAFE_TRANSLATE_MODEL") ?? "translate-jp-en-v1" }),
      });
    } catch (error) {
      throw new Error(`Translator transport failed for ${fact.clientFactId}: ${(error as Error).message ?? "unknown"}`);
    }
    if (!response.ok) {
      throw new Error(`Translator returned ${response.status} for fact ${fact.clientFactId}`);
    }
    const payload = await response.json() as { textEnglish?: unknown };
    if (typeof payload.textEnglish !== "string" || payload.textEnglish.trim().length === 0) {
      throw new Error(`Translator returned empty English text for fact ${fact.clientFactId}`);
    }
    const textEnglish = payload.textEnglish.trim();
    const invariantViolation = assertTranslationEnInvariants(fact.text, textEnglish);
    if (invariantViolation) {
      throw new Error(`Translator violated invariant "${invariantViolation}" for fact ${fact.clientFactId}`);
    }
    results.push({
      textOriginal: fact.text,
      textEnglish,
      translationVersion: "signal-translator-jev-v1",
      skipped: false,
    });
  }
  return results;
}

function assertTranslationEnInvariants(original: string, translated: string): string | null {
  const ratio = translated.length / Math.max(1, original.length);
  if (ratio < 0.55 || ratio > 6.0) return "no_summarization";
  const NON_NEGATION_ない_FORMS = ["に違いない", "しかない", "ではない", "んじゃない"];
  let stripped = original;
  for (const form of NON_NEGATION_ない_FORMS) {
    stripped = stripped.split(form).join("");
  }
  const originalNegations = (stripped.match(/(?:ない|なかった|ません|ませんでした|否定)/gu) ?? []).length;
  const translatedNegations = (translated.match(/\b(?:not|never|no\s+(?:longer|more|reply|contact))\b/giu) ?? []).length;
  if (originalNegations > 0 && translatedNegations === 0) return "preserve_negation";
  const introducedIntent = /\b(?:in love|romantic(?:ally)?|interested|affection)\b/i.test(translated) &&
    !/(?:好き|恋愛|好意|興味|気がある)/.test(original);
  if (introducedIntent) return "no_intent_inference";
  return null;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function evidenceSufficiencyTier(evidenceSufficiency: number): "high" | "medium" | "low" {
  if (evidenceSufficiency >= 60) return "high";
  if (evidenceSufficiency >= 40) return "medium";
  return "low";
}

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    "unknown";
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function consumeRateLimit(request: Request, scope: "validate" | "preview" | "save", limit: number) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const pepper = Deno.env.get("RATE_LIMIT_PEPPER");
  if (!supabaseUrl || !serviceRoleKey || !pepper) throw new Error("Rate limiter is not configured");

  const clientHash = await sha256(`${pepper}:${clientAddress(request)}`);
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/consume_signal_api_rate_limit`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_client_hash: clientHash,
      p_scope: scope,
      p_limit: limit,
      p_window_seconds: 600,
    }),
  });
  if (!response.ok) throw new Error(`Rate limiter failed with status ${response.status}`);
  return await response.json() === true;
}

function serviceConfiguration() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) throw new Error("Supabase service is not configured");
  return { supabaseUrl, anonKey, serviceRoleKey };
}

async function authenticatedUserId(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const { supabaseUrl, anonKey } = serviceConfiguration();
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authorization },
  });
  if (!response.ok) return null;
  const user = await response.json().catch(() => null) as { id?: unknown } | null;
  return typeof user?.id === "string" && UUID_PATTERN.test(user.id) ? user.id : null;
}

async function serviceRoleRequest(path: string, init: RequestInit = {}) {
  const { supabaseUrl, serviceRoleKey } = serviceConfiguration();
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`Database request failed with status ${response.status}`);
  return response;
}

function parseRelationshipRequest(body: unknown) {
  const facts = parseFacts(body, 3);
  if (!facts || !body || typeof body !== "object") return null;
  const candidate = body as Record<string, unknown>;
  if (
    candidate.jevConsent !== true ||
    typeof candidate.displayName !== "string" ||
    candidate.displayName.trim().length < 1 ||
    candidate.displayName.trim().length > 80 ||
    typeof candidate.idempotencyKey !== "string" ||
    !UUID_PATTERN.test(candidate.idempotencyKey)
  ) return null;
  return {
    facts,
    displayName: candidate.displayName.trim(),
    idempotencyKey: candidate.idempotencyKey,
  };
}

async function saveRelationship(userId: string, body: unknown, requestId: string) {
  const input = parseRelationshipRequest(body);
  if (!input) return { error: "INVALID_REQUEST" as const };
  const judge = createJudge();
  const translated = await translateFacts(input.facts, requestId);
  const judgeInputs = input.facts.map((fact, index) => ({
    ...fact,
    text: translated[index]?.skipped ? fact.text : translated[index].textEnglish,
  }));
  const validations = await validateFacts(judge, judgeInputs, requestId, translated);
  if (validations.some((validation) => validation.status !== "observable")) {
    return { error: "FACT_NOT_OBSERVABLE" as const };
  }
  const analysis = await analyzeFacts(judge, judgeInputs, requestId, translated.some((t) => t.skipped));
  const response = await serviceRoleRequest("rpc/create_initial_relationship_analysis", {
    method: "POST",
    body: JSON.stringify({
      p_user_id: userId,
      p_display_name: input.displayName,
      p_facts: input.facts.map((fact, index) => ({
        text_original: fact.text,
        text_english: translated[index]?.textEnglish ?? null,
        translation_version: translated[index]?.translationVersion ?? null,
        translation_skipped: translated[index]?.skipped ?? true,
      })),
      p_analysis: {
        signalLevel: analysis.scores.signalLevel,
        romanticInterest: analysis.scores.romanticInterest,
        desireToMeet: analysis.scores.desireToMeet,
        initiative: analysis.scores.initiative,
        evidenceSufficiency: analysis.scores.evidenceSufficiency,
        modelVersion: analysis.modelVersion,
        rubricVersion: analysis.rubricVersion,
      },
      p_idempotency_key: input.idempotencyKey,
    }),
  });
  const relationshipId = await response.json();
  if (typeof relationshipId !== "string" || !UUID_PATTERN.test(relationshipId)) {
    throw new Error("Database returned an invalid relationship id");
  }
  return { relationshipId, analysis };
}

type RelationshipRow = { id: string; display_name: string; updated_at: string };
type FactRow = { text_original: string; created_at: string };
type SnapshotRow = {
  relationship_id?: string;
  romantic_interest: number;
  desire_to_meet: number;
  initiative: number;
  evidence_sufficiency: number;
  created_at: string;
};

async function listRelationships(userId: string) {
  const filters = new URLSearchParams({
    select: "id,display_name,updated_at",
    user_id: `eq.${userId}`,
    order: "updated_at.desc",
    limit: "20",
  });
  const relationships = await (await serviceRoleRequest(`relationships?${filters}`)).json() as RelationshipRow[];
  if (relationships.length === 0) return [];

  const ids = relationships.map((relationship) => relationship.id).join(",");
  const snapshotFilters = new URLSearchParams({
    select: "relationship_id,romantic_interest,created_at",
    relationship_id: `in.(${ids})`,
    order: "created_at.desc",
  });
  const snapshots = await (await serviceRoleRequest(`analysis_snapshots?${snapshotFilters}`)).json() as SnapshotRow[];
  const latestByRelationship = new Map<string, SnapshotRow>();
  for (const snapshot of snapshots) {
    if (snapshot.relationship_id && !latestByRelationship.has(snapshot.relationship_id)) {
      latestByRelationship.set(snapshot.relationship_id, snapshot);
    }
  }
  return relationships.map((relationship) => {
    const latest = latestByRelationship.get(relationship.id);
    return {
      id: relationship.id,
      displayName: relationship.display_name,
      signalLevel: latest?.romantic_interest ?? null,
      updatedAt: relationship.updated_at,
    };
  });
}

async function appendFactAndAnalysis(userId: string, relationshipId: string, body: unknown, requestId: string) {
  const newFacts = parseFacts(body, 1, 1);
  if (!newFacts || !body || typeof body !== "object") return { error: "INVALID_REQUEST" as const };
  const candidate = body as Record<string, unknown>;
  if (
    candidate.jevConsent !== true || typeof candidate.idempotencyKey !== "string" ||
    !UUID_PATTERN.test(candidate.idempotencyKey)
  ) {
    return { error: "INVALID_REQUEST" as const };
  }

  const existing = await loadRelationship(userId, relationshipId);
  if (!existing) return { error: "NOT_FOUND" as const };
  const existingFacts: FactInput[] = existing.facts.map((fact) => ({
    clientFactId: crypto.randomUUID(),
    text: fact.text,
  }));
  const factsForAnalysis = [...existingFacts, ...newFacts];
  if (factsForAnalysis.length > 30) return { error: "FACT_LIMIT_REACHED" as const };

  const judge = createJudge();
  const translated = await translateFacts(newFacts, requestId);
  const judgeNewFacts = newFacts.map((fact, index) => ({
    ...fact,
    text: translated[index]?.skipped ? fact.text : translated[index].textEnglish,
  }));
  const translatedExistingFacts = await translateFacts(existingFacts, requestId);
  const judgeExistingFacts = existingFacts.map((fact, index) => ({
    ...fact,
    text: translatedExistingFacts[index]?.skipped ? fact.text : translatedExistingFacts[index].textEnglish,
  }));
  const judgeFactsForAnalysis = [...judgeExistingFacts, ...judgeNewFacts];
  const validations = await validateFacts(judge, judgeNewFacts, requestId, translated);
  if (validations.some((validation) => validation.status !== "observable")) {
    return { error: "FACT_NOT_OBSERVABLE" as const };
  }
  const analysis = await analyzeFacts(judge, judgeFactsForAnalysis, requestId, translated.some((t) => t.skipped));
  const response = await serviceRoleRequest("rpc/append_facts_and_analysis", {
    method: "POST",
    body: JSON.stringify({
      p_user_id: userId,
      p_relationship_id: relationshipId,
      p_facts: newFacts.map((fact, index) => ({
        text_original: fact.text,
        text_english: translated[index]?.textEnglish ?? null,
        translation_version: translated[index]?.translationVersion ?? null,
        translation_skipped: translated[index]?.skipped ?? true,
      })),
      p_analysis: {
        signalLevel: analysis.scores.signalLevel,
        romanticInterest: analysis.scores.romanticInterest,
        desireToMeet: analysis.scores.desireToMeet,
        initiative: analysis.scores.initiative,
        evidenceSufficiency: analysis.scores.evidenceSufficiency,
        modelVersion: analysis.modelVersion,
        rubricVersion: analysis.rubricVersion,
        scoreSchemaVersion: analysis.scoreSchemaVersion,
      },
      p_idempotency_key: candidate.idempotencyKey,
    }),
  });
  const snapshotId = await response.json();
  if (typeof snapshotId !== "string" || !UUID_PATTERN.test(snapshotId)) {
    throw new Error("Database returned an invalid snapshot id");
  }
  return { snapshotId, analysis };
}

async function loadRelationship(userId: string, requestedId: string | null) {
  const filters = new URLSearchParams({
    select: "id,display_name,updated_at",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  if (requestedId) filters.set("id", `eq.${requestedId}`);
  else filters.set("order", "updated_at.desc");
  const relationshipRows = await (await serviceRoleRequest(`relationships?${filters}`)).json() as RelationshipRow[];
  const relationship = relationshipRows[0];
  if (!relationship) return null;

  const relationFilter = encodeURIComponent(`eq.${relationship.id}`);
  const [facts, snapshots] = await Promise.all([
    serviceRoleRequest(
      `facts?select=text_original,created_at&relationship_id=${relationFilter}&order=created_at.asc`,
    ).then((response) => response.json() as Promise<FactRow[]>),
    serviceRoleRequest(
      `analysis_snapshots?select=romantic_interest,desire_to_meet,initiative,evidence_sufficiency,created_at&relationship_id=${relationFilter}&order=created_at.asc`,
    ).then((response) => response.json() as Promise<SnapshotRow[]>),
  ]);
  return {
    id: relationship.id,
    displayName: relationship.display_name,
    updatedAt: relationship.updated_at,
    facts: facts.map((fact) => ({ text: fact.text_original, createdAt: fact.created_at })),
    snapshots: snapshots.map((snapshot) => ({
      signalLevel: snapshot.romantic_interest,
      desireToMeet: snapshot.desire_to_meet,
      initiative: snapshot.initiative,
      evidenceSufficiency: snapshot.evidence_sufficiency,
      createdAt: snapshot.created_at,
    })),
  };
}

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return apiError("ORIGIN_NOT_ALLOWED", "この接続元からは利用できません。", 403, requestId, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const pathname = new URL(request.url).pathname;
  const judgeRoute = pathname.endsWith("/api/facts/validate")
    ? "validate"
    : pathname.endsWith("/api/analyses/preview")
    ? "preview"
    : null;
  const relationshipBaseRoute = pathname.endsWith("/api/relationships");
  const relationshipListRoute = pathname.endsWith("/api/relationships/summaries");
  const relationshipId = pathname.match(/\/api\/relationships\/([0-9a-f-]{36})$/i)?.[1] ?? null;
  const reanalysisId = pathname.match(/\/api\/relationships\/([0-9a-f-]{36})\/analyses$/i)?.[1] ?? null;
  const relationshipRoute = relationshipBaseRoute || relationshipListRoute ||
    (relationshipId !== null && UUID_PATTERN.test(relationshipId)) ||
    (reanalysisId !== null && UUID_PATTERN.test(reanalysisId));
  if (!judgeRoute && !relationshipRoute) {
    return apiError("NOT_FOUND", "APIが見つかりません。", 404, requestId, origin);
  }

  if (relationshipRoute) {
    const supportsGet = relationshipBaseRoute || relationshipListRoute || relationshipId !== null;
    const supportsPost = relationshipBaseRoute || reanalysisId !== null;
    if ((request.method === "GET" && !supportsGet) || (request.method === "POST" && !supportsPost) ||
      (request.method !== "GET" && request.method !== "POST")) {
      return apiError("METHOD_NOT_ALLOWED", "対応していない操作です。", 405, requestId, origin);
    }
    let userId: string | null;
    try {
      userId = await authenticatedUserId(request);
    } catch (error) {
      console.error("auth_unavailable", { requestId, error: error instanceof Error ? error.name : "unknown" });
      return apiError(
        "AUTH_UNAVAILABLE",
        "ログイン状態を確認できませんでした。もう一度お試しください。",
        503,
        requestId,
        origin,
        true,
      );
    }
    if (!userId) {
      return apiError("AUTH_REQUIRED", "ログイン後に保存してください。", 401, requestId, origin);
    }

    if (request.method === "GET") {
      try {
        if (relationshipListRoute) {
          return jsonResponse({ relationships: await listRelationships(userId) }, 200, requestId, origin);
        }
        const relationship = await loadRelationship(userId, relationshipId);
        if (!relationship) return apiError("NOT_FOUND", "保存した記録が見つかりません。", 404, requestId, origin);
        return jsonResponse(relationship, 200, requestId, origin);
      } catch (error) {
        console.error("relationship_load_unavailable", { requestId, error: error instanceof Error ? error.name : "unknown" });
        return apiError(
          "LOAD_UNAVAILABLE",
          "保存した記録を読み込めませんでした。もう一度お試しください。",
          503,
          requestId,
          origin,
          true,
        );
      }
    }

    try {
      const allowed = await consumeRateLimit(request, "save", 5);
      if (!allowed) {
        return apiError(
          "RATE_LIMITED",
          "保存回数の上限です。しばらく待ってからお試しください。",
          429,
          requestId,
          origin,
          true,
        );
      }
    } catch (error) {
      console.error("rate_limit_unavailable", { requestId, error: error instanceof Error ? error.message : "unknown" });
      return apiError(
        "SERVICE_UNAVAILABLE",
        "現在サービスに接続できません。少し待ってからもう一度お試しください。",
        503,
        requestId,
        origin,
        true,
      );
    }

    const body = await request.json().catch(() => null);
    try {
      const result = reanalysisId
        ? await appendFactAndAnalysis(userId, reanalysisId, body, requestId)
        : await saveRelationship(userId, body, requestId);
      if ("error" in result) {
        if (result.error === "FACT_NOT_OBSERVABLE") {
          return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422, requestId, origin);
        }
        if (result.error === "NOT_FOUND") {
          return apiError("NOT_FOUND", "保存した記録が見つかりません。", 404, requestId, origin);
        }
        if (result.error === "FACT_LIMIT_REACHED") {
          return apiError("FACT_LIMIT_REACHED", "この記録はFactの上限30件に達しました。", 422, requestId, origin);
        }
        return apiError("INVALID_REQUEST", "保存内容を確認してください。", 400, requestId, origin);
      }
      return jsonResponse(result, 200, requestId, origin);
    } catch (error) {
      console.error("relationship_save_unavailable", { requestId, error: error instanceof Error ? error.name : "unknown" });
      return apiError(
        "SAVE_UNAVAILABLE",
        "保存を完了できませんでした。入力内容は端末に残っています。",
        503,
        requestId,
        origin,
        true,
      );
    }
  }

  if (!judgeRoute) {
    return apiError("NOT_FOUND", "APIが見つかりません。", 404, requestId, origin);
  }
  if (request.method !== "POST") {
    return apiError("METHOD_NOT_ALLOWED", "POSTで送信してください。", 405, requestId, origin);
  }

  try {
    const allowed = await consumeRateLimit(request, judgeRoute, judgeRoute === "validate" ? 20 : 10);
    if (!allowed) {
      const message = judgeRoute === "validate"
        ? "しばらく待ってからもう一度お試しください。"
        : "分析回数の上限です。しばらく待ってからお試しください。";
      return apiError("RATE_LIMITED", message, 429, requestId, origin, true);
    }
  } catch (error) {
    console.error("rate_limit_unavailable", { requestId, error: error instanceof Error ? error.message : "unknown" });
    return apiError(
      "SERVICE_UNAVAILABLE",
      "現在サービスに接続できません。少し待ってからもう一度お試しください。",
      503,
      requestId,
      origin,
      true,
    );
  }

  const body = await request.json().catch(() => null);
  if (!hasJevConsent(body)) {
    return apiError("CONSENT_REQUIRED", "JevへFactを送信することへの同意が必要です。", 400, requestId, origin);
  }
  const facts = parseFacts(body, judgeRoute === "validate" ? 1 : 3);
  if (!facts) {
    const code = judgeRoute === "validate" ? "INVALID_REQUEST" : "INSUFFICIENT_FACTS";
    const message = judgeRoute === "validate"
      ? "入力内容を確認してください。"
      : "3件以上のFactを入力してください。";
    return apiError(code, message, 400, requestId, origin);
  }

  let judge: TypeSafeClient;
  let validations: Awaited<ReturnType<typeof validateFacts>>;
  let translated: TranslatedFact[];
  try {
    judge = createJudge();
    translated = await translateFacts(facts, requestId);
    const judgeInputs = facts.map((fact, index) => ({
      ...fact,
      text: translated[index]?.skipped ? fact.text : translated[index].textEnglish,
    }));
    validations = await validateFacts(judge, judgeInputs, requestId, translated);
  } catch (error) {
    console.error("validation_unavailable", { requestId, error: error instanceof Error ? error.name : "unknown" });
    return apiError(
      "VALIDATION_UNAVAILABLE",
      "現在判定が混み合っています。少し待ってからもう一度お試しください。",
      503,
      requestId,
      origin,
      true,
    );
  }
  if (judgeRoute === "validate") return jsonResponse(validations, 200, requestId, origin);
  if (validations.some((validation) => validation.status !== "observable")) {
    return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422, requestId, origin);
  }
  try {
    const judgeInputs = facts.map((fact, index) => ({
      ...fact,
      text: translated[index]?.skipped ? fact.text : translated[index].textEnglish,
    }));
    return jsonResponse(await analyzeFacts(judge, judgeInputs, requestId, translated.some((t) => t.skipped)), 200, requestId, origin);
  } catch (error) {
    console.error("analysis_unavailable", { requestId, error: error instanceof Error ? error.name : "unknown" });
    return apiError(
      "ANALYSIS_UNAVAILABLE",
      "現在分析が混み合っています。少し待ってからもう一度お試しください。",
      503,
      requestId,
      origin,
      true,
    );
  }
});
