// Locked Inside (The Unspeakable Oath, agenda 1; agendas 2 and 3 share what the scenario hangs on them): each
// investigator chooses the Asylum Halls they begin at on their first turn (the setup's choice, which no one can make
// while the game is being set up); a Courage asset takes the horror assigned to it (2 at most, then it is discarded).
// Back: the encounter discard pile and the set-aside Possessed enemies are shuffled into the encounter deck; the lead
// places a random set-aside Monster beneath the act deck.
import {
  allCards,
  type CardScript,
  def,
  discard,
  type EffCtx,
  emit,
  flags,
  type GameContext,
  inv,
  moveCard,
  placeInvestigator,
  reshuffleDiscard,
  tokensOn,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";
import {
  CHOOSE_HALL,
  COURAGE,
  courageCard,
  hallsInPlay,
  POSSESSED,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";
import { monsterBeneath } from "./03159";

/** an Oath agenda: the Courage asset's soak beside the agenda's own abilities */
export const oathAgenda = (
  own: Pick<CardScript, "abilities" | "conditions" | "fns">,
): CardScript => ({
  abilities: [
    { kind: "forced", trigger: "damageDealt", condition: { script: "courage" }, run: "courage" },
    ...(own.abilities ?? []),
  ],
  conditions: {
    ...own.conditions,
    courage: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv && !!ctx.dealt?.[1] && tokensOn(game, ctx.inv, COURAGE) > 0,
  },
  fns: {
    ...own.fns,
    /** the horror about to be placed goes to the Courage asset first, as much as it can take */
    courage(game: GameContext, run: ScriptRun) {
      const i = run.ctx.inv;
      const key = run.ctx.key;
      if (!i || !key) return;
      const left = tokensOn(game, i, COURAGE);
      const n = Math.min(left, run.ctx.dealt?.[1] ?? 0);
      if (!n) return;
      const [d, h] = flags.prevented.get(game, key) ?? [0, 0];
      flags.prevented.set(game, key, [d, h + n]);
      queue(
        game,
        resolveEffect({
          effect: { op: "removeTokens", name: COURAGE, amount: n, on: "you" },
          ctx: { you: i, source: null },
        }),
      );
      emit(game, EVENT.Prevent, `Courage takes ${n} horror`, { inv: i, data: { horror: n } });
      if (n >= left) {
        const c = courageCard(game, i);
        if (c) discard(game, c);
      }
    },
  },
});

export default oathAgenda({
  abilities: [
    {
      kind: "forced",
      trigger: "turnBegins",
      condition: { script: "chooseHall" },
      run: "startHall",
    },
    { kind: "revelation", run: "patients" },
  ],
  conditions: {
    chooseHall: (game: GameContext, ctx: EffCtx) =>
      !!ctx.inv &&
      !!flags.named(game, CHOOSE_HALL) &&
      !flags.remembered.get(game, [CHOOSE_HALL, ctx.inv]),
  },
  fns: {
    /** "Each investigator begins play at an Asylum Halls of their choice" */
    startHall(game: GameContext, run: ScriptRun) {
      const i = run.ctx.inv;
      if (!i) return;
      const to = run.chooseCard(
        hallsInPlay(game).map((l) => l.id),
        { text: "Begin play at which Asylum Halls?", key: "tuoStartHall" },
        { who: i, auto: false },
      );
      flags.remembered.set(game, [CHOOSE_HALL, i], true);
      if (inv(game, i).location !== to) placeInvestigator(game, i, to);
      emit(game, EVENT.Place, `${inv(game, i).name} begins at ${def(game, to).name}`, {
        inv: i,
        card: to,
      });
    },
    patients(game: GameContext) {
      for (const c of allCards(game))
        if (c.zone === ZONE.SetAside && POSSESSED.includes(c.code))
          moveCard(game, c.id, ZONE.EncounterDeck);
      reshuffleDiscard(game, "encounter");
      monsterBeneath(game);
    },
  },
}) satisfies CardScript;
