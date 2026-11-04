// Smoke and Mirrors: suspects dealt beneath locations, their codex entries and leads, the harbinger, the Servant of Flame
import {
  activeInvs,
  addCounter,
  allCards,
  card,
  cardIf,
  type CardScript,
  cardsBeneath,
  cardsIn,
  connections,
  currentAct,
  currentAgenda,
  def,
  discard,
  type EffCtx,
  emit,
  enemies,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  invName,
  invsAt,
  leadInvestigator,
  locationByName,
  locations,
  moveCard,
  pile,
  playerCount,
  putBeneath,
  randomInt,
  ready,
  setCardLocation,
  setController,
  setEngaged,
  setOwner,
  shuffleList,
  turnOrder,
  EVENT,
  ZONE,
  CHOICE,
  type ScriptRun,
  queue,
  checkObjectives,
  spawn,
  defeatEnemy,
  resolveEffects,
  drawCards,
  resolveEffect,
  discoverClues,
  resolveRevelation,
  defeatInvestigator,
  endScenario,
  advanceAct,
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

const underAct = (game: GameContext): readonly InstId[] => {
  const act = currentAct(game);
  return act ? cardsBeneath(game, act) : [];
};
const beneath = (game: GameContext, loc: InstId | null): InstId | undefined =>
  loc ? cardsBeneath(game, loc)[0] : undefined;
const elite = (game: GameContext, id: InstId) => def(game, id).traits.includes("Elite");
const eliteCount = (game: GameContext) =>
  cardsIn(game, ZONE.Victory).filter((c) => def(game, c.id).type === "enemy" && elite(game, c.id))
    .length + underAct(game).length;
const story = (game: GameContext, text: string) => {
  if (text) emit(game, EVENT.Codex, text);
};

/** a suspect interrogated: beneath the act, out of play */
function toAct(game: GameContext, id: InstId) {
  const act = currentAct(game);
  if (act) putBeneath(game, id, act);
  else moveCard(game, id, ZONE.SetAside);
  emit(game, EVENT.UnderAct, `${def(game, id).name} is placed beneath the act`, { card: id });
  queue(game, checkObjectives());
}

export default {
  conditions: {
    oneOrTwoPlayers: (game: GameContext) => playerCount(game) <= 2,
    twoOrMoreClues: (game: GameContext, ctx: EffCtx) => !!ctx.you && inv(game, ctx.you).clues >= 2,
    cardBeneathYou: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && !!beneath(game, inv(game, ctx.you).location),
  },
  fns: {
    setup(game: GameContext) {
      for (const c of allCards(game))
        if (c.code === "12137" && c.zone === "encounterDeck") moveCard(game, c.id, ZONE.SetAside);
      const people = allCards(game)
        .filter((c) => PEOPLE.includes(c.code) && c.zone === "encounterDeck")
        .map((c) => c.id);
      shuffleList(game, people);
      const [harbinger, ...rest] = people;
      moveCard(game, harbinger, ZONE.SetAside);
      flags.harbinger.set(game, harbinger);
      const servant = findByCode(game, SERVANT, [ZONE.EncounterDeck]);
      const suspects = [...rest, ...(servant ? [servant.id] : [])];
      shuffleList(game, suspects);
      UNDER.forEach((name, k) => {
        const loc = locationByName(game, name);
        if (!loc || !suspects[k]) return;
        putBeneath(game, suspects[k], loc.id);
      });
      if (currentAgenda(game)) addCounter(game, currentAgenda(game)!, "doom", playerCount(game));
      // Dr. Armitage comes with his bearer, and takes up no ally slot
      for (const i of turnOrder(game)) {
        const armitage = inv(game, i).deck.find((id) => card(game, id).code === "12115");
        if (!armitage) continue;
        moveCard(game, armitage, ZONE.Play);
        setController(game, armitage, i);
      }
    },
    drawBeneath(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      const id = beneath(game, loc);
      if (!id || !loc) return;
      moveCard(game, id, ZONE.Limbo);
      emit(game, EVENT.Encounter, `${invName(game, run.you)} draws ${def(game, id).name}`, {
        inv: run.you,
        card: id,
      });
      queue(game, spawn({ enemy: id, inv: run.you }));
    },
    /** a suspect's codex entry: its effect, then a lead on them; enough leads and they are interrogated */
    codex(game: GameContext, run: ScriptRun) {
      const id = run.source;
      const e = cardIf(game, id);
      if (e?.zone !== "enemy") return;
      const you = run.you;
      if (run.args === 3) {
        // Naomi O'Bannion: you may defeat a non-Humanoid enemy at any location
        const pool = enemies(game).filter((x) => !def(game, x.id).traits.includes("Humanoid"));
        if (pool.length) {
          const pick = run.choose<InstId | "none">(
            [
              ...pool.map((x) => ({
                id: x.id,
                label: def(game, x.id).name,
                card: x.id,
                value: x.id,
              })),
              { id: "none", label: "No", value: "none" },
            ],
            { text: "Naomi O'Bannion: defeat a non-Humanoid enemy?", key: "chooseEnemy" },
            { auto: false, who: you },
          );
          if (pick !== "none") queue(game, defeatEnemy({ enemy: pick, by: you }));
        }
      }
      if (run.args === 6) {
        // Margaret Liu: look at the top card of the encounter deck; you may discard it
        const top = pile(game, ZONE.EncounterDeck)[0];
        if (top) {
          const drop = run.choose<boolean>(
            [
              { id: "yes", label: `Discard ${def(game, top).name}`, value: true, card: top },
              { id: "no", label: "Leave it", value: false },
            ],
            {
              text: `Margaret Liu: the top card of the encounter deck is ${def(game, top).name}. Discard it?`,
              key: "chooseOne",
            },
            { auto: false, kind: CHOICE.Generic, who: you },
          );
          if (drop) discard(game, top);
        }
      }
      story(game, CODEX[String(run.args)][0]);
      if (run.args === 1 && e.location) {
        // David Renfield flees to a connecting location (with no investigators, if able)
        const near = connections(game, e.location);
        const empty = near.filter((l) => !invsAt(game, l).length);
        const to = (empty.length ? empty : near)[0];
        if (to) {
          setCardLocation(game, e.id, to);
          setEngaged(game, e.id, null);
        }
      }
      if (run.args === 2) {
        ready(game, e.id);
        queue(game, resolveEffects({ effects: [{ op: EVENT.Heal, horror: 1 }], ctx: { you } }));
      }
      if (run.args === 4)
        queue(game, resolveEffects({ effects: [{ op: EVENT.Heal, damage: 1 }], ctx: { you } }));
      if (run.args === 5) queue(game, drawCards({ inv: you, n: 1 }));
      addCounter(game, e.id, "resources", 1);
      emit(
        game,
        EVENT.Lead,
        `A lead on ${def(game, id).name} (${e.resources}/${playerCount(game)})`,
        {
          card: id,
        },
      );
      if (e.resources >= playerCount(game)) {
        story(game, CODEX[String(run.args)][1]);
        emit(game, EVENT.Interrogated, `${def(game, id).name} has been interrogated`, { card: id });
        toAct(game, id);
      }
    },
    earl(game: GameContext, run: ScriptRun) {
      const e = cardIf(game, run.source);
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "combat",
            difficulty: Math.max(0, 4 - (e?.damage ?? 0)),
            onSuccess: [{ op: "script", fn: "codex", args: 4 }],
          },
          ctx: run.ctx,
        }),
      );
    },
    abigail(game: GameContext, run: ScriptRun) {
      const loc = cardIf(game, run.source)?.location;
      queue(
        game,
        resolveEffect({
          effect: {
            op: "skillTest",
            skill: "intellect",
            difficulty: loc ? card(game, loc).clues : 0,
            onSuccess: [
              { op: "script", fn: "abigailClue" },
              { op: "script", fn: "codex", args: 5 },
            ],
          },
          ctx: run.ctx,
        }),
      );
    },
    abigailClue(game: GameContext, run: ScriptRun) {
      const loc = cardIf(game, run.source)?.location;
      if (loc) addCounter(game, loc, "clues", 1);
    },
    northside(game: GameContext, run: ScriptRun) {
      const pool = locations(game).filter(
        (l) => l.revealed && l.clues > 0 && def(game, l.id).traits.includes("Arkham"),
      );
      if (!pool.length) return;
      const pick = run.chooseCard(
        pool.map((l) => l.id),
        {
          text: "Northside: discover 1 clue at a revealed Arkham location",
          key: "chooseClueLocation",
        },
      );
      queue(game, discoverClues({ inv: run.you, location: pick, n: 1 }));
    },
    /** codex Φ: the Servant of Flame is defeated — kill them, or hold them for questioning */
    codexPhi(game: GameContext, run: ScriptRun) {
      const id = run.source;
      if (cardIf(game, id)?.zone !== "enemy") return;
      story(game, CODEX.phi[0]);
      const kill = run.choose<boolean>(
        [
          {
            id: "kill",
            label:
              "We can't risk letting them hurt others. They're too dangerous to be left alive.",
            value: true,
          },
          { id: "hold", label: "Hold them for questioning later tonight.", value: false },
        ],
        { text: "The Servant of Flame lies at your feet", key: "chooseOne" },
        { auto: false, kind: CHOICE.Generic, who: leadInvestigator(game) },
      );
      if (kill) {
        flags.killedServant.set(game, true);
        for (const i of activeInvs(game)) queue(game, drawCards({ inv: i, n: 3 }));
        return;
      }
      flags.servantBeneath.set(game, true);
      for (const i of activeInvs(game)) addCounter(game, i, "clues", 1);
      toAct(game, id);
    },
    /** Growing Flames: each investigator draws a set-aside Mark of Elokoss and becomes its bearer */
    growingFlames(game: GameContext) {
      const marks = allCards(game).filter((c) => c.code === "12137" && c.zone === "setAside");
      activeInvs(game).forEach((i, k) => {
        const m = marks[k];
        if (!m) return;
        setOwner(game, m.id, i);
        setController(game, m.id, i);
        moveCard(game, m.id, ZONE.Limbo);
        queue(game, resolveRevelation({ inv: i, card: m.id }));
      });
      flags.logEntry.set(game, ["hidden", "mark_of_elokoss"], true);
    },
    outtaTime(game: GameContext) {
      for (const i of activeInvs(game)) queue(game, defeatInvestigator({ inv: i, by: "resign" }));
    },
    backToVelmas(game: GameContext) {
      queue(game, endScenario({ id: "R1" }));
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      if (cardIf(game, currentAct(game))?.code === "12136" && eliteCount(game) >= 6)
        queue(game, advanceAct());
    },
    /** what the campaign log takes from this game (the guide asks the players; the game knows) */
    ended(game: GameContext, won: boolean) {
      const log = (id: string, section = "campaign_notes") => {
        flags.logEntry.set(game, [section, id], true);
      };
      const harbinger = flags.harbinger.get(game);
      if (harbinger) log(`${NAMES[card(game, harbinger).code]}_harbinger`);
      if (won) log("discovered_the_cults_whereabouts");
      else {
        // the Elite enemies in play or beneath a location, with the harbinger: one drawn at random
        const pool = [
          ...cardsIn(game, ZONE.Enemy)
            .filter((c) => elite(game, c.id))
            .map((c) => c.id),
          ...locations(game)
            .map((l) => beneath(game, l.id))
            .filter((x): x is InstId => !!x),
          ...(harbinger ? [harbinger] : []),
        ];
        const drawn = pool[randomInt(game, pool.length)];
        log(drawn === harbinger ? "discovered_the_cults_whereabouts" : "failed_in_their_search");
      }
      if (flags.killedServant.get(game)) log("killed_the_servant_of_flame");
      if (flags.servantBeneath.get(game)) log("servant_of_flame_beneath_act", "hidden");
      if (won && underAct(game).filter((id) => elite(game, id)).length >= 6)
        log("scoured_arkham_for_answers");
      if (
        won &&
        cardsIn(game, ZONE.Victory).filter(
          (c) => def(game, c.id).type === "enemy" && elite(game, c.id),
        ).length >= 6
      )
        log("stirred_up_trouble");
      // 1 bonus experience for each enemy beneath the act
      for (const i of turnOrder(game)) flags.xp.add(game, i, underAct(game).length);
    },
  },
} satisfies CardScript;
