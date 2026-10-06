# Jev integration

SIGNAL calls Jev through the server-side `JudgeProvider`. The web server reads `TYPESAFE_API_KEY` from `.env.local`; `supabase/functions/signal-api` reads it from Supabase Function secrets. The API key must never be included in browser or native-app builds.

The SDK sends the API key as a bearer credential. The default model is `jev-latest`; set `TYPESAFE_DEFAULT_MODEL` only when choosing another model available to the account. Requests time out after 8 seconds per attempt and retry at most once.

## Local setup

For the Next.js API routes, add the Jev key to `.env.local`:

```dotenv
TYPESAFE_API_KEY=your-server-side-key
TYPESAFE_DEFAULT_MODEL=jev-latest
```

For local Supabase Edge Functions, copy `supabase/functions/.env.example` to `supabase/functions/.env` and set the key there. The copied `.env` is ignored by Git. Do not commit it.

In production, add `TYPESAFE_API_KEY` to the Supabase project’s Edge Function secrets through the Dashboard or Supabase CLI. The production project referenced by the native API URL already has a `TYPESAFE_API_KEY` secret. The CLI checkout is not linked to that project, and the secret value is not available in local files.

When the key is absent, the Next.js development server uses Fake Judge. Production Next.js fails closed; the Supabase function always fails closed. An invalid Jev answer also returns an unavailable error and is never saved.

## Consent and data handling

The web forms explain that Fact text is sent to TypeSafe AI for Jev analysis and require a separate checkbox for each analysis or reanalysis. The API routes reject requests without `jevConsent: true`. The guest save flow carries that consent into the save request.

TypeSafe’s published terms say customer data is not used to train models without prior consent. The agreement also permits ongoing telemetry processing and does not give a fixed retention period for request data. SIGNAL’s consent notice links to the [Master Customer Agreement](https://typesafe.ai/legal/mca) and [Privacy Policy](https://typesafe.ai/legal/privacy-policy). Avoid putting names, contact details, or other identifying details in Facts.

Jev returns typed choices and scores rather than generated strings, so Fact translation is not part of this adapter; `translatedFactEn` stays `null`.

## Usage and quality review

Successful calls emit a `jev_usage` log event containing only the request/operation ID, stage, model, input/output token counts, and estimated cost. That application log never includes Fact text. Sum the `validation` and `analysis` events with the same ID to estimate one preview/save operation.

Supabase documents that its hosted Edge Function [**Invocations** view can show the HTTP request and response bodies](https://supabase.com/docs/guides/functions/logging). Since `signal-api` receives Fact text in its request body, source-code log redaction alone does not prove that Fact text is absent from all Supabase platform logs. Verify the linked project's invocation capture and retention before enabling this path for real user data; otherwise route these calls through a backend that does not retain request bodies.

The estimate uses TypeSafe’s published early-access price of $0.042 per million input tokens, with output tokens listed as free. It is an estimate and may differ from account billing; confirm current rates in the [Jev announcement](https://typesafe.ai/blog/introducing-system-one-models-and-jev).

After adding the key, run `npm run evaluate:jev`. This makes four API calls using only synthetic positive, negative, sparse-evidence, interpretation, and unclear examples. It prints the typed results and usage for human review; it does not send users’ Facts.

## Live synthetic evaluation snapshot

On 2026-10-04, the deployed `jev-1.13.0` returned these 0–100 scores through the Supabase preview endpoint. All examples were synthetic and no records were saved.

| Scenario | Romantic interest | Meet | Initiative | Evidence sufficiency |
|---|---:|---:|---:|---:|
| Positive actions | 68 | 71 | 75 | 72 |
| Negative actions | 5 | 4 | 5 | 10 |
| Sparse evidence | 37 | 31 | 22 | 38 |

The positive set passed Fact validation when sent by itself. A mixed validation request containing an observable action, an interpretation, and an unclear note returned `interpretation` for all three. That exposed a prompt bug: each Jev question was identical and did not identify which Fact it targeted. The local adapter now includes the Fact index and ID in each question and explicitly excludes the other Facts. Unit tests check that targeting. This prompt fix still needs a live run after it is deployed; the rows above describe the earlier deployed version.
