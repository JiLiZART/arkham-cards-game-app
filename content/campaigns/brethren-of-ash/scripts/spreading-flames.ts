// Spreading Flames: Bystander parleys, the agendas' tests and Fire!, the acts' end-of-round advances and backs
import {
  activeInvs,
  addCounter,
  allCards,
  card,
  cardIf,
  type CardScript,
  cardsIn,
  currentAct,
  def,
  discard,
  emit,
  enemiesAt,
  findByCode,
  flags,
  type GameContext,
  inv,
  invName,
  leadInvestigator,
  locationByName,
  moveCard,
  pile,
  placeInvestigator,
  playerCount,
  setController,
  setCounter,
  shuffleDeck,
  spendableGroupClues,
  EVENT,
  ZONE,
  CHOICE,
  type ScriptRun,
  argField,
  asNumber,
  asString,
  queue,
  resolveEffects,
  defeatInvestigator,
  advanceAct,
  spawn,
  resolveRevelation,
} from "../../../../src/engine/api";
import type { Effect, Skill } from "../../../../src/content/schema";

const SKILL_NAMES: readonly string[] = ["willpower", "intellect", "combat", "agility"];
const isSkill = (v: string | undefined): v is Skill => v !== undefined && SKILL_NAMES.includes(v);
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
    eachTest(game: GameContext, run: ScriptRun) {
      // the scenario's data gives the test: { skill, difficulty, onFail }
      const skill = asString(argField(run.args, "skill"));
      const difficulty = asNumber(argField(run.args, "difficulty"));
      const onFail: unknown = argField(run.args, "onFail");
      if (!isSkill(skill) || difficulty === undefined || !Array.isArray(onFail))
        throw new Error(
          "spreading-flames.eachTest: args need a skill, a difficulty and onFail effects",
        );
      queue(
        game,
        ...activeInvs(game).map((i) =>
          resolveEffects({
            effects: [
              {
                op: "skillTest" as const,
                skill,
                difficulty,
                onFail: onFail as Effect[],
              },
            ],
            ctx: { ...run.ctx, you: i, inv: i },
          }),
        ),
      );
    },
    discardBystander(game: GameContext, run: ScriptRun) {
      const here = enemiesAt(game, inv(game, run.you).location).filter((e) => e.code === "12123");
      if (!here.length) return;
      discard(
        game,
        run.chooseCard(
          here.map((e) => e.id),
          { text: "Discard a Bystander", key: "chooseEnemy" },
        ),
      );
    },
    /** Lit Up: if they are still set aside, n set-aside Fire! go to the encounter discard pile */
    fireToDiscard(game: GameContext, run: ScriptRun) {
      for (const c of setAside(game, FIRE).slice(0, asNumber(run.args)))
        moveCard(game, c.id, ZONE.EncounterDiscard);
    },
    drawFire(game: GameContext, run: ScriptRun) {
      drawFire(game, run.ctx.you ?? leadInvestigator(game));
    },
    leadDrawsFire(game: GameContext) {
      drawFire(game, leadInvestigator(game));
    },
    /** Up in Flames: each investigator who has not resigned is defeated and suffers 1 physical trauma */
    upInFlames(game: GameContext) {
      for (const i of activeInvs(game)) queue(game, defeatInvestigator({ inv: i, by: "damage" }));
    },
    /** an act advanced at the end of the round by spending clues (at Orne Library, for `at`) */
    endOfRoundAdvance(game: GameContext, run: ScriptRun) {
      if (!currentAct(game)) return;
      const cost = (def(game, currentAct(game)!).actClues ?? 0) * playerCount(game);
      const at = asString(run.args);
      const loc = at ? findByCode(game, at, [ZONE.Location])?.id : undefined;
      const who = activeInvs(game).filter((i) => !loc || inv(game, i).location === loc);
      const clues = at
        ? who.reduce((n, i) => n + inv(game, i).clues, 0)
        : spendableGroupClues(game);
      if (!who.length || clues < cost) return;
      const yes = run.choose<boolean>(
        [
          { id: "yes", label: `Advance act (spend ${cost} clues)`, value: true },
          { id: "no", label: "Not yet", value: false },
        ],
        { text: `Spend ${cost} clues as a group to advance the act?`, key: "chooseOne" },
        { auto: false, kind: CHOICE.Generic, who: leadInvestigator(game) },
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
      queue(game, advanceAct());
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
        queue(game, spawn({ enemy: servant.id, inv: null, at: dorms.id }));
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
    servantUnleashed(game: GameContext, run: ScriptRun) {
      const armitage = setAside(game, "12115")[0];
      if (armitage) {
        const who = run.chooseInvestigator(
          activeInvs(game),
          { text: "Who takes control of Dr. Henry Armitage?", key: "chooseInvestigator" },
          { who: leadInvestigator(game) },
        );
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
        queue(game, spawn({ enemy: servant.id, inv: null, at: quad.id }));
      }
      if (quad) addCounter(game, quad.id, "clues", 3 * playerCount(game));
      // the lead searches the encounter deck and discard pile for 1 Fire! per investigator and draws them
      const fires = [...pile(game, ZONE.EncounterDeck), ...pile(game, ZONE.EncounterDiscard)]
        .filter((id) => card(game, id).code === FIRE)
        .slice(0, playerCount(game));
      for (const id of fires) {
        moveCard(game, id, ZONE.Limbo);
        queue(game, resolveRevelation({ inv: leadInvestigator(game), card: id }));
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
          queue(game, advanceAct());
      }
      if (act === "12112" && flags.defeated.get(game, SERVANT)) queue(game, advanceAct());
    },
  },
} satisfies CardScript;
