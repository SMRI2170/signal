import { fakeJudge } from "./fake-judge";
import { createTypeSafeJudgeProvider } from "./typesafe-judge";

export function getJudgeProvider() {
  return createTypeSafeJudgeProvider() ?? fakeJudge;
}
