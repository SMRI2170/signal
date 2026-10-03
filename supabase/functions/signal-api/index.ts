import { choice, score, TypeSafeClient } from "npm:@typesafe-ai/sdk@0.6.0";

type FactInput = {
  clientFactId: string;
  text: string;
};

type ValidationStatus = "observable" | "interpretation" | "unclear";

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
const encoder = new TextEncoder();

function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function parseFacts(body: unknown, minimum: number): FactInput[] | null {
  if (!body || typeof body !== "object") return null;
  const facts = (body as Record<string, unknown>).facts;
  if (!Array.isArray(facts) || facts.length < minimum || facts.length > 10 || !facts.every(isFactInput)) {
    return null;
  }
  return facts.map((fact) => ({ ...fact, text: fact.text.trim() }));
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

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizeScore(value: number) {
  return clampScore((value / (SCORE_LEVELS.length - 1)) * 100);
}

function createJudge() {
  const apiKey = Deno.env.get("TYPESAFE_API_KEY");
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is not configured");
  return new TypeSafeClient({
    apiKey,
    logLevel: "off",
    timeout: 8_000,
    retry: { maxRetries: 1 },
  });
}

async function validateFacts(judge: TypeSafeClient, facts: FactInput[]) {
  const questions = Object.fromEntries(
    facts.map((_fact, index) => [
      `fact_${index}`,
      choice(
        "この文章は、相手との間で実際に起きた出来事だけを記録していますか。文章そのものだけを判定し、書かれていない事情を推測しないでください。",
        OBSERVABILITY_CRITERIA,
      ),
    ]),
  );
  const response = await judge.systemOne({
    state: { facts: facts.map(({ clientFactId, text }) => ({ clientFactId, text })) },
    questions,
  });

  return facts.map((fact, index) => {
    const status = response.answers[`fact_${index}`]?.choice as ValidationStatus | undefined;
    if (!status || !(status in OBSERVABILITY_CRITERIA)) throw new Error("Invalid validation response");
    return {
      clientFactId: fact.clientFactId,
      status,
      ...validationCopy(status),
      translatedFactEn: null,
    };
  });
}

async function analyzeFacts(judge: TypeSafeClient, facts: FactInput[]) {
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

  const answers = response.answers;
  const values = [
    answers.romanticInterest?.score,
    answers.desireToMeet?.score,
    answers.initiative?.score,
    answers.evidenceSufficiency?.score,
  ];
  if (values.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error("Invalid analysis response");
  }
  return {
    scores: {
      romanticInterest: normalizeScore(answers.romanticInterest.score),
      desireToMeet: normalizeScore(answers.desireToMeet.score),
      initiative: normalizeScore(answers.initiative.score),
      evidenceSufficiency: normalizeScore(answers.evidenceSufficiency.score),
    },
    impact: null,
    modelVersion: response.model,
    rubricVersion: "signal-rubric-v1",
  };
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

async function consumeRateLimit(request: Request, scope: "validate" | "preview", limit: number) {
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

Deno.serve(async (request) => {
  const requestId = crypto.randomUUID();
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return apiError("ORIGIN_NOT_ALLOWED", "この接続元からは利用できません。", 403, requestId, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return apiError("METHOD_NOT_ALLOWED", "POSTで送信してください。", 405, requestId, origin);
  }

  const pathname = new URL(request.url).pathname;
  const route = pathname.endsWith("/api/facts/validate")
    ? "validate"
    : pathname.endsWith("/api/analyses/preview")
    ? "preview"
    : null;
  if (!route) return apiError("NOT_FOUND", "APIが見つかりません。", 404, requestId, origin);

  try {
    const allowed = await consumeRateLimit(request, route, route === "validate" ? 20 : 10);
    if (!allowed) {
      const message = route === "validate"
        ? "しばらく待ってからもう一度お試しください。"
        : "分析回数の上限です。しばらく待ってからお試しください。";
      return apiError("RATE_LIMITED", message, 429, requestId, origin, true);
    }
  } catch (error) {
    console.error(`[${requestId}] rate_limit_unavailable`, error instanceof Error ? error.message : "unknown");
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
  const facts = parseFacts(body, route === "validate" ? 1 : 3);
  if (!facts) {
    const code = route === "validate" ? "INVALID_REQUEST" : "INSUFFICIENT_FACTS";
    const message = route === "validate" ? "入力内容を確認してください。" : "3件以上のFactを入力してください。";
    return apiError(code, message, 400, requestId, origin);
  }

  let judge: TypeSafeClient;
  let validations: Awaited<ReturnType<typeof validateFacts>>;
  try {
    judge = createJudge();
    validations = await validateFacts(judge, facts);
  } catch (error) {
    console.error(`[${requestId}] validation_unavailable`, error instanceof Error ? error.name : "unknown");
    return apiError(
      "VALIDATION_UNAVAILABLE",
      "現在判定が混み合っています。少し待ってからもう一度お試しください。",
      503,
      requestId,
      origin,
      true,
    );
  }
  if (route === "validate") return jsonResponse(validations, 200, requestId, origin);
  if (validations.some((validation) => validation.status !== "observable")) {
    return apiError("FACT_NOT_OBSERVABLE", "観測可能なFactに書き換えてください。", 422, requestId, origin);
  }
  try {
    return jsonResponse(await analyzeFacts(judge, facts), 200, requestId, origin);
  } catch (error) {
    console.error(`[${requestId}] analysis_unavailable`, error instanceof Error ? error.name : "unknown");
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
