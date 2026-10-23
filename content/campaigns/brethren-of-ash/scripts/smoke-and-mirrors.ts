// Smoke and Mirrors: suspects dealt beneath locations, their codex entries and leads, the harbinger, the Servant of Flame
import {
  activeInvs,
  ask,
  card,
  cardsIn,
  connections,
  def,
  discard,
  emit,
  enemies,
  findByCode,
  inv,
  invName,
  invsAt,
  locationByName,
  locations,
  moveCard,
  playerCount,
  push,
  randInt,
  shuffle,
  type CardScript,
  type EffCtx,
  type G,
  type InstId,
  type Step,
} from "../../../../src/engine/api";

const SERVANT = "12138";
const PEOPLE = ["12139", "12140", "12141", "12142", "12143", "12144"];
const NAMES: Record<string, string> = {
  "12139": "david",
  "12140": "cornelia",
  "12141": "naomi",
  "12142": "earl",
  "12143": "abigail",
  "12144": "margaret",
};
const UNDER: string[] = [
  "Northside",
  "Downtown",
  "Southside",
  "French Hill",
  "Uptown",
  "Waterfront District",
];

const CODEX: Record<string, [string, string]> = {
  "1": [
    'The haughty Mr. Renfield tries to brush you off politely, but when you mention the "Brethren of Ash," he flees down a nearby street. Although you give chase, the eschatologist is surprisingly fleet-footed.',
    'Eventually, you find Mr. Renfield hiding in a cluttered bookshop. After you explain yourself and your intentions further, he acquiesces to your questioning.\n"I only attended the meeting out of an academic curiosity," the eschatologist says. "While much of what they said was utter drivel, I did glean some insights. It seems the Brethren of Ash worship an ancient devil named ‘Elokoss’: a being of fire and destruction, said to be responsible for the great fire of Alexandria. Or so they claim. As if that were something to take pride in," he scoffs. "When you mentioned the Brethren, I—I worried you were one of them. They are an army of thralls, all united under their queen!"',
  ],
  "2": [
    'You find Ms. Akely working the late shift at a run-down garage. She seems friendly enough as she offers you a cigarette, but the moment you mention the "Brethren of Ash," her expression hardens, and she points you to the door.',
    "Eventually, your words get through to the grumpy foreman. She apologizes and invites you to sit down. \"I went because a couple of my friends at the NHI factory talked them up. Apparently those ‘Brethren of Ash' are preaching something about a 'glorious rebirth' for all of their followers. I tuned out the rest of it. I don't really go for that kind of flim flam anyway,\" Cornelia says.\nWhen you ask about her friends, she shakes her head. \"All three of ‘em haven't shown up to work for the past few weeks.\"",
  ],
  "3": [
    "The O'Bannion's kingpin is hardly interested in your questions, though she is more than willing to off anything that's giving you trouble... for a price. You'll need to grease a few more palms if you plan to get any information out of her.",
    "Naomi tosses her head back in a full-throated laugh when you mention the Brethren of Ash. \"Those kooks? I don't know them. But two of my guys found a pair of them sniffing around one of our gin joints. There was something real strange about 'em, like they weren't all there. And it wasn't 'cause of the giggle water, I'll tell you,\" she takes a long drag of her clove cigarette. You ask where they were found, and she blows a thick cloud of smoke in your face. \"Like hell am I gonna tell you about my business. Now get lost.\"",
  ],
  "4": [
    'At the mention of the "Brethren of Ash," the police officer brandishes his nightstick and tells you that you\'d best stick your nose somewhere else. You brace yourself for a fight.',
    'Eventually, Monroe relents. "Alright, alright," the officer spits some blood as he nurses a bruised cheek.\n"There were a few of them who came to me after we logged the third disappearance. They insisted the folks who disappeared did so willingly. When I said I still wasn\'t convinced, they took me to one of their meetings out near the docks. There was something real screwy about the whole affair. Something wrong with their eyes, like they were hypnotized or something." The officer looks away in regret. "They paid me to keep quiet. I\'m not proud of it. Don’t tell anyone about this—I, I promise I\'ll keep to the straight and narrow from now on."',
  ],
  "5": [
    "The junior librarian waves your questions away as she pulls several more tomes off the shelf. The only way to pull her away from her work might be to help her find whatever she is looking for.",
    'Abigail slumps back in a lavish armchair with a sigh. "Yes, I\'ve been looking for any information on the ‘Brethren of Ash\' since my roommate went missing last week. Thankfully, I found this," she opens up a thin volume with a delicate inlay of a birch tree with flowering eyes on the cover. Inside are many disturbing drawings of violent sacrifice, victims burned alive, and strange inhuman symbols arrayed in odd patterns.\n"Rather macabre, don\'t you think?" says Abigail. "It appears to be written in Akkadian. Unfortunately, it will take weeks to translate with the entire ancient languages department away on an expedition. Egypt, this time. I\'m sorry I couldn\'t be more help," she says, pressing her hand to the book cover.',
  ],
  "6": [
    "Margaret Liu, one of the most well-known lounge singers in town, is fully engrossed in her performance. You may have to get creative to catch her attention.",
    'Your attempts to get Ms. Liu\'s attention are more than effective, and soon you find yourself backstage with her undivided attention. "I must say I was very impressed at your little, erm, performance," she says. "But why are you really here?" The lounge singer\'s carefree smile vanishes at the mention of the "Brethren of Ash."\n"I don\'t know who they are and I don\'t care to," she says. "I was headed home a week ago when I was accosted by two men in—and I must emphasize this—the ugliest robes you\'ll ever see. They had the strangest symbol on the hood," she says, then scribbles a crude sigil on a napkin. It resembles a hand with an inset eye. You ask her what happened next, and she nods to the bruiser at the door.\n"Antonio scared them off. I haven\'t seen them since."',
  ],
  phi: [
    "Your nemesis lies incapacitated at your feet. The flame that cloaked them has died out, though their robes are miraculously un-singed. Any attempts to remove their mask are fruitless; you will need to wait for them to regain consciousness if you want to discover who they are. You wonder how many victims their blood-spattered sickle has claimed. Perhaps it would be better to finish them off here and now, to avoid future bloodshed. No one else has to know.",
    "",
  ],
};

const underAct = (g: G): InstId[] => (g.s.flags.underAct as InstId[] | undefined) ?? [];
const beneath = (g: G, loc: InstId | null) =>
  loc ? (g.s.flags[`beneath:${loc}`] as InstId | undefined) : undefined;
const elite = (g: G, id: InstId) => def(g, id).traits.includes("Elite");
const eliteCount = (g: G) =>
  cardsIn(g, "victory").filter((c) => def(g, c.id).type === "enemy" && elite(g, c.id)).length +
  underAct(g).length;
const story = (g: G, text: string) => {
  if (text) emit(g, "codex", text);
};

/** a suspect interrogated: beneath the act, out of play */
function toAct(g: G, id: InstId) {
  moveCard(g, id, "setAside");
  g.s.flags.underAct = [...underAct(g), id];
  emit(g, "underAct", `${def(g, id).name} is placed beneath the act`, { card: id });
  push(g, { t: "CheckObjectives" });
}

export default {
  conditions: {
    oneOrTwoPlayers: (g: G) => playerCount(g) <= 2,
    twoOrMoreClues: (g: G, ctx: EffCtx) => !!ctx.you && inv(g, ctx.you).clues >= 2,
    cardBeneathYou: (g: G, ctx: EffCtx) => !!ctx.you && !!beneath(g, inv(g, ctx.you).location),
  },
  fns: {
    setup(g: G) {
      for (const c of Object.values(g.s.cards))
        if (c.code === "12137" && c.zone === "encounterDeck") moveCard(g, c.id, "setAside");
      const people = Object.values(g.s.cards)
        .filter((c) => PEOPLE.includes(c.code) && c.zone === "encounterDeck")
        .map((c) => c.id);
      shuffle(g.s, people);
      const [harbinger, ...rest] = people;
      moveCard(g, harbinger, "setAside");
      g.s.flags.harbinger = harbinger;
      const servant = findByCode(g, SERVANT, ["encounterDeck"]);
      const suspects = [...rest, ...(servant ? [servant.id] : [])];
      shuffle(g.s, suspects);
      UNDER.forEach((name, k) => {
        const loc = locationByName(g, name);
        if (!loc || !suspects[k]) return;
        moveCard(g, suspects[k], "setAside");
        g.s.flags[`beneath:${loc.id}`] = suspects[k];
      });
      if (g.s.agenda) card(g, g.s.agenda).doom += playerCount(g);
      // Dr. Armitage comes with his bearer, and takes up no ally slot
      for (const i of g.s.order) {
        const armitage = inv(g, i).deck.find((id) => card(g, id).code === "12115");
        if (!armitage) continue;
        moveCard(g, armitage, "play");
        card(g, armitage).controller = i;
      }
    },
    drawBeneath(g: G, ctx: EffCtx) {
      const loc = inv(g, ctx.you!).location;
      const id = beneath(g, loc);
      if (!id || !loc) return;
      delete g.s.flags[`beneath:${loc}`];
      moveCard(g, id, "limbo");
      emit(g, "encounter", `${invName(g, ctx.you!)} draws ${def(g, id).name}`, {
        inv: ctx.you!,
        card: id,
      });
      push(g, { t: "Spawn", enemy: id, inv: ctx.you! });
    },
    /** a suspect's codex entry: its effect, then a lead on them; enough leads and they are interrogated */
    codex(g: G, ctx: EffCtx, n: number, step?: Step) {
      const id = ctx.source!;
      const e = g.s.cards[id];
      if (e?.zone !== "enemy") return;
      const you = ctx.you!;
      if (n === 3) {
        // Naomi O'Bannion: you may defeat a non-Humanoid enemy at any location
        const pool = enemies(g).filter((x) => !def(g, x.id).traits.includes("Humanoid"));
        if (pool.length) {
          const pick = ask<InstId | "none">(
            g,
            step!,
            you,
            "target",
            "Naomi O'Bannion: defeat a non-Humanoid enemy?",
            [
              ...pool.map((x) => ({ id: x.id, label: def(g, x.id).name, card: x.id, value: x.id })),
              { id: "none", label: "No", value: "none" },
            ],
            { key: "chooseEnemy" },
          );
          if (pick === undefined) return;
          if (pick !== "none") push(g, { t: "DefeatEnemy", enemy: pick, by: you });
        }
      }
      if (n === 6) {
        // Margaret Liu: look at the top card of the encounter deck; you may discard it
        const top = g.s.encounterDeck[0];
        if (top) {
          const drop = ask<boolean>(
            g,
            step!,
            you,
            "generic",
            `Margaret Liu: the top card of the encounter deck is ${def(g, top).name}. Discard it?`,
            [
              { id: "yes", label: `Discard ${def(g, top).name}`, value: true, card: top },
              { id: "no", label: "Leave it", value: false },
            ],
            { key: "chooseOne" },
          );
          if (drop === undefined) return;
          if (drop) discard(g, top);
        }
      }
      story(g, CODEX[String(n)][0]);
      if (n === 1 && e.location) {
        // David Renfield flees to a connecting location (with no investigators, if able)
        const near = connections(g, e.location);
        const empty = near.filter((l) => !invsAt(g, l).length);
        const to = (empty.length ? empty : near)[0];
        if (to) {
          e.location = to;
          e.engagedWith = null;
        }
      }
      if (n === 2) {
        e.exhausted = false;
        push(g, { t: "Effects", effects: [{ op: "heal", horror: 1 }], ctx: { you } });
      }
      if (n === 4) push(g, { t: "Effects", effects: [{ op: "heal", damage: 1 }], ctx: { you } });
      if (n === 5) push(g, { t: "Draw", inv: you, n: 1 });
      e.resources++;
      emit(g, "lead", `A lead on ${def(g, id).name} (${e.resources}/${playerCount(g)})`, {
        card: id,
      });
      if (e.resources >= playerCount(g)) {
        story(g, CODEX[String(n)][1]);
        emit(g, "interrogated", `${def(g, id).name} has been interrogated`, { card: id });
        toAct(g, id);
      }
    },
    earl(g: G, ctx: EffCtx) {
      const e = g.s.cards[ctx.source!];
      push(g, {
        t: "Eff",
        effect: {
          op: "skillTest",
          skill: "combat",
          difficulty: Math.max(0, 4 - (e?.damage ?? 0)),
          onSuccess: [{ op: "script", fn: "codex", args: 4 }],
        },
        ctx,
      });
    },
    abigail(g: G, ctx: EffCtx) {
      const loc = g.s.cards[ctx.source!]?.location;
      push(g, {
        t: "Eff",
        effect: {
          op: "skillTest",
          skill: "intellect",
          difficulty: loc ? card(g, loc).clues : 0,
          onSuccess: [
            { op: "script", fn: "abigailClue" },
            { op: "script", fn: "codex", args: 5 },
          ],
        },
        ctx,
      });
    },
    abigailClue(g: G, ctx: EffCtx) {
      const loc = g.s.cards[ctx.source!]?.location;
      if (loc) card(g, loc).clues++;
    },
    northside(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const pool = locations(g).filter(
        (l) => l.revealed && l.clues > 0 && def(g, l.id).traits.includes("Arkham"),
      );
      if (!pool.length) return;
      const pick = ask<InstId>(
        g,
        step!,
        ctx.you!,
        "target",
        "Northside: discover 1 clue at a revealed Arkham location",
        pool.map((l) => ({ id: l.id, label: def(g, l.id).name, card: l.id, value: l.id })),
        { auto: true, key: "chooseClueLocation" },
      );
      if (pick !== undefined) push(g, { t: "DiscoverClues", inv: ctx.you!, location: pick, n: 1 });
    },
    /** codex Φ: the Servant of Flame is defeated — kill them, or hold them for questioning */
    codexPhi(g: G, ctx: EffCtx, _args: unknown, step?: Step) {
      const id = ctx.source!;
      if (g.s.cards[id]?.zone !== "enemy") return;
      story(g, CODEX.phi[0]);
      const kill = ask<boolean>(
        g,
        step!,
        g.s.lead,
        "generic",
        "The Servant of Flame lies at your feet",
        [
          {
            id: "kill",
            label:
              "We can't risk letting them hurt others. They're too dangerous to be left alive.",
            value: true,
          },
          { id: "hold", label: "Hold them for questioning later tonight.", value: false },
        ],
        { key: "chooseOne" },
      );
      if (kill === undefined) return;
      if (kill) {
        g.s.flags.killedServant = true;
        for (const i of activeInvs(g)) push(g, { t: "Draw", inv: i, n: 3 });
        return;
      }
      g.s.flags.servantBeneath = true;
      for (const i of activeInvs(g)) inv(g, i).clues++;
      toAct(g, id);
    },
    /** Growing Flames: each investigator draws a set-aside Mark of Elokoss and becomes its bearer */
    growingFlames(g: G) {
      const marks = Object.values(g.s.cards).filter(
        (c) => c.code === "12137" && c.zone === "setAside",
      );
      activeInvs(g).forEach((i, k) => {
        const m = marks[k];
        if (!m) return;
        m.owner = i;
        m.controller = i;
        moveCard(g, m.id, "limbo");
        push(g, { t: "Revelation", inv: i, card: m.id });
      });
      g.s.flags["log:hidden:mark_of_elokoss"] = true;
    },
    outtaTime(g: G) {
      for (const i of activeInvs(g)) push(g, { t: "Defeated", inv: i, by: "resign" });
    },
    backToVelmas(g: G) {
      push(g, { t: "Resolution", id: "R1" });
    },
  },
  hooks: {
    checkObjectives(g: G) {
      if (g.s.act && card(g, g.s.act).code === "12136" && eliteCount(g) >= 6)
        push(g, { t: "AdvanceAct" });
    },
    /** what the campaign log takes from this game (the guide asks the players; the game knows) */
    ended(g: G, ctx: EffCtx) {
      const log = (id: string, section = "campaign_notes") => {
        g.s.flags[`log:${section}:${id}`] = true;
      };
      const harbinger = g.s.flags.harbinger as InstId | undefined;
      if (harbinger) log(`${NAMES[g.s.cards[harbinger].code]}_harbinger`);
      if (ctx.x) log("discovered_the_cults_whereabouts");
      else {
        // the Elite enemies in play or beneath a location, with the harbinger: one drawn at random
        const pool = [
          ...cardsIn(g, "enemy")
            .filter((c) => elite(g, c.id))
            .map((c) => c.id),
          ...locations(g)
            .map((l) => beneath(g, l.id))
            .filter((x): x is InstId => !!x),
          ...(harbinger ? [harbinger] : []),
        ];
        const drawn = pool[randInt(g.s, pool.length)];
        log(drawn === harbinger ? "discovered_the_cults_whereabouts" : "failed_in_their_search");
      }
      if (g.s.flags.killedServant) log("killed_the_servant_of_flame");
      if (g.s.flags.servantBeneath) log("servant_of_flame_beneath_act", "hidden");
      if (ctx.x && underAct(g).filter((id) => elite(g, id)).length >= 6)
        log("scoured_arkham_for_answers");
      if (
        ctx.x &&
        cardsIn(g, "victory").filter((c) => def(g, c.id).type === "enemy" && elite(g, c.id))
          .length >= 6
      )
        log("stirred_up_trouble");
      // 1 bonus experience for each enemy beneath the act
      for (const i of g.s.order) {
        const k = `xp:${i}`;
        g.s.flags[k] = ((g.s.flags[k] as number | undefined) ?? 0) + underAct(g).length;
      }
    },
  },
} satisfies CardScript;
