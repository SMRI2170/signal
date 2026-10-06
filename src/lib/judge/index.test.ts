import { afterEach, describe, expect, it } from "vitest";

import { FakeJudgeProvider } from "./fake-judge";
import { getJudgeProvider } from "./index";
import { JudgeProviderUnavailableError } from "./provider";

const originalNodeEnv = process.env.NODE_ENV;
const originalTypeSafeKey = process.env.TYPESAFE_API_KEY;
const originalLegacyTypeSafeKey = process.env.TYPESAFE_AI_API_KEY;
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  if (originalNodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalNodeEnv;
  if (originalTypeSafeKey === undefined) delete process.env.TYPESAFE_API_KEY;
  else process.env.TYPESAFE_API_KEY = originalTypeSafeKey;
  if (originalLegacyTypeSafeKey === undefined) delete process.env.TYPESAFE_AI_API_KEY;
  else process.env.TYPESAFE_AI_API_KEY = originalLegacyTypeSafeKey;
});

describe("getJudgeProvider", () => {
  it("keeps the deterministic fake provider for local development", () => {
    mutableEnv.NODE_ENV = "development";
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.TYPESAFE_AI_API_KEY;

    expect(getJudgeProvider()).toBeInstanceOf(FakeJudgeProvider);
  });

  it("fails closed in production when Jev is not configured", () => {
    mutableEnv.NODE_ENV = "production";
    delete process.env.TYPESAFE_API_KEY;
    delete process.env.TYPESAFE_AI_API_KEY;

    expect(() => getJudgeProvider()).toThrow(JudgeProviderUnavailableError);
  });
});
