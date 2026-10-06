import { fakeJudge } from "./fake-judge";
import { JudgeProviderUnavailableError } from "./provider";
import { createJevJudgeProvider } from "./jev-judge";

export function getJudgeProvider() {
  const provider = createJevJudgeProvider();
  if (provider) return provider;
  if (process.env.NODE_ENV === "production") {
    throw new JudgeProviderUnavailableError("Jev is not configured.");
  }
  return fakeJudge;
}
