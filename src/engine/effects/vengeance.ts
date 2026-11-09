/** Vengeance in the victory display (The Forgotten Age): a card taken back out of it. */
import { ask, cardIf, def, emit, type GameContext } from "../context";
import { moveCard } from "../movement";
import { cardsIn } from "../queries";
import { CHOICE, ZONE } from "../world/constants";
import { EVENT } from "../events/event";
import type { InstId } from "../world/types";
import { opt } from "./targets";
import type { EffectOf, EffectRun } from "./types";

/** Time-Wracked Woods: a non-[[Elite]] card with vengeance from the victory display to the encounter discard pile */
function returnVengeanceCardEffect(
  game: GameContext,
  run: EffectRun<EffectOf<"returnVengeanceCard">>,
) {
  const cards = cardsIn(game, ZONE.Victory)
    .filter(
      (c) => def(game, c.id).vengeance !== undefined && !def(game, c.id).traits.includes("Elite"),
    )
    .map((c) => c.id);
  if (!cards.length) return;
  const id = ask<InstId>(
    game,
    run.step,
    run.you,
    CHOICE.Generic,
    "Choose a card with vengeance to return from the victory display",
    cards.map((x) => opt(game, x)),
    { auto: true, key: "returnVengeance" },
  );
  if (id === undefined || !cardIf(game, id)) return;
  moveCard(game, id, ZONE.EncounterDiscard);
  emit(game, EVENT.Discard, `${def(game, id).name} leaves the victory display`, { card: id });
}

export const vengeanceEffects = { returnVengeanceCard: returnVengeanceCardEffect };
