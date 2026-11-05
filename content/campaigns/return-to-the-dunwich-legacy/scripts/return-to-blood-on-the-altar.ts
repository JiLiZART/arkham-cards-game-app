// Return to Blood on the Altar (setup card 51032): the base scenario's script, with the box's rules over it — three
// copies of each village location, no Naomi's Crew card dealt beneath them, and the Hired Guns when the O'Bannion gang
// has a bone to pick with the investigators
import {
  campaignLogOf,
  type CardScript,
  cardsIn,
  composeScript,
  connections,
  def,
  type GameContext,
  locationByName,
  locations,
  moveCard,
  queue,
  spawn,
  ZONE,
} from "../../../../src/engine/api";
import base, { buildVillage, PAIRS } from "../../the-dunwich-legacy/scripts/blood-on-the-altar";

/** the box's copy of each location, in the order of the base's pairs */
const NEW = ["51034", "51035", "51036", "51037", "51038", "51039"];
const HIRED_GUN = "51040";

/** what the box adds to the base scenario */
const returnTo: CardScript = {
  fns: {
    /** "Remove 1 of the 3 copies of each … at random. Then, choose 1 of the 6 remaining locations at random and remove
     * it" (one copy of each kept, as the base); "do not include the 6 cards from the Naomi's Crew encounter set" */
    village(game: GameContext) {
      buildVillage(
        game,
        PAIRS.map((pair, k) => [...pair, NEW[k]]),
        (id) => def(game, id).encounterSet !== "naomis_crew",
      );
    },
    /** "If the O'Bannion gang has a bone to pick with the investigators: spawn one set-aside Hired Gun at one of the
     * locations not connected to Village Commons. Shuffle the other set-aside Hired Gun into the encounter deck" */
    hiredGuns(game: GameContext) {
      const guns = cardsIn(game, ZONE.SetAside).filter((c) => c.code === HIRED_GUN);
      const commons = locationByName(game, "Village Commons");
      if (!campaignLogOf(game).boneToPick || !guns.length || !commons) return;
      // the setup shuffles the encounter deck after its steps
      for (const g of guns.slice(1)) moveCard(game, g.id, ZONE.EncounterDeck);
      // the lead chooses among the locations not connected to the Commons, a one-way link either way counting
      const near = connections(game, commons.id);
      const among = locations(game)
        .filter(
          (l) =>
            l.id !== commons.id &&
            !near.includes(l.id) &&
            !connections(game, l.id).includes(commons.id),
        )
        .map((l) => l.id);
      queue(game, spawn({ enemy: guns[0].id, inv: null, among }));
    },
  },
};

export default composeScript(base, returnTo);
