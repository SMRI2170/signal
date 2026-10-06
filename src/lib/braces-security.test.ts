import braces, { type BracesNode } from "braces";
import { describe, expect, it } from "vitest";

function nestedBraces(depth: number): string {
  return `${"{".repeat(depth)}a,b${"}".repeat(depth)}`;
}

describe("braces security backport", () => {
  it("rejects deeply nested braces and parentheses before recursive processing", () => {
    expect(() => braces.parse(nestedBraces(101))).toThrow(/exceeds max depth/);
    expect(() => braces.parse(`${"(".repeat(101)}a${")".repeat(101)}`)).toThrow(/exceeds max depth/);
    expect(() => braces.parse(nestedBraces(100))).not.toThrow();
  });

  it("enforces fractional maxDepth limits while parsing", () => {
    expect(() => braces.parse(nestedBraces(1), { maxDepth: 1.5 })).not.toThrow();
    expect(() => braces.parse(nestedBraces(2), { maxDepth: 1.5 })).toThrow(/exceeds max depth/);
  });

  it.each(["compile", "expand", "stringify"] as const)("bounds manually supplied ASTs in %s", (method) => {
    let node: BracesNode = { type: "text", value: "x" };
    for (let depth = 0; depth < 101; depth += 1) {
      node = { type: "brace", nodes: [node] };
    }
    const ast: BracesNode = { type: "root", nodes: [node] };

    expect(() => braces[method](ast)).toThrow(/exceeds max depth/);
  });

  it("rejects cyclic AST parent chains during expansion", () => {
    const ast: BracesNode = { type: "paren", nodes: [{ type: "text", value: "x" }] };
    ast.parent = ast;

    expect(() => braces.expand(ast)).toThrow(/parent chain contains a cycle/);
  });

  it("preserves valid nested brace stringification with escapeInvalid", () => {
    for (const pattern of ["{{a}}", "{a,{b}}", "{{x}y}", "{a,{b,{c}}", "{}{a}"]) {
      expect(braces.stringify(braces.parse(pattern), { escapeInvalid: true })).toBe(pattern);
    }
  });
});
