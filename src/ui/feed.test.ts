import { describe, expect, it } from "vitest";
import { botChoice } from "../engine/bot";
import { dispatch } from "../engine/engine";
import { db, giveCard, mutate, pick, putEnemy, skipMulligans, start } from "../engine/testkit";
import type { GameEvent } from "../engine/types";
import { feedEntry, floatLife, HIDDEN, promptParts, shownCount, templateKey, type Part } from "./feed";

const last = (log: GameEvent[], type: string) => [...log].reverse().find((e) => e.type === type)!;
const placeholders = (s: string) => (s.match(/\{[\w:]+\}/g) ?? []).sort();

describe("feed entries", () => {
  it("resource: portrait, words, amount with the resource icon", () => {
    let r = skipMulligans(start("the-gathering", ["01001"], 1));
    r = pick(r, /^Gain 1 resource/);
    const f = feedEntry(last(r.state.log, "resource"), r.state, db, "en")!;
    expect(f.parts).toEqual([{ t: "inv", id: "01001" }, { t: "text", s: " took " }, { t: "amount", n: 1, icon: "resource" }]);
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
    const f = feedEntry(r.state.log.find((e) => e.type === "attack")!, r.state, db, "en")!;
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
      for (const p of f.parts) if (p.t === "text" || p.t === "strong") expect(p.s).not.toMatch(/\{\w+/);
      for (const p of f.parts) if (p.t === "amount") expect(p.n).not.toBe(0);
    }
  });

  it("every event type in bot playthroughs has a template (or is hidden), in English and Russian", () => {
    const seen = new Set<string>();
    for (const sc of ["the-gathering", "the-midnight-masks", "the-devourer-below"]) {
      let r = start(sc, ["01001", "01002", "01004"], 3);
      for (let k = 0; k < 1500 && r.state.pending; k++) {
        r = dispatch(db, r.state, { type: "choose", inv: r.state.pending.inv, option: botChoice(db, r) });
      }
      for (const e of r.state.log) {
        if (HIDDEN.has(e.type)) continue;
        seen.add(templateKey(e));
        for (const loc of ["en", "ru"]) expect(feedEntry(e, r.state, db, loc)?.parts.length, `${e.type} ${loc}`).toBeGreaterThan(0);
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
        for (const loc of ["en", "ru"]) expect(promptParts(p, r.state, db, loc), `${p.promptKey} ${loc}`).not.toBeNull();
        r = dispatch(db, r.state, { type: "choose", inv: p.inv, option: botChoice(db, r) });
      }
    }
    expect(keys.has("turn") && keys.has("commit")).toBe(true);
  });

  it("every English feed, phase and prompt template has a Russian one with the same placeholders", () => {
    const en = db.i18n.en.ui;
    const ru = db.i18n.ru.ui;
    for (const k of Object.keys(en).filter((k) => k.startsWith("feed.") || k.startsWith("phase.") || k.startsWith("prompt."))) {
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
