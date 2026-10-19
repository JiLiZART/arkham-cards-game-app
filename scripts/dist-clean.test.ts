import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

// after `npm run build`: the dev-only sound tooling (ADR-0010) and the candidate files must not be in what ships
describe.skipIf(!existsSync("dist"))("the production build", () => {
  const grep = (pattern: string) => {
    try {
      return execFileSync("grep", ["-rl", pattern, "dist"]).toString().trim();
    } catch {
      return "";
    }
  };

  it("has no sound picker and no dev routes", () => {
    expect(grep("Search a slot")).toBe("");
    expect(grep("__sounds")).toBe("");
  });

  it("has no candidate list or candidate audio", () => {
    expect(grep("candidates.json")).toBe("");
    expect(existsSync("dist/sounds/candidates")).toBe(false);
  });
});
