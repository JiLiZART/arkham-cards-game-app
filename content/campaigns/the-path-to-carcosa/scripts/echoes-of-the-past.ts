// Echoes of the Past: two of the three Historical Societies of each floor, beside its hall; Sebastien Moreau set aside
// unless he was slain, clues on the Entry Hall if he was interviewed; Seekers of Carcosa by the number of
// investigators; one more action on the first turn if the party was fled. During act 3 the Passageways are connected
// to one another (Mr. Peabody's location among them while he is exhausted, the Hidden Library while an enemy moves).
// As it ends the campaign log learns whether Sebastien is in the victory display.
import {
  addCounter,
  allCards,
  type CardScript,
  card,
  cardIf,
  createCard,
  currentAct,
  def,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  locations,
  moveCard,
  playerCount,
  setCell,
  shuffleList,
  ZONE,
  queue,
  spawn,
} from "../../../../src/engine/api";

export const ENTRY_HALL = "03127";
export const HIDDEN_LIBRARY = "03139";
export const OATHSPEAKER = "03140";
export const PEABODY = "03141";
export const SEEKER = "03144";
export const SEBASTIEN = "03068b";
const ACT_3 = "03126";
/** the investigators fled the dinner party: each takes 1 additional action during their first turn */
export const ARRIVED_EARLY = "eotpArrivedEarly";
/** each floor's row on the map, top to bottom */
export const FLOORS: [string, number][] = [
  ["Third Floor", 0],
  ["Second Floor", 1],
  ["Ground Floor", 2],
];

export const isSociety = (game: GameContext, id: InstId) =>
  def(game, id).name === "Historical Society";
const onFloor = (game: GameContext, floor: string) =>
  locations(game).filter((l) => isSociety(game, l.id) && def(game, l.id).traits.includes(floor));

/** each floor's two Historical Societies on either side of its hall */
export function layFloors(game: GameContext, floors: [string, number][]) {
  for (const [floor, row] of floors)
    onFloor(game, floor)
      .sort((a, b) => a.code.localeCompare(b.code))
      .forEach((l, k) => setCell(game, l.id, [k === 0 ? 0 : 2, row]));
}

/** the location Mr. Peabody chose, while he is exhausted ("until Mr. Peabody readies") */
export function peabodysLocation(game: GameContext): InstId | undefined {
  const him = allCards(game).find((c) => c.code === PEABODY && c.zone === ZONE.Play);
  if (!him?.exhausted) return undefined;
  return locations(game).find((l) => flags.named(game, `eotpPeabody:${l.id}`))?.id;
}

/** the Passageway locations now: by trait, Mr. Peabody's, and the Hidden Library while an enemy is moving */
export function passageways(game: GameContext, enemyMoving: boolean): InstId[] {
  const at = peabodysLocation(game);
  return locations(game)
    .filter(
      (l) =>
        def(game, l.id).traits.includes("Passageway") ||
        l.id === at ||
        (enemyMoving && l.code === HIDDEN_LIBRARY),
    )
    .map((l) => l.id);
}

export default {
  fns: {
    floors(game: GameContext) {
      layFloors(game, FLOORS);
    },
    /** "If Sebastien Moreau is not listed under VIPs Slain": he waits set aside for agenda 2's back */
    sebastienAside(game: GameContext) {
      createCard(game, SEBASTIEN, ZONE.SetAside);
    },
    /** Sebastien was interviewed: 1 clue per investigator on the Entry Hall */
    sebastiensInformation(game: GameContext) {
      const hall = findByCode(game, ENTRY_HALL, [ZONE.Location]);
      if (hall) addCounter(game, hall.id, "clues", playerCount(game));
    },
    /** one Seeker of Carcosa per investigator beyond the first, each at a different Third Floor Historical Society
     * (four investigators: Second or Third Floor); the place among those is random (no one chooses during setup) */
    seekers(game: GameContext) {
      const n = playerCount(game) - 1;
      if (n <= 0) return;
      const places = [
        ...onFloor(game, "Third Floor"),
        ...(n >= 3 ? onFloor(game, "Second Floor") : []),
      ].map((l) => l.id);
      shuffleList(game, places);
      const seekers = allCards(game).filter(
        (c) => c.code === SEEKER && c.zone === ZONE.EncounterDeck,
      );
      for (const [k, at] of places.slice(0, n).entries()) {
        const s = seekers[k];
        if (!s) continue;
        moveCard(game, s.id, ZONE.Limbo);
        queue(game, spawn({ enemy: s.id, inv: null, at }));
      }
    },
    /** "You arrive at the Historical Society with time to spare": 1 more action in each first turn (agenda 1 gives it) */
    arriveEarly(game: GameContext) {
      flags.setNamed(game, ARRIVED_EARLY, true);
    },
  },
  hooks: {
    /** act 3: "Locations with the [[Passageway]] trait are connected to one another" */
    connections(game: GameContext, loc: InstId, enemy: boolean) {
      if (cardIf(game, currentAct(game))?.code !== ACT_3) return [];
      const all = passageways(game, enemy);
      return all.includes(loc) ? all.filter((l) => l !== loc) : [];
    },
    ended(game: GameContext) {
      if (allCards(game).some((c) => c.code === SEBASTIEN && c.zone === ZONE.Victory))
        flags.logEntry.set(game, ["vipsSlain", SEBASTIEN], true);
    },
  },
} satisfies CardScript;

/** the card's location, when it is a Historical Society not yet revealed */
export const unrevealedSociety = (game: GameContext, loc: InstId | null | undefined) =>
  !!loc && isSociety(game, loc) && !card(game, loc).revealed;
