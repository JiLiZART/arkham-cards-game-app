import { describe, expect, it } from "vitest";
import { db, skipMulligans, start } from "../../engine/kits/testkit";
import type { GameEvent, GameState } from "../../engine/world/types";
import {
  effectFor,
  gainOf,
  MOMENT_GAP,
  mayPlay,
  menuMusic,
  MOMENTS,
  momentClip,
  musicFor,
} from "./sounds";
import {
  allCardRecsIn,
  cardDataIn,
  cardRecIn,
  invStateIn,
  putCardIn,
} from "../../engine/world/store";
import type { EventType } from "../../engine/events/event";
import { EVENT } from "../../engine/events/event";
import { ZONE, PHASE } from "../../engine/world/constants";

const R = "01001";
const fresh = skipMulligans(start("the-gathering", [R], 1)).state;
const m = db.sounds;
const ev = (
  type: EventType,
  data: Record<string, unknown> = {},
  card: string | null = null,
): GameEvent => ({ type, text: type, inv: R, card, data });
const codeOf = (code: string) => allCardRecsIn(fresh).find((c) => c.code === code)!.id;
const with_ = (patch: (s: GameState) => void): GameState => {
  const s = structuredClone(fresh);
  patch(s);
  return s;
};

describe("effectFor", () => {
  it("maps an animated event to its clip", () => {
    expect(effectFor(ev(EVENT.Attack), fresh, m)).toEqual([m.events.attack]);
    expect(effectFor(ev(EVENT.Token), fresh, m)).toEqual(m.events.token); // two layers
  });

  it("picks the variant: a failed test, horror without damage, both when both", () => {
    expect(effectFor(ev(EVENT.TestResult, { success: true }), fresh, m)).toEqual([
      m.events.testResult,
    ]);
    expect(effectFor(ev(EVENT.TestResult, { success: false }), fresh, m)).toEqual([
      m.events["testResult:fail"],
    ]);
    expect(effectFor(ev(EVENT.Damage, { damage: 0, horror: 1 }), fresh, m)).toEqual([
      m.events["damage:horror"],
    ]);
    expect(effectFor(ev(EVENT.Damage, { damage: 1, horror: 1 }), fresh, m)).toEqual([
      m.events.damage,
      m.events["damage:horror"],
    ]);
  });

  it("a spawning enemy growls by its traits (Ghoul before Monster, in the manifest's order)", () => {
    expect(effectFor(ev(EVENT.Spawn, {}, codeOf("01160")), fresh, m)).toEqual([
      m.traits.spawn?.Ghoul,
    ]); // Ghoul Minion: Humanoid, Monster, Ghoul
    expect(effectFor(ev(EVENT.Spawn, {}, codeOf("01159")), fresh, m)).toEqual([m.events.spawn]); // Swarm of Rats: Creature, no entry
  });

  it("nothing for an event without a sound", () => {
    expect(effectFor(ev(EVENT.Resource), fresh, m)).toBeNull();
  });
});

describe("momentClip", () => {
  it("a UI moment's generic clip", () => {
    expect(momentClip("draw", null, fresh, m)).toBe(m.moments.draw);
    expect(momentClip("nope", null, fresh, m)).toBeNull();
  });

  it("a moment set to none is silent", () => {
    expect(
      momentClip("draw", null, fresh, { ...m, moments: { ...m.moments, draw: "none" } }),
    ).toBeNull();
  });

  it("a card's own clip: code first, then the first matching trait, then the generic one", () => {
    expect(momentClip("fight", codeOf("01016"), fresh, m)).toBe(m.cards["01016"]?.fight); // the .45 override
    expect(momentClip("play", codeOf("01016"), fresh, m)).toBe(m.traits.play?.Firearm); // Firearm by trait
    expect(momentClip("fight", codeOf("01020"), fresh, m)).toBe(m.traits.fight?.Melee); // Machete: Melee
    expect(momentClip("play", codeOf("01159"), fresh, m)).toBe(m.moments.play); // no trait match: generic
    expect(momentClip("fight", codeOf("01159"), fresh, m)).toBeNull(); // no generic fight sound
  });
});

describe("musicFor", () => {
  // the shared roles only: the chapter tracks and alternate takes have tests of their own
  const m = {
    ...db.sounds,
    music: Object.fromEntries(
      Object.entries(db.sounds.music).filter(
        ([k]) => !k.startsWith("card:") && !k.startsWith("tension:") && !k.endsWith(":alt"),
      ),
    ),
  };
  const track = db.sounds.music["bed:default"];
  // the shipped tension track is silent: an audible stand-in keeps the rule under test
  m.music.tension = track;
  const scored = (...ids: string[]) => ({
    ...m,
    music: { ...m.music, ...Object.fromEntries(ids.map((id) => [id, track])) },
  });

  it("the current agenda's track, else the current act's, else the bed", () => {
    const actCode = cardRecIn(fresh, fresh.acts.a!).code;
    const agendaCode = cardRecIn(fresh, fresh.agendas.a!).code;
    expect(musicFor(fresh, scored(`card:${actCode}`))).toBe(`card:${actCode}`);
    expect(musicFor(fresh, scored(`card:${actCode}`, `card:${agendaCode}`))).toBe(
      `card:${agendaCode}`,
    );
    expect(musicFor(fresh, scored("card:01109"))).toBe("bed:the-gathering");
  });

  it("the shipped manifest: the shared tension is silent, so the enemy phase keeps the chapter's track", () => {
    const enemyPhase = with_((s) => (s.phase = PHASE.Enemy));
    expect(musicFor(enemyPhase, db.sounds)).toMatch(/^card:01108(:alt)?$/);
  });

  it("a silent track is never chosen: the enemy phase keeps the chapter's track", () => {
    const enemyPhase = with_((s) => (s.phase = PHASE.Enemy));
    const silent = { ...m, music: { ...m.music, tension: { ...track, silent: true } } };
    expect(musicFor(enemyPhase, silent)).toBe("bed:the-gathering");
  });

  it("the scenario's own tension track before the shared one", () => {
    const enemyPhase = with_((s) => (s.phase = PHASE.Enemy));
    expect(musicFor(enemyPhase, scored("tension:the-gathering"))).toBe("tension:the-gathering");
    expect(musicFor(enemyPhase, scored("tension:the-midnight-masks"))).toBe("tension");
  });

  it("one take of each track per game, the same for the same seed, either take across seeds", () => {
    const both = scored("bed:the-gathering:alt");
    const takes = Array.from({ length: 20 }, (_, seed) =>
      musicFor(
        with_((s) => (s.seed = seed)),
        both,
      ),
    );
    expect(new Set(takes)).toEqual(new Set(["bed:the-gathering", "bed:the-gathering:alt"]));
    expect(
      musicFor(
        with_((s) => (s.seed = 7)),
        both,
      ),
    ).toBe(takes[7]);
  });

  it("the scenario's bed while nothing is engaged", () => {
    expect(musicFor(fresh, m)).toBe("bed:the-gathering");
  });

  it("a scenario without a bed of its own (a generated one) plays the default bed, and fight and tension as usual", () => {
    const generated = with_((s) => (s.scenarioId = "extracurricular-activity"));
    expect(musicFor(generated, m)).toBe("bed:default");
    const ghoul = codeOf("01160");
    expect(
      musicFor(
        with_((s) => {
          s.scenarioId = "extracurricular-activity";
          putCardIn(s, {
            ...cardDataIn(s, ghoul),
            zone: ZONE.Enemy,
            location: invStateIn(s, R).location,
            engagedWith: R,
          });
        }),
        m,
      ),
    ).toBe("fight");
  });

  it("fight while an enemy is engaged, the bed again once it is gone", () => {
    const ghoul = codeOf("01160");
    const engaged = with_((s) =>
      putCardIn(s, {
        ...cardDataIn(s, ghoul),
        zone: ZONE.Enemy,
        location: invStateIn(s, R).location,
        engagedWith: R,
      }),
    );
    expect(musicFor(engaged, m)).toBe("fight");
    const gone = with_((s) =>
      putCardIn(s, {
        ...cardDataIn(s, ghoul),
        zone: ZONE.Discard,
        engagedWith: null,
      }),
    );
    expect(musicFor(gone, m)).toBe("bed:the-gathering");
  });

  it("tension in the enemy phase and when the agenda is one doom from advancing; fight wins over tension", () => {
    expect(
      musicFor(
        with_((s) => (s.phase = PHASE.Enemy)),
        m,
      ),
    ).toBe("tension");
    const threshold = db.cards[cardRecIn(fresh, fresh.agendas.a!).code].doom!;
    const almost = with_((s) => (cardRecIn(s, s.agendas.a!).doom = threshold - 1));
    expect(musicFor(almost, m)).toBe("tension");
    const ghoul = codeOf("01160");
    const both = with_((s) => {
      s.phase = PHASE.Enemy;
      putCardIn(s, {
        ...cardDataIn(s, ghoul),
        zone: ZONE.Enemy,
        location: invStateIn(s, R).location,
        engagedWith: R,
      });
    });
    expect(musicFor(both, m)).toBe("fight");
  });

  it("silent once the scenario has ended, and for a scenario with no bed when there is no default bed either", () => {
    expect(
      musicFor(
        with_((s) => (s.phase = PHASE.Ended)),
        m,
      ),
    ).toBeNull();
    const music = Object.fromEntries(Object.entries(m.music).filter(([k]) => k !== "bed:default"));
    expect(
      musicFor(
        with_((s) => (s.scenarioId = "nowhere")),
        { ...m, music },
      ),
    ).toBeNull();
  });
});

describe("menuMusic", () => {
  it("the menu theme or its alternate by the coin, null without a menu theme", () => {
    const track = db.sounds.music["bed:default"];
    const music = { menu: track, "menu:alt": track };
    expect(menuMusic({ ...db.sounds, music }, 0.2)).toBe("menu");
    expect(menuMusic({ ...db.sounds, music }, 0.7)).toBe("menu:alt");
    expect(menuMusic({ ...db.sounds, music: { menu: track } }, 0.7)).toBe("menu");
    expect(menuMusic({ ...db.sounds, music: {} }, 0.2)).toBeNull();
  });
});

describe("gainOf", () => {
  it("scales the clip's gain by the slider, silent when muted or at zero", () => {
    expect(gainOf({ sfxVolume: 80, musicVolume: 50, muted: false }, "effects", 0.5)).toBeCloseTo(
      0.4,
    );
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
    expect(momentClip("button", null, null, m)).toBe(m.moments.button);
  });
});
