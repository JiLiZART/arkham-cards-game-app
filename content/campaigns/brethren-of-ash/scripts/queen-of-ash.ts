// Queen of Ash: the sewers and the cistern, Elokoss's two sides, the harbinger's codex, the sluice gate
import {
  activeInvs,
  addChaosTokens,
  addCounter,
  allCards,
  campaignLogOf,
  card,
  cardIf,
  type CardScript,
  cardsIn,
  currentAct,
  currentTest,
  def,
  difficultyOf,
  discard,
  type EffCtx,
  emit,
  enemies,
  findByCode,
  flags,
  forceResult,
  type GameContext,
  type InstId,
  inv,
  invsAt,
  leadInvestigator,
  moveCard,
  pile,
  playerCount,
  setCardLocation,
  setCode,
  setCounter,
  setEngaged,
  shuffleDeck,
  shuffleList,
  stepsToward,
  turnOrder,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffects,
  spawn,
  revealLocation,
  resolveRevelation,
  endScenario,
  advanceAct,
} from "../../../../src/engine/api";
import type { ChaosToken, Effect } from "../../../../src/content/schema";
import { drawFire } from "../../../packs/core_2026/scripts/12129";

const FIRE = "12129";
const CISTERN = "12174";
const SLUICE = "12175";
const TUNNELS = ["12183", "12184", "12185", "12186", "12187"];

const setAside = (game: GameContext, code: string) =>
  allCards(game).filter((c) => c.code === code && c.zone === "setAside");
const cistern = (game: GameContext) => findByCode(game, CISTERN, [ZONE.Location]);
const elokoss = (game: GameContext) =>
  enemies(game).find((e) => e.code === "12179" || e.code === "12179b");
const firesAt = (game: GameContext, loc: InstId | null) =>
  cardsIn(game, ZONE.Attached).filter((c) => c.code === FIRE && c.location === loc);
const BAG: Record<string, ChaosToken[]> = {
  easy: ["elderThing"],
  standard: ["elderThing", "tablet"],
  hard: ["elderThing", "tablet", "skull"],
  expert: ["elderThing", "tablet", "cultist", "skull"],
};

function eachTest(
  game: GameContext,
  ctx: EffCtx,
  skill: "willpower",
  difficulty: number,
  onFail: Effect[],
) {
  queue(
    game,
    ...activeInvs(game).map((i) =>
      resolveEffects({
        effects: [{ op: "skillTest" as const, skill, difficulty, onFail }],
        ctx: { ...ctx, you: i, inv: i },
      }),
    ),
  );
}

/** the harbinger of Elokoss, unmasked: what they do for the investigators (the campaign log names them) */
const HARBINGER: [string, Effect[]][] = [
  [
    "david_harbinger",
    [{ op: "searchAndPlay", filter: { trait: ["Tome", "Spell"] }, costMod: -99, deckOnly: true }],
  ],
  ["cornelia_harbinger", [{ op: EVENT.Heal, damage: 3 }]],
  ["naomi_harbinger", [{ op: "gainResources", amount: 5 }]],
  [
    "earl_harbinger",
    [
      {
        op: "searchAndPlay",
        filter: { type: "asset", trait: "Weapon" },
        costMod: -99,
        deckOnly: true,
      },
    ],
  ],
  [
    "abigail_harbinger",
    [
      {
        op: "chooseOne",
        options: [
          { label: "Draw 3 cards", effects: [{ op: "drawCards", amount: 3 }] },
          { label: "Draw 2 cards", effects: [{ op: "drawCards", amount: 2 }] },
          { label: "Draw 1 card", effects: [{ op: "drawCards", amount: 1 }] },
          { label: "Draw no cards", effects: [] },
        ],
      },
    ],
  ],
  ["margaret_harbinger", [{ op: EVENT.Heal, horror: 3 }]],
];

export default {
  conditions: {
    fireHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.you && firesAt(game, inv(game, ctx.you).location).length > 0,
  },
  fns: {
    setup(game: GameContext) {
      addChaosTokens(game, BAG[difficultyOf(game)]);
      if (campaignLogOf(game).scoured_arkham_for_answers)
        for (const i of turnOrder(game)) addCounter(game, i, "clues", 1);
      if (campaignLogOf(game).stirred_up_trouble) {
        // the cult has heard of your violence: 1 Cultist per investigator, each at a different Sewer Tunnels
        const cultists = allCards(game)
          .filter(
            (c) =>
              c.zone === "encounterDeck" &&
              ["ashen_pilgrims", "cultists_ch2"].includes(def(game, c.id).encounterSet ?? "") &&
              def(game, c.id).traits.includes("Cultist"),
          )
          .map((c) => c.id);
        shuffleList(game, cultists);
        const tunnels = TUNNELS.map((t) => findByCode(game, t, [ZONE.Location])).filter(Boolean);
        cultists.slice(0, playerCount(game)).forEach((id, k) => {
          moveCard(game, id, ZONE.Limbo);
          queue(game, spawn({ enemy: id, inv: null, at: tunnels[k]!.id }));
        });
      }
    },
    drawFire(game: GameContext, run: ScriptRun) {
      drawFire(game, run.ctx.you ?? leadInvestigator(game));
    },
    /** Expert and Hard: at a Ritual Site, the tablet fails the test */
    ritualSiteFails(game: GameContext, run: ScriptRun) {
      const loc = inv(game, run.you).location;
      if (currentTest(game) && loc && def(game, loc).traits.includes("Ritual Site"))
        forceResult(game, "fail");
    },
    flameInTheDark(game: GameContext, run: ScriptRun) {
      const servant = setAside(game, "12180")[0];
      const c = cistern(game);
      if (servant && c) {
        moveCard(game, servant.id, ZONE.Limbo);
        queue(game, spawn({ enemy: servant.id, inv: null, at: c.id }));
      }
      eachTest(game, run.ctx, "willpower", 4, [{ op: "takeHorror", amount: 1, direct: true }]);
    },
    /** The Mother Arrives: Elokoss on her Mother of Flame side; special agenda 3a is the act and the agenda */
    motherArrives(game: GameContext) {
      const c = cistern(game);
      const actOne = cardIf(game, currentAct(game))?.code === "12172";
      const faint = elokoss(game);
      if (actOne || !faint) {
        if (c && !card(game, c.id).revealed) queue(game, revealLocation(c.id));
        // Elokoss is one card: set aside on her faint side, she arrives turned to the Mother of Flame
        const mother = setAside(game, "12179")[0];
        if (mother) setCode(game, mother.id, "12179b");
        if (mother && c) {
          moveCard(game, mother.id, ZONE.Limbo);
          queue(game, spawn({ enemy: mother.id, inv: null, at: c.id }));
        }
      } else {
        // flipped: the same card, its damage and attachments kept
        setCode(game, faint.id, "12179b");
        emit(game, EVENT.Flip, "Elokoss awakens: Mother of Flame", { card: faint.id });
      }
      if (currentAct(game)) moveCard(game, currentAct(game)!, ZONE.Removed);
      for (const id of [...pile(game, ZONE.ActDeck)]) moveCard(game, id, ZONE.Removed);
    },
    /** The Ritual Site: Elokoss stirs, Fire! for the investigator there, the knights and heralds join the deck, the sluice */
    ritualSite(game: GameContext) {
      const c = cistern(game);
      const faint = setAside(game, "12179")[0];
      if (faint && c) {
        moveCard(game, faint.id, ZONE.Limbo);
        queue(game, spawn({ enemy: faint.id, inv: null, at: c.id }));
      }
      const fires = setAside(game, FIRE);
      const there = c ? invsAt(game, c.id)[0] : undefined;
      if (fires[0] && there) {
        moveCard(game, fires[0].id, ZONE.Limbo);
        queue(game, resolveRevelation({ inv: there, card: fires[0].id }));
      }
      for (const x of [
        ...setAside(game, FIRE),
        ...setAside(game, "12177"),
        ...setAside(game, "12178"),
      ])
        moveCard(game, x.id, ZONE.EncounterDeck);
      shuffleDeck(game, "encounter");
      const sluice = setAside(game, SLUICE)[0];
      if (sluice) moveCard(game, sluice.id, ZONE.Location);
    },
    douse(game: GameContext, run: ScriptRun) {
      const here = firesAt(game, inv(game, run.you).location);
      if (!here.length) return;
      discard(
        game,
        run.chooseCard(
          here.map((f) => f.id),
          { text: "Discard a Fire!", key: "chooseOne" },
        ),
      );
    },
    /** each Cultist enemy moves once toward Underground Cistern */
    cultistsGather(game: GameContext) {
      const c = cistern(game);
      if (!c) return;
      for (const e of enemies(game)) {
        if (!def(game, e.id).traits.includes("Cultist") || !e.location || e.location === c.id)
          continue;
        const next = stepsToward(game, e.location, [c.id])[0];
        if (!next) continue;
        setCardLocation(game, e.id, next);
        setEngaged(game, e.id, null);
        emit(game, EVENT.EnemyMove, `${def(game, e.id).name} moves to ${def(game, next).name}`, {
          card: e.id,
          data: { to: next },
        });
      }
    },
    /** the sluice gate opens: each enemy is defeated, and the deluge takes everyone who stayed (R3) */
    deluge(game: GameContext) {
      for (const e of enemies(game))
        moveCard(
          game,
          e.id,
          def(game, e.id).victory !== undefined ? ZONE.Victory : ZONE.EncounterDiscard,
        );
      queue(game, endScenario({ id: "R3" }));
    },
    codexPhi(game: GameContext, run: ScriptRun) {
      emit(
        game,
        EVENT.Codex,
        "By defeating the Servant of Flame, you have brought them to their senses. As you take off their mask, they look up at you, confused.",
      );
      const found = HARBINGER.find(([key]) => campaignLogOf(game)[key]);
      if (!found) return;
      for (const i of activeInvs(game))
        queue(game, resolveEffects({ effects: found[1], ctx: { ...run.ctx, you: i, inv: i } }));
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      const c = cistern(game);
      // its clues are always replenished
      if (c && card(game, c.id).revealed && card(game, c.id).clues === 0)
        setCounter(game, c.id, "clues", 2 * playerCount(game));
      const act = cardIf(game, currentAct(game))?.code ?? null;
      if (act === "12172" && c && activeInvs(game).some((i) => inv(game, i).location === c.id)) {
        queue(game, advanceAct());
        return;
      }
      if (flags.defeated.get(game, "12179") || flags.defeated.get(game, "12179b"))
        queue(game, endScenario({ id: "R1" }));
    },
  },
} satisfies CardScript;
