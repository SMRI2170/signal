import { describe, expect, it } from "vitest";

import { getFactInputErrors, normalizeFact } from "./fact";

describe("normalizeFact", () => {
  it("trims and normalizes whitespace", () => {
    expect(normalizeFact("  相手から\n 食事に誘われた  ")).toBe("相手から 食事に誘われた");
  });
});

describe("getFactInputErrors", () => {
  it("allows three distinct facts within the allowed length", () => {
    expect(
      getFactInputErrors([
        "相手から食事に誘われた",
        "帰宅後に相手からメッセージが来た",
        "来週空いているか聞かれた",
      ]),
    ).toEqual([]);
  });

  it("rejects short and duplicate facts", () => {
    expect(getFactInputErrors(["短い", "相手から食事に誘われた", "相手から食事に誘われた"])).toEqual([
      { index: 0, message: "10文字以上で入力してください。" },
      { index: 2, message: "同じFactが入力されています。" },
    ]);
  });
});
