// Underground Muscle (The House Always Wins, agenda 2) — back: a random set-aside Hideous Abomination spawns in the Clover
// Club Lounge, the rest of that set, Striking Fear and the encounter discard pile shuffled in; everyone and every
// unengaged enemy at La Bella Luna moves to the Lounge, and La Bella Luna leaves the game
import {
  allCards,
  type CardScript,
  def,
  emit,
  enemiesAt,
  findByCode,
  type GameContext,
  invsAt,
  moveCard,
  placeInvestigator,
  randomInt,
  reshuffleDiscard,
  setCardLocation,
  EVENT,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";

const ABOMINATIONS = ["02103", "02104"];
const STRIKING_FEAR = ["01163", "01164", "01165"];

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext) {
      const lounge = findByCode(game, "02071", [ZONE.Location]);
      const aside = (codes: string[]) =>
        allCards(game).filter((c) => c.zone === ZONE.SetAside && codes.includes(c.code));
      const pool = aside(ABOMINATIONS);
      const pick = pool.length ? pool[randomInt(game, pool.length)] : undefined;
      for (const c of [...pool, ...aside(STRIKING_FEAR)])
        if (c.id !== pick?.id) moveCard(game, c.id, ZONE.EncounterDeck);
      reshuffleDiscard(game, "encounter");
      emit(
        game,
        EVENT.Reshuffle,
        "Hideous Abominations, Striking Fear and the encounter discard pile are shuffled into the encounter deck",
      );
      const luna = findByCode(game, "02070", [ZONE.Location]);
      if (luna && lounge) {
        for (const i of invsAt(game, luna.id)) placeInvestigator(game, i, lounge.id);
        // an engaged enemy goes with the investigator it is engaged with
        for (const e of enemiesAt(game, luna.id)) setCardLocation(game, e.id, lounge.id);
        for (const c of allCards(game))
          if (c.zone === ZONE.Attached && c.location === luna.id)
            moveCard(game, c.id, ZONE.EncounterDiscard);
        moveCard(game, luna.id, ZONE.Removed);
        emit(game, EVENT.Location, `${def(game, luna.id).name} is removed from the game`, {
          card: luna.id,
        });
      }
      if (pick && lounge) queue(game, spawn({ enemy: pick.id, inv: null, at: lounge.id }));
    },
  },
} satisfies CardScript;
