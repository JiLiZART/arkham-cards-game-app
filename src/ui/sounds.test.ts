import { describe, expect, it } from "vitest";
import { db, skipMulligans, start } from "../engine/testkit";
import type { GameEvent, GameState } from "../engine/types";
import { effectFor, gainOf, MOMENT_GAP, mayPlay, MOMENTS, momentClip, musicFor } from "./sounds";

const R = "01001";
const fresh = skipMulligans(start("the-gathering", [R], 1)).state;
const m = db.sounds;
const ev = (type: string, data: Record<string, unknown> = {}, card: string | null = null): GameEvent => ({ type, text: type, inv: R, card, data });
const codeOf = (code: string) => Object.values(fresh.cards).find((c) => c.code === code)!.id;
const with_ = (patch: (s: GameState) => void): GameState => {
  const s = structuredClone(fresh);
  patch(s);
  return s;
};

describe("effectFor", () => {
  it("maps an animated event to its clip", () => {
    expect(effectFor(ev("attack"), fresh, m)).toEqual(["strike"]);
    expect(effectFor(ev("token"), fresh, m)).toEqual(["rattle", "clink"]);
  });

  it("picks the variant: a failed test, horror without damage, both when both", () => {
    expect(effectFor(ev("testResult", { success: true }), fresh, m)).toEqual(["chime"]);
    expect(effectFor(ev("testResult", { success: false }), fresh, m)).toEqual(["thud"]);
    expect(effectFor(ev("damage", { damage: 0, horror: 1 }), fresh, m)).toEqual(["breath"]);
    expect(effectFor(ev("damage", { damage: 1, horror: 1 }), fresh, m)).toEqual(["hit", "breath"]);
  });

  it("a spawning enemy growls by its traits (Ghoul before Monster, in the manifest's order)", () => {
    expect(effectFor(ev("spawn", {}, codeOf("01160")), fresh, m)).toEqual(["growl-ghoul"]); // Ghoul Minion: Humanoid, Monster, Ghoul
    expect(effectFor(ev("spawn", {}, codeOf("01159")), fresh, m)).toEqual(["growl"]); // Swarm of Rats: Creature, no entry
  });

  it("nothing for an event without a sound", () => {
    expect(effectFor(ev("resource"), fresh, m)).toBeNull();
  });
});

describe("momentClip", () => {
  it("a UI moment's generic clip", () => {
    expect(momentClip("draw", null, fresh, m)).toBe("slide");
    expect(momentClip("nope", null, fresh, m)).toBeNull();
  });

  it("a moment set to none is silent", () => {
    expect(momentClip("draw", null, fresh, { ...m, moments: { ...m.moments, draw: "none" } })).toBeNull();
  });

  it("a card's own clip: code first, then the first matching trait, then the generic one", () => {
    expect(momentClip("fight", codeOf("01016"), fresh, m)).toBe("gunshot-45"); // the .45 override
    expect(momentClip("play", codeOf("01016"), fresh, m)).toBe("gun-ready"); // Firearm by trait
    expect(momentClip("fight", codeOf("01020"), fresh, m)).toBe("blade"); // Machete: Melee
    expect(momentClip("play", codeOf("01159"), fresh, m)).toBe("snap"); // no trait match: generic
    expect(momentClip("fight", codeOf("01159"), fresh, m)).toBeNull(); // no generic fight sound
  });
});

describe("musicFor", () => {
  it("the scenario's bed while nothing is engaged", () => {
    expect(musicFor(fresh, m)).toBe("bed:the-gathering");
  });

  it("a scenario without a bed of its own (a generated one) plays the default bed, and fight and tension as usual", () => {
    const generated = with_((s) => (s.scenarioId = "extracurricular-activity"));
    expect(musicFor(generated, m)).toBe("bed:default");
    const ghoul = codeOf("01160");
    expect(musicFor(with_((s) => {
      s.scenarioId = "extracurricular-activity";
      s.cards[ghoul] = { ...s.cards[ghoul], zone: "enemy", location: s.invs[R].location, engagedWith: R };
    }), m)).toBe("fight");
  });

  it("fight while an enemy is engaged, the bed again once it is gone", () => {
    const ghoul = codeOf("01160");
    const engaged = with_((s) => (s.cards[ghoul] = { ...s.cards[ghoul], zone: "enemy", location: s.invs[R].location, engagedWith: R }));
    expect(musicFor(engaged, m)).toBe("fight");
    const gone = with_((s) => (s.cards[ghoul] = { ...s.cards[ghoul], zone: "discard", engagedWith: null }));
    expect(musicFor(gone, m)).toBe("bed:the-gathering");
  });

  it("tension in the enemy phase and when the agenda is one doom from advancing; fight wins over tension", () => {
    expect(musicFor(with_((s) => (s.phase = "enemy")), m)).toBe("tension");
    const threshold = db.cards[fresh.cards[fresh.agenda!].code].doom!;
    const almost = with_((s) => (s.cards[s.agenda!].doom = threshold - 1));
    expect(musicFor(almost, m)).toBe("tension");
    const ghoul = codeOf("01160");
    const both = with_((s) => {
      s.phase = "enemy";
      s.cards[ghoul] = { ...s.cards[ghoul], zone: "enemy", location: s.invs[R].location, engagedWith: R };
    });
    expect(musicFor(both, m)).toBe("fight");
  });

  it("silent once the scenario has ended, and for a scenario with no bed when there is no default bed either", () => {
    expect(musicFor(with_((s) => (s.phase = "ended")), m)).toBeNull();
    const music = Object.fromEntries(Object.entries(m.music).filter(([k]) => k !== "bed:default"));
    expect(musicFor(with_((s) => (s.scenarioId = "nowhere")), { ...m, music })).toBeNull();
  });
});

describe("gainOf", () => {
  it("scales the clip's gain by the slider, silent when muted or at zero", () => {
    expect(gainOf({ sfxVolume: 80, musicVolume: 50, muted: false }, "effects", 0.5)).toBeCloseTo(0.4);
    expect(gainOf({ sfxVolume: 80, musicVolume: 50, muted: false }, "music", 1)).toBeCloseTo(0.5);
    expect(gainOf({ sfxVolume: 80, musicVolume: 50, muted: true }, "effects", 1)).toBe(0);
    expect(gainOf({ sfxVolume: 0, musicVolume: 50, muted: false }, "effects", 1)).toBe(0);
  });
});

describe("mayPlay", () => {
  it("lets a moment sound once per burst and again after the gap, per name", () => {
    const last = new Map<string, number>();
    expect(mayPlay(last, "discard", 1000)).toBe(true);
    expect(mayPlay(last, "discard", 1000 + MOMENT_GAP - 1)).toBe(false);
    expect(mayPlay(last, "heal", 1010)).toBe(true);
    expect(mayPlay(last, "discard", 1000 + MOMENT_GAP)).toBe(true);
  });
});

describe("moments", () => {
  it("are all in the manifest, each a clip or none, and sound without a game (menus)", () => {
    for (const name of MOMENTS) expect(name in m.moments, name).toBe(true);
    expect(momentClip("button", null, null, m)).toBe("click");
  });
});
