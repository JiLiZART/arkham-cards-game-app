import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bagsOf, oneCardPerFace, scenarioOf } from "./import-campaigns";

type Card = {
  code: string;
  name: string;
  type: string;
  set?: string;
  pack: string;
  stage?: number;
  text?: string;
};
const card = (code: string, name: string, type: string, set: string, stage?: number): Card => ({
  code,
  name,
  type,
  set,
  pack: "p",
  ...(stage ? { stage } : {}),
});
/** a tiny snapshot: the scenario's own set (reference card, a Return-to setup card, act, agendas, two locations), and The Midnight Masks */
const CARDS: Card[] = [
  card("90001", "The Test", "scenario", "the_test"),
  card("90002", "Return to The Test", "scenario", "the_test"),
  card("90010", "Act One", "act", "the_test", 1),
  card("90020", "Agenda One", "agenda", "the_test", 1),
  card("90021", "Agenda Two", "agenda", "the_test", 2),
  card("90030", "Hall", "location", "the_test"),
  card("90031", "Garden", "location", "the_test"),
  card("72008", "Central Lot", "location", "the_test"),
  card("72008b", "Central Lot", "location", "the_test"),
  card("01124", "Your House", "location", "arkham"),
  card("01141", "Acolyte of Umôrdhoth", "enemy", "arkham"),
  card("01142", "False Lead", "treachery", "arkham"),
  card("01143", "Hunting Shadow", "treachery", "arkham"),
];
const cards = new Map(CARDS.map((c) => [c.code, c]));
const bySet = new Map<string, Card[]>();
for (const c of CARDS) bySet.set(c.set!, [...(bySet.get(c.set!) ?? []), c]);

const raw = (steps: object[], over: object = {}) => ({
  id: "the_test",
  scenario_name: "The Test",
  chaos_bag_card: "90001",
  setup: steps.map((s) => (s as { id: string }).id),
  steps,
  resolutions: [],
  ...over,
});
const gather = (sets: string[], subtext?: string) => ({
  id: "sets",
  type: "encounter_sets",
  encounter_sets: sets,
  ...(subtext ? { subtext } : {}),
});
const text = (t: string) => ({ id: "text", type: "story", text: t });
const of = (r: object) => scenarioOf(r, "test", cards as never, bySet as never, {});

describe("importing a scenario from the campaign guide", () => {
  it("a set the guide gathers only the treacheries of is kept, its other cards removed at setup", () => {
    const s = of(
      raw([
        gather(
          ["the_test", "arkham"],
          "When gathering <i>The Midnight Masks</i> encounter set, only gather the 5 treachery cards (2x False Lead and 3x Hunting Shadow).",
        ),
        text("Put the Hall into play."),
      ]),
    )!;
    expect(s.encounterSets).toContain("arkham");
    expect(s.setup).toContainEqual({ do: "remove", codes: ["01124", "01141"] });
  });

  it("a note that keeps locations and treacheries removes the rest, and never a card the setup puts into play", () => {
    const s = of(
      raw([
        gather(
          ["the_test", "arkham"],
          "When gathering <i>The Midnight Masks</i> encounter set, only gather the location and treachery cards.",
        ),
        text("Put the Hall into play."),
      ]),
    )!;
    expect(s.setup).toContainEqual({ do: "remove", codes: ["01141"] });
    const placed = of(
      raw([
        gather(
          ["the_test", "arkham"],
          "When gathering <i>The Midnight Masks</i> encounter set, only gather the treachery cards.",
        ),
        text("Put Your House into play."),
      ]),
    )!;
    expect(placed.setup).toContainEqual({ do: "remove", codes: ["01141"] });
  });

  it("a scenario with agendas and no act deck is written, not skipped", () => {
    const noAct = new Map(bySet);
    noAct.set(
      "the_test",
      bySet.get("the_test")!.filter((c) => c.type !== "act"),
    );
    const s = scenarioOf(
      raw([gather(["the_test"]), text("Put the Hall into play.")]),
      "test",
      cards as never,
      noAct as never,
      {},
    );
    expect(s?.acts).toEqual([]);
    expect(s?.agendas).toEqual(["90020", "90021"]);
  });

  it("a setup that names no location starts at the first location of the gathered sets", () => {
    const s = of(raw([gather(["the_test"]), text("Draw one of those locations at random.")]))!;
    expect(s.setup[0]).toEqual({ do: "putIntoPlay", codes: ["90030"] });
  });

  it("a back face beside its front is never placed as a second location", () => {
    const s = of(raw([gather(["the_test"]), text("Put the Central Lot into play.")]))!;
    expect(s.setup[0]).toEqual({ do: "putIntoPlay", codes: ["72008"] });
  });

  it("a Return-to setup card of the scenario's own set is listed beside its reference card", () => {
    expect(of(raw([gather(["the_test"]), text("Put the Hall into play.")]))!.setupCards).toEqual([
      "90002",
    ]);
  });

  it("a side scenario's chaos bags come from its own difficulty choice when the campaign has none", () => {
    const choice = {
      id: "difficulty",
      input: {
        type: "choose_one",
        choices: [
          { id: "easy", tokens: ["+1", "skull"] },
          { id: "standard", tokens: ["0", "blood"] },
        ],
      },
    };
    expect(bagsOf("side", [[], [choice]])).toEqual({
      easy: ["+1", "skull"],
      standard: ["0", "blood"],
    });
  });
});

describe("the generated campaigns (pnpm import:campaigns output)", () => {
  const G = "content/campaigns-generated";
  const json = (f: string) => JSON.parse(readFileSync(f, "utf8"));
  const scenarios = readdirSync(G, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) =>
      readdirSync(join(G, d.name, "scenarios")).map((f) => json(join(G, d.name, "scenarios", f))),
    );

  it("leaves the hand-written campaigns alone: no generated copy of them", () => {
    for (const id of [
      "the-dunwich-legacy",
      "return-to-the-dunwich-legacy",
      "the-path-to-carcosa",
      "return-to-the-path-to-carcosa",
    ]) {
      expect(existsSync(join("content/campaigns", id, "campaign.json")), id).toBe(true);
      expect(existsSync(join(G, id)), id).toBe(false);
    }
  });

  it("writes the agenda-only and random-start scenarios the import used to skip", () => {
    expect(existsSync(join(G, "the-drowned-city/scenarios/sepulchre-of-the-sleeper.json"))).toBe(
      true,
    );
    expect(
      existsSync(
        join(G, "return-to-the-forgotten-age/scenarios/return-to-the-depths-of-yoth.json"),
      ),
    ).toBe(true);
  });

  it("gives a side scenario its own chaos bags, not Night of the Zealot's", () => {
    const own = json(join(G, "side-red-tide-rising/campaign.json")).chaosBags;
    const notz = json("content/campaigns/night-of-the-zealot/campaign.json").chaosBags;
    expect(own).not.toEqual(notz);
  });

  // The Path to Carcosa and its Return-to box are hand-written now: the box's Echoes there started as the importer's output
  it("removes the Midnight Masks cards Echoes of the Past doesn't gather", () => {
    const echoes = json(
      "content/campaigns/return-to-the-path-to-carcosa/scenarios/return-to-echoes-of-the-past.json",
    );
    const removed = echoes.setup.find((st: { do: string }) => st.do === "remove");
    // its locations, acts, agendas and The Masked Hunter go; Hunting Shadow (01135) and False Lead (01136) stay
    expect(removed?.codes).toEqual(expect.arrayContaining(["01121b", "01123", "01124", "01134"]));
    expect(removed?.codes).not.toContain("01135");
    expect(removed?.codes).not.toContain("01136");
  });

  it("never places a back face as a card of its own", () => {
    expect(scenarios.filter((s) => JSON.stringify(s.setup).includes('"72008b"'))).toEqual([]);
  });

  it("compiles Children of Blood's blood token changes, and gathers no Epic Multiplayer set", () => {
    expect(readFileSync(join(G, "children-of-blood/flow.json"), "utf8")).toContain(
      '"token": "blood"',
    );
    expect(
      scenarios.filter((s) => s.encounterSets.some((x: string) => x.includes("epic"))),
    ).toEqual([]);
  });
});

describe("the generated flows (campaign-flow-compiler-fixes)", () => {
  const G = "content/campaigns-generated";
  type Flow = {
    order: string[];
    resolutions: Record<string, Record<string, string[]>>;
    interludes: Record<string, unknown>;
    steps: Record<
      string,
      {
        kind: string;
        effects?: { do: string; [k: string]: unknown }[];
        then?: string[];
        else?: string[];
        choices?: { steps: string[]; effects?: { do: string; [k: string]: unknown }[] }[];
        steps_?: string[];
      }
    >;
  };
  const flowOf = (c: string): Flow => JSON.parse(readFileSync(join(G, c, "flow.json"), "utf8"));
  const reach = (f: Flow, ids: string[], seen = new Set<string>()): string[] =>
    ids.flatMap((id) => {
      if (seen.has(id) || !f.steps[id]) return [];
      seen.add(id);
      const st = f.steps[id];
      const kids = [
        ...(st.then ?? []),
        ...(st.else ?? []),
        ...(st.choices ?? []).flatMap((c) => c.steps),
      ];
      return [id, ...reach(f, kids, seen)];
    });
  const effects = (f: Flow, ids: string[]) =>
    reach(f, ids).flatMap((id) => [
      ...(f.steps[id].kind === "effects" ? (f.steps[id].effects ?? []) : []),
      ...(f.steps[id].choices ?? []).flatMap((c) => c.effects ?? []),
    ]);

  // The Path to Carcosa is hand-written now: its flow there started as the importer's output
  it("Carcosa plays in the guide's order, with the original Interlude I", () => {
    const hand: Flow = JSON.parse(
      readFileSync("content/campaigns/the-path-to-carcosa/flow.json", "utf8"),
    );
    expect(hand.order).toEqual([
      "ptc-prologue",
      "curtain-call",
      "the-last-king",
      "ptc-interlude1",
      "echoes-of-the-past",
      "the-unspeakable-oath",
      "ptc-interlude2",
      "a-phantom-of-truth",
      "the-pallid-mask",
      "black-stars-rise",
      "dim-carcosa",
      "ptc-epilogue",
    ]);
    const ret: Flow = JSON.parse(
      readFileSync("content/campaigns/return-to-the-path-to-carcosa/flow.json", "utf8"),
    );
    expect(ret.order.slice(0, 4)).toEqual([
      "ptc-prologue",
      "return-to-curtain-call",
      "return-to-the-last-king",
      "ptc-interlude1",
    ]);
  });

  // The Dunwich Legacy and its Return-to box are hand-written now: the box's flow there is still the importer's output
  it("The House Always Wins with no resolution runs Resolution 1's steps", () => {
    const f: Flow = JSON.parse(
      readFileSync("content/campaigns/return-to-the-dunwich-legacy/flow.json", "utf8"),
    );
    const keys = (ids: string[]) =>
      effects(f, ids)
        .filter((e) => e.do === "record")
        .map((e) => e.key);
    const r = f.resolutions["return-to-the-house-always-wins"];
    expect(keys(r.none)).toEqual(keys(r.R1));
    expect(keys(r.none)).toContain("boneToPick");
  });

  it("Written in Rock's resolutions end with its hidden Resolution 6, advance the day and go to The First Evening", () => {
    const f = flowOf("the-feast-of-hemlock-vale");
    const r = f.resolutions["written-in-rock"];
    expect(Object.keys(r)).not.toContain("R6");
    const file = JSON.parse(
      readFileSync(join(G, "the-feast-of-hemlock-vale/scenarios/written-in-rock.json"), "utf8"),
    );
    expect(Object.keys(file.resolutions)).not.toContain("R6");
    const fx = effects(f, r.R1);
    expect(fx).toContainEqual({ do: "count", id: "day", section: "hidden", op: "add", value: 1 });
    expect(fx).toContainEqual({ do: "nextScenario", scenario: "the-first-evening" });
  });

  it("The Dream-Eaters' halves upgrade decks after Dark Side of the Moon and Point of No Return", () => {
    for (const [c, sc] of [
      ["the-dream-quest", "dark-side-of-the-moon"],
      ["the-web-of-dreams", "point-of-no-return"],
    ] as const) {
      const f = flowOf(c);
      for (const ids of Object.values(f.resolutions[sc]))
        expect(reach(f, ids).some((id) => f.steps[id].kind === "upgradeDecks")).toBe(true);
    }
  });

  it("only Fortune and Folly holds its checkpoint interlude", () => {
    const sides = readdirSync(G).filter((d) => d.startsWith("side-"));
    expect(sides.filter((d) => "fortune-and-folly-checkpoint" in flowOf(d).interludes)).toEqual([]);
    expect(flowOf("fortune-and-folly").interludes).toHaveProperty("fortune-and-folly-checkpoint");
  });
});

describe("oneCardPerFace", () => {
  const card = (code: string, type: string) =>
    [code, { code, name: code, type, pack: "x" }] as const;
  const cards = new Map([
    card("03076a", "asset"),
    card("03076b", "story"),
    card("05262", "location"),
    card("05262b", "location"),
    card("01121a", "agenda"),
    card("01121b", "enemy"),
  ]);
  it("keeps a double-faced card's front when both faces are named, and an act's or agenda's other card", () => {
    expect(
      oneCardPerFace(["03076a", "03076b", "05262", "05262b", "01121a", "01121b"], cards),
    ).toEqual(["03076a", "05262", "01121a", "01121b"]);
  });
  it("keeps a back named on its own (the card set aside with that side up)", () => {
    expect(oneCardPerFace(["03076b"], cards)).toEqual(["03076b"]);
  });
});
