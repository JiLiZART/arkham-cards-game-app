/** The core (context, movement, queries) owns the state's shape (ADR-0022): the mutable record lookups are for it alone. */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, normalize, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );

describe("the engine's core boundary", () => {
  it("only the core imports the store's mutable records; tests may, to build state", () => {
    const importers = [...walk("src"), ...walk("content"), ...walk("scripts")]
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith("store.ts") && !/\.test\.tsx?$/.test(f))
      .filter((f) => /from\s+"[./]*(?:engine\/)?world\/store"/.test(readFileSync(f, "utf8")));
    expect(importers).toEqual([
      "src/engine/context.ts",
      "src/engine/index.ts",
      "src/engine/movement.ts",
      "src/engine/queries.ts",
    ]);
  });
});

/** the engine's source modules (tests, kits and the recorded-games tools aside) and what each imports of the others */
function importGraph(): Map<string, Set<string>> {
  const root = "src/engine";
  const modules = walk(root).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.includes("/replays/"),
  );
  const names = new Set(modules.map((f) => relative(root, f).replace(/\.ts$/, "")));
  const graph = new Map<string, Set<string>>();
  for (const file of modules) {
    const from = relative(root, file).replace(/\.ts$/, "");
    const targets = new Set<string>();
    for (const m of readFileSync(file, "utf8").matchAll(/(?:from|import)\s+"(\.[^"]+)"/g)) {
      const target = relative(root, normalize(join(dirname(file), m[1])));
      if (names.has(target)) targets.add(target);
    }
    graph.set(from, targets);
  }
  return graph;
}

/** groups of modules that import each other, in a ring (strongly connected components of more than one) */
function importCycles(graph: Map<string, Set<string>>): string[][] {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const cycles: string[][] = [];
  let next = 0;
  const visit = (v: string) => {
    index.set(v, next);
    low.set(v, next++);
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const group: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        group.push(w);
      } while (w !== v);
      if (group.length > 1) cycles.push(group.sort());
    }
  };
  for (const v of [...graph.keys()].sort()) if (!index.has(v)) visit(v);
  return cycles.sort();
}

describe("the engine's import directions (ADR-0025)", () => {
  it("no module imports a module that imports it", () => {
    expect(importCycles(importGraph())).toEqual([]);
  });

  it("finds a cycle in a graph that has one", () => {
    const graph = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
      ["c", new Set(["a"])],
      ["d", new Set(["a"])],
    ]);
    expect(importCycles(graph)).toEqual([["a", "b", "c"]]);
  });
});

/** where a source file names the engine context in the old way: a type `G`, or a parameter or variable `g` typed with it */
function oldContextNames(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.ES2022,
    true,
  );
  const found: string[] = [];
  const at = (node: ts.Node) =>
    `${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`;
  const visit = (node: ts.Node) => {
    if (ts.isTypeReferenceNode(node) && node.typeName.getText(source) === "G")
      found.push(`${at(node)} type G`);
    if ((ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) && node.name.text === "G")
      found.push(`${at(node)} imports G`);
    if (
      (ts.isParameter(node) || ts.isVariableDeclaration(node)) &&
      node.name.getText(source) === "g"
    ) {
      const type = node.type?.getText(source);
      if (type === "GameContext" || type === "G")
        found.push(`${at(node)} ${node.name.getText(source)}: ${type}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("the engine context's names (engine-folder-structure)", () => {
  it("is GameContext, and a parameter or variable of that type is called game, in the engine and in every script", () => {
    const files = [...walk("src/engine"), ...walk("content")].filter((f) => /\.ts$/.test(f));
    expect(files.flatMap(oldContextNames)).toEqual([]);
  });
});

/**
 * The layers of the engine (ADR-0025), lowest first. A module may import modules of its own layer and of lower ones;
 * movement and queries are layers of their own at the same height, so they may not import each other.
 */
const LAYERS: { name: string; rank: number; test: (path: string) => boolean }[] = [
  {
    name: "world, events, step names",
    rank: 0,
    test: (p) => /^(world|events)\//.test(p) || p === "steps/step",
  },
  { name: "context", rank: 1, test: (p) => p === "context" },
  { name: "movement", rank: 2, test: (p) => p === "movement" },
  { name: "queries", rank: 2, test: (p) => p === "queries" },
  { name: "rules", rank: 3, test: (p) => p.startsWith("rules/") },
  { name: "effects", rank: 4, test: (p) => p.startsWith("effects/") },
  { name: "step dispatch", rank: 5, test: (p) => p === "steps/dispatch" },
  { name: "entry", rank: 6, test: (p) => p === "index" },
  {
    name: "campaign, api, bot, kits",
    rank: 7,
    test: (p) => p === "api" || p === "bot" || p.startsWith("campaign/") || p.startsWith("kits/"),
  },
];
const layerOf = (path: string) => LAYERS.find((layer) => layer.test(path));

describe("the engine's layers (ADR-0025)", () => {
  it("every module belongs to a layer", () => {
    const unplaced = [...importGraph().keys()].filter((path) => !layerOf(path));
    expect(unplaced).toEqual([]);
  });

  it("no module imports a layer above its own, or a sibling layer at its height", () => {
    const violations: string[] = [];
    for (const [from, targets] of importGraph()) {
      const source = layerOf(from);
      if (!source) continue;
      for (const to of targets) {
        const target = layerOf(to);
        if (!target || target === source || target.rank < source.rank) continue;
        violations.push(`${from} (${source.name}) imports ${to} (${target.name})`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("only the entry points and the core sit at the top level; the test and bot kits are in kits/", () => {
    const top = readdirSync("src/engine", { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".test.ts"))
      .map((e) => e.name)
      .sort();
    expect(top).toEqual([
      "api.ts",
      "bot.ts",
      "context.ts",
      "index.ts",
      "movement.ts",
      "queries.ts",
    ]);
  });
});

describe("where the engine's tests sit", () => {
  it("every test is in a __tests__ folder beside the code it tests, and __tests__ holds only tests", () => {
    const files = walk("src/engine").filter((f) => f.endsWith(".ts"));
    const loose = files.filter((f) => f.endsWith(".test.ts") && !f.includes("/__tests__/"));
    const notTests = files.filter((f) => f.includes("/__tests__/") && !f.endsWith(".test.ts"));
    expect({ loose, notTests }).toEqual({ loose: [], notTests: [] });
  });
});

describe("what engine tests read (ADR-0029)", () => {
  // engine tests assert on prompts, events and views; these still read or write the step stack and may only leave
  // the list. The step stack's own tests (steps/__tests__) are exempt: the stack is what they test.
  const STILL_READ_THE_STACK = [
    "src/engine/__tests__/coreCards.test.ts",
    "src/engine/__tests__/daisy-prey.test.ts",
    "src/engine/__tests__/scenarioState.test.ts",
    "src/engine/__tests__/scriptGuards.test.ts",
    "src/engine/__tests__/searchCrashes.test.ts",
  ];
  const readsTheStack = (text: string) =>
    /\.queue\b|pending\??\.step\b|skillTest\s*=[^=]/.test(text);
  const tests = walk("src/engine")
    .filter(
      (f) =>
        /__tests__[\\/][^\\/]+\.test\.ts$/.test(f) &&
        !/steps[\\/]__tests__/.test(f) &&
        !f.endsWith("boundary.test.ts"),
    )
    .map((f) => f.split("\\").join("/"));

  it("no test outside the list reads the step stack", () => {
    const offenders = tests.filter(
      (f) => !STILL_READ_THE_STACK.includes(f) && readsTheStack(readFileSync(f, "utf8")),
    );
    expect(offenders).toEqual([]);
  });

  it("a listed test that no longer reads the stack is taken off the list", () => {
    const clean = STILL_READ_THE_STACK.filter((f) => !readsTheStack(readFileSync(f, "utf8")));
    expect(clean).toEqual([]);
  });
});
