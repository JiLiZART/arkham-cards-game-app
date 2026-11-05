// The Truth is Hidden (Echoes of the Past, agenda 1; agendas 2 and 3 share its front) — the mythos phase places no
// doom on it (its data: `noMythosDoom`); after clues are placed on an enemy they turn to doom. While the Historical
// Societies are unrevealed, an enemy spawning at one reveals it (their unrevealed side, which the engine doesn't read
// off an unrevealed location). Back: the encounter discard pile is shuffled into the encounter deck.
import {
  addCounter,
  type CardScript,
  currentRound,
  def,
  type EffCtx,
  flags,
  type GameContext,
  reshuffleDiscard,
  type ScriptRun,
  queue,
  revealLocation,
} from "../../../../src/engine/api";
import {
  ARRIVED_EARLY,
  unrevealedSociety,
} from "../../../campaigns/the-path-to-carcosa/scripts/echoes-of-the-past";

/** an Echoes agenda's front, with its back's abilities */
export const echoesAgenda = (back: NonNullable<CardScript["abilities"]>): CardScript => ({
  abilities: [
    {
      kind: "forced",
      trigger: "cluesPlaced",
      condition: { script: "onEnemy" },
      effects: [{ op: "cluesToDoom", on: "eachEnemy" }],
    },
    {
      kind: "forced",
      trigger: "enemySpawns",
      condition: { script: "atUnrevealedSociety" },
      run: "revealSociety",
    },
    ...back,
  ],
  conditions: {
    onEnemy: (game: GameContext, ctx: EffCtx) => !!ctx.card && def(game, ctx.card).type === "enemy",
    atUnrevealedSociety: (game: GameContext, ctx: EffCtx) => unrevealedSociety(game, ctx.location),
    arrivedEarly: (game: GameContext) =>
      currentRound(game) === 1 && !!flags.named(game, ARRIVED_EARLY),
  },
  fns: {
    /** "Forced - When an enemy spawns at this location: Reveal this location." */
    revealSociety(game: GameContext, run: ScriptRun) {
      if (run.ctx.location) queue(game, revealLocation(run.ctx.location));
    },
    shuffleDiscard(game: GameContext) {
      reshuffleDiscard(game, "encounter");
    },
    /** the setup's "each investigator can take 1 additional action during their first turn" */
    earlyAction(game: GameContext, run: ScriptRun) {
      if (run.ctx.inv) addCounter(game, run.ctx.inv, "actionsLeft", 1);
    },
  },
});

export default echoesAgenda([
  {
    kind: "forced",
    trigger: "turnBegins",
    condition: { script: "arrivedEarly" },
    run: "earlyAction",
  },
  { kind: "revelation", run: "shuffleDiscard" },
]) satisfies CardScript;
