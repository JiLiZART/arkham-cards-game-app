// Spreading Flames: Bystander parleys, the agendas' tests and Fire!, the acts' end-of-round advances and backs
import {
  activeInvs,
  addCounter,
  allCards,
  ask,
  card,
  cardIf,
  type CardScript,
  cardsIn,
  currentAct,
  def,
  discard,
  type EffCtx,
  emit,
  enemiesAt,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  invName,
  leadInvestigator,
  locationByName,
  moveCard,
  pile,
  placeInvestigator,
  playerCount,
  push,
  setController,
  setCounter,
  shuffleDeck,
  spendableGroupClues,
  type Step,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
} from "../../../../src/engine/api";
import type { Effect, Skill } from "../../../../src/content/schema";
import { drawFire } from "../../../packs/core_2026/scripts/12129";

const FIRE = "12129";
const SERVANT = "12114";
const ROOM = "12113";
const QUAD = "12116";
const DORMS = "12117";

const setAside = (game: GameContext, code: string) =>
  allCards(game).filter((c) => c.code === code && c.zone === "setAside");
const discardEnemies = (game: GameContext) => {
  for (const e of cardsIn(game, ZONE.Enemy)) discard(game, e.id);
};

export default {
  conditions: {
    oneOrTwoPlayers: (game: GameContext) => playerCount(game) <= 2,
  },
  fns: {
    /** each investigator, in player order, makes the test */
    eachTest(
      game: GameContext,
      ctx: EffCtx,
      args: { skill: Skill; difficulty: number; onFail: Effect[] },
    ) {
      push(
        game,
        ...activeInvs(game).map((i) => ({
          t: "Effects" as const,
          effects: [
            {
              op: "skillTest" as const,
              skill: args.skill,
              difficulty: args.difficulty,
              onFail: args.onFail,
            },
          ],
          ctx: { ...ctx, you: i, inv: i },
        })),
      );
    },
    discardBystander(game: GameContext, ctx: EffCtx, _args: unknown, step?: Step) {
      const here = enemiesAt(game, inv(game, ctx.you!).location).filter((e) => e.code === "12123");
      if (!here.length) return;
      const pick = ask<InstId>(
        game,
        step!,
        ctx.you!,
        CHOICE.Target,
        "Discard a Bystander",
        here.map((e) => ({ id: e.id, label: def(game, e.id).name, card: e.id, value: e.id })),
        { auto: true, key: "chooseEnemy" },
      );
      if (pick !== undefined) discard(game, pick);
    },
    /** Lit Up: if they are still set aside, n set-aside Fire! go to the encounter discard pile */
    fireToDiscard(game: GameContext, _ctx: EffCtx, n: number) {
      for (const c of setAside(game, FIRE).slice(0, n)) moveCard(game, c.id, ZONE.EncounterDiscard);
    },
    drawFire(game: GameContext, ctx: EffCtx) {
      drawFire(game, ctx.you ?? leadInvestigator(game));
    },
    leadDrawsFire(game: GameContext) {
      drawFire(game, leadInvestigator(game));
    },
    /** Up in Flames: each investigator who has not resigned is defeated and suffers 1 physical trauma */
    upInFlames(game: GameContext) {
      for (const i of activeInvs(game)) push(game, { t: STEP.Defeated, inv: i, by: "damage" });
    },
    /** an act advanced at the end of the round by spending clues (at Orne Library, for `at`) */
    endOfRoundAdvance(game: GameContext, _ctx: EffCtx, at: string | undefined, step?: Step) {
      if (!currentAct(game)) return;
      const cost = (def(game, currentAct(game)!).actClues ?? 0) * playerCount(game);
      const loc = at ? findByCode(game, at, [ZONE.Location])?.id : undefined;
      const who = activeInvs(game).filter((i) => !loc || inv(game, i).location === loc);
      const clues = at
        ? who.reduce((n, i) => n + inv(game, i).clues, 0)
        : spendableGroupClues(game);
      if (!who.length || clues < cost) return;
      const yes = ask<boolean>(
        game,
        step!,
        leadInvestigator(game),
        CHOICE.Generic,
        `Spend ${cost} clues as a group to advance the act?`,
        [
          { id: "yes", label: `Advance act (spend ${cost} clues)`, value: true },
          { id: "no", label: "Not yet", value: false },
        ],
        { key: "chooseOne" },
      );
      if (!yes) return;
      let n = cost;
      for (const i of [
        leadInvestigator(game),
        ...who.filter((x) => x !== leadInvestigator(game)),
      ].filter((x) => who.includes(x))) {
        const take = Math.min(n, inv(game, i).clues);
        addCounter(game, i, "clues", -take);
        n -= take;
      }
      push(game, { t: STEP.AdvanceAct });
    },
    /** ...There's Fire: the dorms and the quad, the Servant of Flame, Fire! in your friend's room */
    thereIsFire(game: GameContext) {
      discardEnemies(game);
      for (const code of [DORMS, QUAD]) {
        const c = setAside(game, code)[0];
        if (c) moveCard(game, c.id, ZONE.Location);
      }
      const servant = setAside(game, SERVANT)[0];
      const dorms = findByCode(game, DORMS, [ZONE.Location]);
      if (servant && dorms) {
        moveCard(game, servant.id, ZONE.Limbo);
        push(game, { t: STEP.Spawn, enemy: servant.id, inv: null, at: dorms.id });
      }
      const room = findByCode(game, ROOM, [ZONE.Location]);
      const fires = setAside(game, FIRE);
      if (room && fires.length) {
        moveCard(game, fires[0].id, ZONE.Attached, { location: room.id });
        emit(game, EVENT.Attach, `Fire! is attached to ${def(game, room.id).name}`, {
          card: fires[0].id,
        });
      }
      for (const c of setAside(game, FIRE)) moveCard(game, c.id, ZONE.EncounterDiscard);
    },
    /** In the Open: the Servant set aside, healed; enemies discarded; your friend's room gone; the campus opens */
    inTheOpen(game: GameContext) {
      const servant = allCards(game).find(
        (c) => c.code === SERVANT && c.zone !== "setAside" && c.zone !== "removed",
      );
      if (servant) moveCard(game, servant.id, ZONE.SetAside);
      flags.defeated.clear(game, SERVANT);
      discardEnemies(game);
      const room = findByCode(game, ROOM, [ZONE.Location]);
      if (room) {
        const quad = findByCode(game, QUAD, [ZONE.Location]);
        for (const i of activeInvs(game))
          if (inv(game, i).location === room.id && quad) placeInvestigator(game, i, quad.id);
        setCounter(game, room.id, "clues", 0);
        moveCard(game, room.id, ZONE.Removed);
      }
      for (const name of ["Orne Library", "Science Hall", "Warren Observatory"]) {
        const c = allCards(game).find(
          (x) => x.zone === "setAside" && def(game, x.id).name === name,
        );
        if (c) moveCard(game, c.id, ZONE.Location);
      }
    },
    /** The Servant Unleashed: Dr. Armitage joins, the Servant returns to the quad, clues there, Fire! for the lead */
    servantUnleashed(game: GameContext, _ctx: EffCtx, _args: unknown, step?: Step) {
      const armitage = setAside(game, "12115")[0];
      if (armitage) {
        const who = ask<InvId>(
          game,
          step!,
          leadInvestigator(game),
          CHOICE.Target,
          "Who takes control of Dr. Henry Armitage?",
          activeInvs(game).map((i) => ({
            id: i,
            label: invName(game, i),
            card: inv(game, i).cardId,
            value: i,
          })),
          { auto: true, key: "chooseInvestigator" },
        );
        if (who === undefined) return;
        // he takes up no ally slot during this scenario: no slot check
        moveCard(game, armitage.id, ZONE.Play);
        setController(game, armitage.id, who);
        emit(game, EVENT.Control, `${invName(game, who)} takes control of Dr. Henry Armitage`, {
          inv: who,
          card: armitage.id,
        });
      }
      const quad = locationByName(game, "Miskatonic Quad");
      const servant = setAside(game, SERVANT)[0];
      if (servant && quad) {
        setCounter(game, servant.id, "damage", 0);
        moveCard(game, servant.id, ZONE.Limbo);
        push(game, { t: STEP.Spawn, enemy: servant.id, inv: null, at: quad.id });
      }
      if (quad) addCounter(game, quad.id, "clues", 3 * playerCount(game));
      // the lead searches the encounter deck and discard pile for 1 Fire! per investigator and draws them
      const fires = [...pile(game, ZONE.EncounterDeck), ...pile(game, ZONE.EncounterDiscard)]
        .filter((id) => card(game, id).code === FIRE)
        .slice(0, playerCount(game));
      for (const id of fires) {
        moveCard(game, id, ZONE.Limbo);
        push(game, { t: STEP.Revelation, inv: leadInvestigator(game), card: id });
      }
      shuffleDeck(game, "encounter");
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      const act = cardIf(game, currentAct(game))?.code ?? null;
      if (act === "12110") {
        const quad = findByCode(game, QUAD, [ZONE.Location]);
        const live = activeInvs(game);
        if (quad && live.length && live.every((i) => inv(game, i).location === quad.id))
          push(game, { t: STEP.AdvanceAct });
      }
      if (act === "12112" && flags.defeated.get(game, SERVANT)) push(game, { t: STEP.AdvanceAct });
    },
  },
} satisfies CardScript;
