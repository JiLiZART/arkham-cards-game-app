// Sickening Reality (Return to The Last King, a Crazed Guest's, two copies) — with no Party Guest in play it stays
// beneath the scenario reference card and another Sickening Reality resolves at random (never one of these, which would
// stay too); otherwise the lead chooses a Party Guest in play: each investigator at its location takes 1 damage, 1 doom
// goes on the current agenda, and this card flips to its enemy side and takes that Party Guest's place.
import {
  allCards,
  type CardScript,
  cardsBeneath,
  currentAgenda,
  type GameContext,
  placeDoom,
  queue,
  randomInt,
  resolveStory,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { switchWith } from "./52023b";

export const PARTY_GUEST = "52026";
const CRAZED_REALITY = "52024b";

/** the Party Guests in play */
export const partyGuests = (game: GameContext) =>
  allCards(game).filter((c) => c.code === PARTY_GUEST && c.zone === ZONE.Attached);

export default {
  abilities: [{ kind: "revelation", run: "turn" }],
  fns: {
    turn(game: GameContext, run: ScriptRun) {
      const guests = partyGuests(game);
      if (!guests.length) {
        const scenario = allCards(game).find((c) => c.zone === ZONE.Scenario);
        const others = (scenario ? [...cardsBeneath(game, scenario.id)] : []).filter(
          (id) => allCards(game).find((c) => c.id === id)?.code !== CRAZED_REALITY,
        );
        if (others.length)
          queue(game, resolveStory({ card: others[randomInt(game, others.length)], you: run.you }));
        return;
      }
      const guest = run.chooseCard(
        guests.map((g) => g.id),
        { text: "Choose a Party Guest in play", key: "partyGuestTurns" },
        { who: run.you },
      );
      const agenda = currentAgenda(game);
      switchWith(
        game,
        run,
        guest,
        { damage: 1, horror: 0 },
        ...(agenda ? [placeDoom({ card: agenda, n: 1 })] : []),
      );
    },
  },
} satisfies CardScript;
