import { describe, expect, it } from "vitest";
import type { ContentDb } from "../../world/types";
import { inPackOrder, traceScripts, usePacks } from "../corpus";

const dbWith = (loaded: string[]) =>
  ({
    packs: Object.fromEntries(
      ["core", "core_2026", "tcu"].map((p) => [p, { loaded: loaded.includes(p), cards: [] }]),
    ),
  }) as unknown as ContentDb;

describe("usePacks", () => {
  it("loads what the recording needs", async () => {
    const asked: string[] = [];
    await usePacks(dbWith(["core"]), ["core_2026"], async (p) => {
      asked.push(p);
    });
    expect(asked).toEqual(["core_2026"]);
  });

  it("refuses when a pack the recording doesn't name is already loaded: its cards would change the game", async () => {
    await expect(usePacks(dbWith(["core", "core_2026"]), [], async () => {})).rejects.toThrow(
      /core_2026/,
    );
  });
});

describe("inPackOrder", () => {
  it("puts recordings that need fewer packs first, keeping their order otherwise", () => {
    const r = (id: string, packs: string[]) => ({ id, packs });
    expect(
      inPackOrder([r("a", ["core_2026"]), r("b", []), r("c", ["core_2026"]), r("d", [])]).map(
        (x) => x.id,
      ),
    ).toEqual(["b", "d", "a", "c"]);
  });
});

describe("traceScripts", () => {
  it("records the code of every script whose functions run, wrapping each script once", () => {
    const calls: string[] = [];
    const scripts: Record<string, Record<string, unknown>> = {
      "01001": { fns: { a: () => calls.push("fn") }, hooks: {} },
      "01002": { modifiers: () => [], conditions: { c: () => true } },
      "01003": { abilities: [] },
    };
    const db = { scripts } as unknown as ContentDb;
    const ran = new Set<string>();
    traceScripts(db, ran);
    traceScripts(db, ran);
    (scripts["01001"].fns as { a: () => void }).a();
    expect((scripts["01002"].conditions as { c: () => boolean }).c()).toBe(true);
    expect([...ran].sort()).toEqual(["01001", "01002"]);
    expect(calls).toEqual(["fn"]);
  });
});
