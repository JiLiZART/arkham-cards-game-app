import { describe, expect, it } from "vitest";
import { botChoice } from "../../engine/bot";
import { dispatch } from "../../engine/engine";
import { db, giveCard, mutate, pick, putEnemy, skipMulligans, start } from "../../engine/testkit";
import type { GameEvent } from "../../engine/types";
import {
  captionIndex,
  captionStageBusy,
  feedEntry,
  FLOAT_KINDS,
  floatLife,
  HIDDEN,
  mergeLive,
  promptParts,
  shownCount,
  templateKey,
  type Part,
} from "./feed";

const last = (log: GameEvent[], type: string) => [...log].reverse().find((e) => e.type === type)!;
const placeholders = (s: string) => (s.match(/\{[\w:]+\}/g) ?? []).sort();

describe("feed entries", () => {
  it("prevent: the investigator, the words and what was prevented, in the game's language", () => {
    const ev = {
      type: "prevent",
      text: "Roland Banks prevents 1 horror",
      inv: "01001",
      data: { damage: 0, horror: 1 },
    } as unknown as GameEvent;
    const r = skipMulligans(start("the-gathering", ["01001"], 1));
    const f = feedEntry(ev, r.state, db, "en")!;
    expect(f.parts.some((p) => p.t === "inv")).toBe(true);
    expect(JSON.stringify(f.parts)).toMatch(/prevented/);
    expect(JSON.stringify(feedEntry(ev, r.state, db, "ru")!.parts)).toMatch(/предотвращ/);
  });

  it("resource: portrait, words, amount with the resource icon", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    r = pick(r, /^Gain 1 resource/);
    const f = feedEntry(last(r.state.log, "resource"), r.state, db, "en")!;
    expect(f.parts).toEqual([
      { t: "inv", id: "01001" },
      { t: "text", s: " took " },
      { t: "amount", n: 1, icon: "resource" },
    ]);
    expect(f.tone).toBe("player");
    expect(f.actor).toEqual({ inv: "01001" });
  });

  it("attack: enemy card, investigator, damage and horror icons; anchored on the enemy", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    let enemy = "";
    r = mutate(r, (g) => {
      enemy = putEnemy(g, "01160", g.s.invs["01001"].location!, "01001");
    });
    r = pick(r, /^End turn/);
    const f = feedEntry(
      r.state.log.find((e) => e.type === "attack")!,
      r.state,
      db,
      "en",
    )!;
    expect(f.parts.filter((p) => p.t !== "text")).toEqual([
      { t: "card", id: enemy },
      { t: "inv", id: "01001" },
      { t: "amount", n: 1, icon: "damage" },
      { t: "amount", n: 1, icon: "horror" },
    ]);
    expect(f.tone).toBe("enemy");
  });

  it("testResult: skill icon, tokens and a coloured outcome", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1, { chaosBag: ["-2"] as never }));
    r = pick(r, /^Investigate/);
    r = pick(r, /^Done/);
    const f = feedEntry(last(r.state.log, "testResult"), r.state, db, "en")!;
    expect(f.parts).toContainEqual({ t: "icon", name: "intellect" });
    expect(f.parts).toContainEqual({ t: "token", token: "-2" });
    expect(f.parts).toContainEqual({ t: "outcome", ok: false });
  });

  it("zero amounts are dropped and no placeholder is left unreplaced", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    r = mutate(r, (g) => {
      giveCard(g, "01001", "01088");
    });
    r = pick(r, /^Play Emergency Cache/);
    for (const e of r.state.log) {
      const f = feedEntry(e, r.state, db, "en");
      if (!f) continue;
      for (const p of f.parts)
        if (p.t === "text" || p.t === "strong") expect(p.s).not.toMatch(/\{\w+/);
      for (const p of f.parts) if (p.t === "amount") expect(p.n).not.toBe(0);
    }
  });

  it("every event type in bot playthroughs has a template (or is hidden), in English and Russian", () => {
    const seen = new Set<string>();
    for (const sc of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
      let r = start(sc, ["01001", "01002", "01004"], 3);
      for (let k = 0; k < 1500 && r.state.pending; k++) {
        r = dispatch(db, r.state, {
          type: "choose",
          inv: r.state.pending.inv,
          option: botChoice(db, r),
        });
      }
      for (const e of r.state.log) {
        if (HIDDEN.has(e.type)) continue;
        seen.add(templateKey(e));
        for (const loc of ["en", "ru"])
          expect(feedEntry(e, r.state, db, loc)?.parts.length, `${e.type} ${loc}`).toBeGreaterThan(
            0,
          );
      }
    }
    const missing = [...seen].filter((k) => !db.i18n.en.ui[k]);
    expect(missing).toEqual([]);
    expect(seen.size).toBeGreaterThan(15);
  });

  it("every prompt key in bot playthroughs has English and Russian banner templates", () => {
    const keys = new Set<string>();
    for (const sc of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
      let r = start(sc, ["01001", "01002", "01004"], 3);
      for (let k = 0; k < 1500 && r.state.pending; k++) {
        const p = r.state.pending;
        keys.add(p.promptKey ?? "(none)");
        for (const loc of ["en", "ru"])
          expect(promptParts(p, r.state, db, loc), `${p.promptKey} ${loc}`).not.toBeNull();
        r = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
      }
    }
    expect(keys.has("turn") && keys.has("commit")).toBe(true);
  });

  it("every English feed, phase and prompt template has a Russian one with the same placeholders", () => {
    const en = db.i18n.en.ui;
    const ru = db.i18n.ru.ui;
    for (const k of Object.keys(en).filter(
      (k) =>
        k.startsWith("feed.") ||
        k.startsWith("phase.") ||
        k.startsWith("prompt.") ||
        k.startsWith("instruction."),
    )) {
      expect(ru[k], k).toBeDefined();
      expect(placeholders(ru[k]), k).toEqual(placeholders(en[k]));
    }
  });
});

describe("feed cursor", () => {
  it("never shows past an animated event that hasn't started", () => {
    // log: 0 plain, 1 animated (playing), 2 plain, 3 animated (queued), 4 plain
    expect(shownCount(5, { logIndex: 1 }, [{ logIndex: 3 }])).toBe(3);
    // the queued one starts: everything up to the end shows
    expect(shownCount(5, { logIndex: 3 }, [])).toBe(5);
    // nothing animating: the whole log
    expect(shownCount(5, null, [])).toBe(5);
  });
});

describe("float life", () => {
  const text = (n: number): Part[] => [{ t: "text", s: "x".repeat(n) }];
  it("at least 3.5 s, longer for long sentences, at most 6 s", () => {
    expect(floatLife(text(10))).toBe(3500);
    expect(floatLife(text(30))).toBe(3500);
    expect(floatLife(text(50))).toBe(4700);
    expect(floatLife(text(500))).toBe(6000);
    // a name counts as a dozen characters
    expect(floatLife([{ t: "inv", id: "01001" }, ...text(28)])).toBe(4100);
  });
});

describe("float kinds", () => {
  it("float only the big moments", () => {
    for (const k of ["attack", "damage", "enemyDefeated", "clues", "doom"])
      expect(FLOAT_KINDS.has(k)).toBe(true);
    for (const k of ["resource", "draw", "move", "play", "engage", "phase"])
      expect(FLOAT_KINDS.has(k)).toBe(false);
  });
});

describe("merged live feed", () => {
  const game = skipMulligans(start("the-gathering", ["01001", "01002"], 1)).state;
  const [R, D] = game.order;
  const [r1, r2, r3] = game.invs[R].hand;
  const d1 = game.invs[D].hand[0];
  const ev = (
    type: string,
    inv: string | null,
    card: string | null = null,
    data: Record<string, unknown> = {},
  ): GameEvent => ({ type, text: type, inv, card, data });
  /** the live lines for a crafted log, as plain words (cards as [card]) */
  const lines = (log: GameEvent[], marks: number[]) => {
    const g = { ...game, log };
    const entries = new Map(log.map((e, i) => [i, feedEntry(e, g, db, "en")]));
    return mergeLive(g, entries, log.length, marks, db, "en").map((l) =>
      l.entry.parts
        .map((p) =>
          p.t === "text" || p.t === "strong"
            ? p.s
            : p.t === "inv"
              ? p.id
              : p.t === "card"
                ? "[card]"
                : p.t === "amount"
                  ? `${p.n}${p.icon}`
                  : "",
        )
        .join(""),
    );
  };

  it("upkeep with two investigators is one line", () => {
    const log = [
      ev("ready", null),
      ev("draw", R, r1),
      ev("resource", R, null, { n: 1 }),
      ev("draw", D, d1),
      ev("resource", D, null, { n: 1 }),
    ];
    expect(lines(log, [0])).toEqual(["Each investigator drew a card and took 1resource"]);
  });

  it("three draws by one investigator name the cards", () => {
    expect(lines([ev("draw", R, r1), ev("draw", R, r2), ev("draw", R, r3)], [0])).toEqual([
      `${R} drew [card][card][card]`,
    ]);
  });

  it("an attack breaks the run", () => {
    const log = [
      ev("draw", R, r1),
      ev("attack", R, null, { damage: 1, horror: 0 }),
      ev("draw", R, r2),
    ];
    expect(lines(log, [0])).toHaveLength(3);
  });

  it("two choices stay two lines", () => {
    expect(lines([ev("draw", R, r1), ev("draw", R, r2)], [0, 1])).toHaveLength(2);
  });
  it("phase steps: hidden from the live feed (without breaking a run), kept for the Journal", () => {
    const g = start("the-gathering", ["01001", "01002"], 1).state;
    const [a, b] = g.order;
    const log = [
      { type: "step", text: "upkeep", data: { step: "upkeep" } },
      { type: "draw", text: "", inv: a, card: g.invs[a].hand[0] },
      { type: "step", text: "x", data: { step: "hunters" } },
      { type: "draw", text: "", inv: b, card: g.invs[b].hand[0] },
    ];
    const state = { ...g, log };
    const entries = new Map(log.map((e, i) => [i, feedEntry(e, state, db, "en")]));
    expect(entries.get(0)).toMatchObject({ kind: "step" });
    expect(
      entries
        .get(0)!
        .parts.map((p) => (p.t === "text" ? p.s : ""))
        .join(""),
    ).toMatch(/Upkeep/);
    const lines = mergeLive(state, entries, log.length, [0], db, "en");
    expect(lines.map((l) => l.entry.kind)).toEqual(["merged"]);
    expect(FLOAT_KINDS.has("step")).toBe(false);
  });
  it("caption: the latest step of the phase at or before the playing event", () => {
    const ev = (type: string, step?: string): GameEvent => ({
      type,
      text: "",
      data: step ? { step } : {},
    });
    const log = [
      ev("step", "upkeep"),
      ev("draw"),
      ev("phase"),
      ev("step", "hunters"),
      ev("enemyMove"),
      ev("step", "attacks"),
      ev("attack"),
      ev("damage"),
      ev("phase"),
      ev("turn"),
      ev("attack"),
    ];
    // the hunter's move plays: "Hunters move", even though the feed already shows up to the attack
    expect(captionIndex(log, { logIndex: 4 }, [{ logIndex: 6 }], 6, false, "turn")).toBe(3);
    // the attack plays (also after a reaction choice inside the step)
    expect(captionIndex(log, { logIndex: 6 }, [{ logIndex: 7 }], 7, false, "turn")).toBe(5);
    // nothing plays and the choice is offered: the prompt has the slot
    expect(captionIndex(log, null, [], 8, false, "turn")).toBe(null);
    // an attack of opportunity in the next phase: an earlier phase's step is never shown
    expect(captionIndex(log, { logIndex: 10 }, [], 11, false, "turn")).toBe(null);
    // drawn cards in the showcase after upkeep: still captioned; a phase pause: not
    expect(captionIndex(log.slice(0, 2), null, [], 2, true, "turn")).toBe(0);
    expect(captionIndex(log.slice(0, 2), null, [], 2, true, "phase")).toBe(null);
  });
});

describe("captionStageBusy", () => {
  const ev = (type: string, step?: string): GameEvent => ({
    type,
    text: "",
    inv: null,
    card: null,
    data: step ? { step } : {},
  });
  it("the skill-test screen's hold doesn't keep the caption; anything else on the stage does", () => {
    expect(captionStageBusy([])).toBe(false);
    expect(captionStageBusy(["test:1"])).toBe(false);
    expect(captionStageBusy(["showcase"])).toBe(true);
    expect(captionStageBusy(["event:4", "test:1"])).toBe(true);
    expect(captionStageBusy(["pause:7"])).toBe(true);
  });

  it("a mythos treachery test: once its commit window is offered the caption gives way to the bar (Done)", () => {
    // the log of a mythos draw: step caption, then the draw; the test screen holds the stage while the window waits
    const log = [ev("phase"), ev("step", "mythos"), ev("encounter")];
    expect(captionIndex(log, null, [], 3, captionStageBusy(["test:1"]), "commit")).toBe(null);
    // the same stage with the hand showcase still up keeps its caption
    expect(captionIndex(log, null, [], 3, captionStageBusy(["showcase"]), "turn")).toBe(1);
  });
});

describe("encounter set icons", () => {
  /** play with the bot until an encounter card has been drawn */
  const untilEncounter = () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    for (let k = 0; k < 200 && !r.state.log.some((e) => e.type === "encounter"); k++)
      r = dispatch(db, r.state, {
        type: "choose",
        inv: r.state.pending!.inv,
        option: botChoice(db, r),
      });
    return r;
  };

  it("an encounter draw shows the card's set icon right before the card, in every language", () => {
    const r = untilEncounter();
    const e = last(r.state.log, "encounter");
    const set = db.cards[r.state.cards[e.card!].code].encounterSet!;
    for (const locale of ["en", "ru"]) {
      const parts = feedEntry(e, r.state, db, locale)!.parts;
      const at = parts.findIndex((p) => p.t === "card");
      expect(parts[at - 1], locale).toEqual({ t: "set", code: set });
    }
  });

  it("entries that don't draw or reveal an encounter card have no set icon", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    r = pick(r, /^Gain 1 resource/);
    expect(
      feedEntry(last(r.state.log, "resource"), r.state, db, "en")!.parts.some((p) => p.t === "set"),
    ).toBe(false);
  });
});
