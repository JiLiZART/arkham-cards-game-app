/** Effects on the exploration deck (ADR-0052): explore, look at it, shuffle into it, reveal from it, rebuild it. */
import {
  ask,
  cardIf,
  def,
  emit,
  type GameContext,
  invName,
  pile,
  push,
  shuffleDeck,
} from "../context";
import { moveCard } from "../movement";
import { cannotExplore } from "../queries";
import { buildExploration } from "../rules/scenario";
import type { InstId } from "../world/types";
import { EVENT } from "../events/event";
import { CHOICE, PILE, ZONE } from "../world/constants";
import { STEP } from "../steps/step";
import { opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";

const deck = (game: GameContext) => pile(game, PILE.Exploration);
const shuffleExploration = (game: GameContext) => shuffleDeck(game, "exploration");

function exploreEffect(game: GameContext, run: EffectRun<EffectOf<"explore">>) {
  if (cannotExplore(game, run.you)) return;
  push(game, { t: STEP.Explore, inv: run.you, match: run.effect.match, drawn: [] });
}

/** Expedition Camp: 1 of the top cards on the bottom, the others back on top in any order; Entryway: its treacheries out */
function lookAtExplorationEffect(game: GameContext, run: EffectRun<EffectOf<"lookAtExploration">>) {
  const { step, you, effect: e } = run;
  const cards = deck(game).slice(0, e.top);
  if (!cards.length) return;
  if (e.then === "discardTreacheries") {
    emit(
      game,
      EVENT.Look,
      `${invName(game, you)} looks at the top ${cards.length} of the exploration deck`,
      {
        inv: you,
        data: { n: cards.length },
      },
    );
    for (const id of cards.filter((x) => def(game, x).type === "treachery")) {
      moveCard(game, id, ZONE.EncounterDiscard);
      emit(game, EVENT.Discard, `${def(game, id).name} is discarded`, { card: id });
    }
    shuffleExploration(game);
    return;
  }
  if (step.choice === undefined)
    emit(
      game,
      EVENT.Look,
      `${invName(game, you)} looks at the top ${cards.length} of the exploration deck`,
      {
        inv: you,
        data: { n: cards.length },
      },
    );
  const bottom = ask<InstId>(
    game,
    step,
    you,
    CHOICE.Generic,
    "Choose the card to put on the bottom of the exploration deck",
    cards.map((id) => opt(game, id)),
    { auto: true, key: "explorationBottom" },
  );
  if (bottom === undefined) return;
  moveCard(game, bottom, ZONE.Exploration);
  const rest = cards.filter((id) => id !== bottom);
  if (rest.length)
    push(game, { t: STEP.ArrangeTop, inv: you, deck: "exploration", cards: rest, placed: [] });
}

function shuffleIntoExplorationEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"shuffleIntoExploration">>,
) {
  const id = run.effect.card === "self" ? run.ctx.source : pile(game, PILE.EncounterDeck)[0];
  if (!id || !cardIf(game, id)) return;
  moveCard(game, id, ZONE.Exploration);
  shuffleExploration(game);
  emit(game, EVENT.Shuffle, `${def(game, id).name} is shuffled into the exploration deck`, {
    card: id,
  });
}

/** Worlds Beyond: cards revealed until a location, which is put into play; the others shuffled back */
function revealExplorationUntilEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"revealExplorationUntil">>,
) {
  const id = deck(game).find((x) => def(game, x).type === run.effect.type);
  if (!id) return;
  moveCard(game, id, ZONE.Location);
  shuffleExploration(game);
  emit(game, EVENT.Location, `${def(game, id).name} is put into play from the exploration deck`, {
    card: id,
  });
  push(game, { t: STEP.RevealLocation, location: id });
}

/** Depths of Yoth: what is left of the exploration deck set aside, and a new one built */
function rebuildExplorationEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"rebuildExploration">>,
) {
  for (const id of [...deck(game)]) moveCard(game, id, ZONE.SetAside);
  const { op: _op, ...spec } = run.effect;
  buildExploration(game, spec);
}

export const explorationEffects = {
  explore: exploreEffect,
  lookAtExploration: lookAtExplorationEffect,
  shuffleIntoExploration: shuffleIntoExplorationEffect,
  revealExplorationUntil: revealExplorationUntilEffect,
  rebuildExploration: rebuildExplorationEffect,
};
