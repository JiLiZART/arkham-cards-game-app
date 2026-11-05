// Lost in Time and Space: the [[Extradimensional]] locations come from the encounter deck and link by their printed
// symbols (the scenario's `connections`, one row per code); a location leaving play sends its investigators and enemies
// to Another Dimension; "moved by an encounter card effect" costs 1 horror on every agenda; act 2's objective (an
// investigator enters The Edge of the Universe), Yog-Sothoth defeated (→R3), act 4 left by resigning (→R1); the act
// reached is written for the flow, which plays Resolution 2 or 4 when there is no resolution.
import {
  abilitiesOf,
  argField,
  asString,
  asStrings,
  card,
  cardIf,
  type CardScript,
  currentAct,
  currentAgenda,
  dealDamage,
  def,
  defeatInvestigator,
  discardTop,
  emit,
  endScenario,
  enemies,
  EVENT,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  invsAt,
  moveCard,
  moveInvestigator,
  pile,
  placeInvestigator,
  queue,
  type Queued,
  advanceAct,
  attackKey,
  enemyAttacks,
  removeLocation,
  reshuffleDiscard,
  resolveEffect,
  resolveEffects,
  revealLocation,
  runScript,
  type ScriptRun,
  setCardLocation,
  shuffleDeck,
  turnOrder,
  unreveal,
  ZONE,
} from "../../../../src/engine/api";

export const SCENARIO = "lost-in-time-and-space";
export const ANOTHER_DIMENSION = "02320";
export const EDGE = "02321";
export const TEAR_THROUGH_TIME = "02322";
export const YOG = "02323";
/** every agenda's "Forced - After you are moved to a location by an encounter card effect: Take 1 horror" */
export const AGENDAS = ["02312", "02313", "02314", "02315"];
const ACT_2 = "02317";
const ACT_4 = "02319";
/** the act reached, for the flow's Resolution 2 (act 4) or 4 (acts 1–3) with no resolution */
export const ACT_REACHED = ["hidden", "actReached"] as const;

export const inPlay = (game: GameContext, code: string) =>
  findByCode(game, code, [ZONE.Location])?.id;
export const extradimensional = (game: GameContext, id: InstId) =>
  def(game, id).traits.includes("Extradimensional");

/** the current agenda, when it is one of this scenario's (its forced horror applies) */
function horrorAgenda(game: GameContext): InstId | null {
  const ag = currentAgenda(game);
  return ag && AGENDAS.includes(card(game, ag).code) ? ag : null;
}

/** "you are moved to `to`" by an encounter card: the move, then the agenda's 1 horror if it took you there */
export function encounterMove(game: GameContext, i: InvId, to: InstId): Queued[] {
  const ag = horrorAgenda(game);
  return [
    moveInvestigator({ inv: i, to }),
    ...(ag
      ? [
          runScript({
            code: card(game, ag).code,
            fn: "litasMoved",
            ctx: { source: ag, you: i },
            args: { to },
          }),
        ]
      : []),
  ];
}

/** a location's revelation abilities, resolved by `who`: it is not drawn, so no surge */
export function revelationOf(game: GameContext, loc: InstId, who: InvId): Queued[] {
  const ctx = { source: loc, you: who, inv: who };
  return abilitiesOf(game, loc)
    .filter((a) => a.kind === "revelation")
    .map((a) =>
      a.run
        ? runScript({ code: card(game, loc).code, fn: a.run, ctx })
        : resolveEffects({ effects: a.effects ?? [], ctx }),
    );
}

/**
 * Discard cards from the top of the encounter deck until a location is discarded; the discard pile is shuffled back in
 * once if the deck runs out first. The location found, or none.
 */
export function discardUntilLocation(game: GameContext): InstId | undefined {
  for (let pass = 0; pass < 2; pass++) {
    while (pile(game, ZONE.EncounterDeck).length) {
      const [id] = discardTop(game, "encounter", 1);
      if (def(game, id).type === "location") return id;
    }
    reshuffleDiscard(game, "encounter");
  }
  return undefined;
}

/** a location of this scenario into play from wherever it is: on its revealed side, its clues placed */
export function enterPlay(game: GameContext, loc: InstId) {
  if (card(game, loc).zone === ZONE.Location) return;
  moveCard(game, loc, ZONE.Location);
  unreveal(game, loc);
  emit(game, EVENT.Location, `${def(game, loc).name} is put into play`, { card: loc });
  queue(game, revealLocation(loc));
}

/** What the scenario's cards run by name: given to their card scripts too (a Return-to scenario plays them). */
export const SHARED = {
  fns: {
    /** "Revelation - Put … into play" */
    litasEnter(game: GameContext, run: ScriptRun) {
      enterPlay(game, run.source);
    },
    /** the cultist token: discard until a location, put it into play and move there */
    litasFindLocation(game: GameContext, run: ScriptRun) {
      const loc = discardUntilLocation(game);
      if (!loc) return;
      enterPlay(game, loc);
      queue(game, ...encounterMove(game, run.you, loc));
    },
    /** the agenda's forced horror, if the move took you there */
    litasMoved(game: GameContext, run: ScriptRun) {
      const to = asString(argField(run.args, "to"));
      if (to && inv(game, run.you).location === to)
        queue(
          game,
          dealDamage({ inv: run.you, damage: 0, horror: 1, direct: false, source: run.source }),
        );
    },
    /** this location leaves play and is shuffled into the encounter deck (Steps of Y'hagharl, Dimensional Doorway) */
    litasShuffleBack(game: GameContext, run: ScriptRun) {
      const loc = run.source;
      if (card(game, loc).zone !== ZONE.Location) return;
      queue(
        game,
        removeLocation({ location: loc }),
        runScript({ code: card(game, loc).code, fn: "litasToDeck", ctx: run.ctx }),
      );
    },
    litasToDeck(game: GameContext, run: ScriptRun) {
      if (card(game, run.source).zone !== ZONE.EncounterDiscard) return;
      moveCard(game, run.source, ZONE.EncounterDeck);
      shuffleDeck(game, "encounter");
      emit(
        game,
        EVENT.Shuffle,
        `${def(game, run.source).name} is shuffled into the encounter deck`,
        { card: run.source },
      );
    },
    /** the acts' action: discard the top 3 encounter cards, then a location among them resolves its revelation */
    litasExplore(game: GameContext, run: ScriptRun) {
      if (pile(game, ZONE.EncounterDeck).length < 3) reshuffleDiscard(game, "encounter");
      const found = discardTop(game, "encounter", 3).filter(
        (id) => def(game, id).type === "location",
      );
      if (!found.length) return;
      queue(
        game,
        runScript({
          code: card(game, run.source).code,
          fn: "litasExploreChoose",
          ctx: run.ctx,
          args: { cards: found },
        }),
      );
    },
    litasExploreChoose(game: GameContext, run: ScriptRun) {
      const found = asStrings(argField(run.args, "cards")).filter(
        (id) => card(game, id).zone === ZONE.EncounterDiscard,
      );
      if (!found.length) return;
      const loc = run.chooseCard(found, {
        text: "Choose a discarded location to resolve its revelation",
        key: "litasExplore",
      });
      queue(game, ...revelationOf(game, loc, run.you));
    },
  },
} satisfies CardScript;

export default {
  fns: SHARED.fns,
  hooks: {
    /** Another Dimension: "When a location leaves play: Move each investigator and unengaged enemy at that location to Another Dimension" */
    locationLeavesPlay(game: GameContext, loc: InstId) {
      const to = inPlay(game, ANOTHER_DIMENSION);
      if (!to || to === loc) return;
      const moved = invsAt(game, loc);
      for (const i of moved) {
        placeInvestigator(game, i, to);
        emit(game, EVENT.Move, `${inv(game, i).name} moves to ${def(game, to).name}`, {
          inv: i,
          card: to,
          data: { from: loc },
        });
      }
      // the engaged enemies go with their investigators, the others are moved: all of them end up there
      for (const e of enemies(game).filter((x) => x.location === loc))
        setCardLocation(game, e.id, to);
      const ag = horrorAgenda(game);
      if (ag)
        queue(
          game,
          ...moved.map((i) =>
            dealDamage({ inv: i, damage: 0, horror: 1, direct: false, source: ag }),
          ),
        );
    },
    checkObjectives(game: GameContext) {
      // The End of All Things: "If Yog-Sothoth is defeated, (→R3)"
      if (findByCode(game, YOG, [ZONE.EncounterDiscard, ZONE.Victory])) {
        queue(game, endScenario({ id: "R3" }));
        return;
      }
      // act 2: "If an investigator enters The Edge of the Universe, advance"
      const edge = inPlay(game, EDGE);
      if (cardIf(game, currentAct(game))?.code === ACT_2 && edge && invsAt(game, edge).length)
        queue(game, advanceAct());
    },
    allEliminated(game: GameContext) {
      // act 4: "If each undefeated investigator has resigned, advance" (→R1)
      const resigned = turnOrder(game).some((i) => inv(game, i).status === "resigned");
      const act4 = cardIf(game, currentAct(game))?.code === ACT_4;
      queue(game, endScenario({ id: act4 && resigned ? "R1" : "none" }));
    },
    ended(game: GameContext) {
      const act = cardIf(game, currentAct(game));
      flags.countEntry.set(game, ACT_REACHED, act ? (def(game, act.id).stage ?? 1) : 4);
    },
  },
} satisfies CardScript;

/** Yog-Sothoth's reaction: instead of taking up to X horror, discard the top X cards; an empty deck drives you insane */
export function yogDiscards(game: GameContext, run: ScriptRun) {
  const horror = run.ctx.dealt?.[1] ?? 0;
  const deck = inv(game, run.you).deck.length;
  if (!horror || !deck) return;
  const n = run.choose<number>(
    Array.from({ length: horror }, (_, k) => ({
      id: String(k + 1),
      label: `Discard ${k + 1} card(s) instead of ${k + 1} horror`,
      value: k + 1,
      key: "option.yogDiscard",
      vars: { n: k + 1 },
    })),
    { text: "How many cards to discard instead of horror?", key: "yogDiscard" },
  );
  queue(
    game,
    resolveEffect({ effect: { op: "preventDamage", amount: n, kind: "horror" }, ctx: run.ctx }),
    resolveEffect({ effect: { op: "discardDeckTop", amount: n }, ctx: run.ctx }),
    runScript({ code: YOG, fn: "yogInsane", ctx: run.ctx }),
  );
}
/** "Then, if you have no cards in your deck, you are driven insane" */
export function yogInsane(game: GameContext, run: ScriptRun) {
  if (inv(game, run.you).deck.length || inv(game, run.you).status !== "playing") return;
  flags.insane.set(game, run.you, true);
  emit(game, EVENT.Defeated, `${inv(game, run.you).name} is driven insane`, { inv: run.you });
  queue(game, defeatInvestigator({ inv: run.you, by: "effect" }));
}
/** The End of All Things: Yog-Sothoth attacks each investigator in player order, wherever it is */
export function yogAttacksEach(game: GameContext): Queued[] {
  const yog = enemies(game).find((e) => e.code === YOG);
  if (!yog) return [];
  return turnOrder(game)
    .filter((i) => inv(game, i).status === "playing")
    .map((i) => enemyAttacks({ enemy: yog.id, inv: i, aoo: false, key: attackKey(game) }));
}
