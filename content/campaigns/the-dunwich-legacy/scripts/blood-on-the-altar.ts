// Blood on the Altar: the village (one copy of each location at random, one of those out of the game too), the pile of
// potential sacrifices (the kidnapped, Zebulon Whateley, Earl Sawyer), The Hidden Chamber, its Key and the top 3
// encounter cards dealt beneath the five; the objectives of both acts; and, as it ends, the unique cards beneath the
// agenda deck written to the campaign log as sacrificed to Yog-Sothoth (with every potential sacrifice left, if no
// resolution was reached).
import {
  campaignLogOf,
  card,
  cardIf,
  type CardScript,
  createCard,
  currentAct,
  def,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  moveCard,
  pile,
  putBeneath,
  shuffleDeck,
  shuffleList,
  sideDeck,
  turnOrder,
  ZONE,
  queue,
  advanceAct,
  allCards,
  endScenario,
} from "../../../../src/engine/api";

export const VILLAGE_COMMONS = "02201";
export const HIDDEN_CHAMBER = "02214";
export const KEY = "02215";
export const SILAS = "02216";
/** the facedown pile of potential sacrifices */
export const SACRIFICES = "sacrifices";
/** the campaign log list (section and id) of the sacrificed */
export const SACRIFICED = ["sacrificed", "sacrificed"] as const;

/** the two copies of each location but the Village Commons */
const PAIRS = [
  ["02202", "02203"],
  ["02204", "02205"],
  ["02206", "02207"],
  ["02208", "02209"],
  ["02210", "02211"],
  ["02212", "02213"],
];
/** who "was kidnapped" in the campaign log, and their card */
const KIDNAPPED: [string, string][] = [
  ["henryArmitageKidnapped", "02040"],
  ["warrenRiceKidnapped", "02061"],
  ["francisMorganKidnapped", "02080"],
];
const AGENDAS = ["02196", "02197", "02198"];

/** a potential sacrifice at random goes beneath the agenda deck (beneath `agenda`, which passes its pile on) */
export function sacrifice(game: GameContext, agenda: InstId) {
  const pool = [...sideDeck(game, SACRIFICES)];
  if (!pool.length) return;
  shuffleList(game, pool);
  putBeneath(game, pool[0], agenda);
}

export default {
  fns: {
    village(game: GameContext) {
      // one copy of each location at random; then one of those six out of the game too
      const kept = PAIRS.map((pair) => {
        const p = [...pair];
        shuffleList(game, p);
        moveCard(game, findByCode(game, p[1], [ZONE.SetAside])!.id, ZONE.Removed);
        return p[0];
      });
      shuffleList(game, kept);
      moveCard(game, findByCode(game, kept[0], [ZONE.SetAside])!.id, ZONE.Removed);
      const five = kept.slice(1).map((code) => findByCode(game, code, [ZONE.SetAside])!.id);
      for (const id of five) moveCard(game, id, ZONE.Location);
      // the potential sacrifices: each character the log says was kidnapped, Zebulon Whateley and Earl Sawyer
      const log = campaignLogOf(game);
      const aside = (code: string) => findByCode(game, code, [ZONE.SetAside])?.id;
      const pool = [
        ...KIDNAPPED.filter(([key]) => log[key]).map(([, code]) =>
          createCard(game, code, ZONE.Limbo),
        ),
        ...["02217", "02218"].map(aside).filter((id): id is InstId => !!id),
      ];
      shuffleList(game, pool);
      for (const id of pool) moveCard(game, id, ZONE.SideDeck, { deck: SACRIFICES });
      // The Hidden Chamber, its Key and the top 3 encounter cards, shuffled, one beneath each location but the Commons
      shuffleDeck(game, "encounter");
      const dealt = [
        aside(HIDDEN_CHAMBER)!,
        aside(KEY)!,
        ...pile(game, ZONE.EncounterDeck).slice(0, 3),
      ];
      shuffleList(game, dealt);
      five.forEach((loc, k) => putBeneath(game, dealt[k], loc));
    },
  },
  hooks: {
    checkObjectives(game: GameContext) {
      const act = cardIf(game, currentAct(game))?.code;
      const chamber = findByCode(game, HIDDEN_CHAMBER, [ZONE.Location]);
      // act 1: "when an investigator enters The Hidden Chamber, advance"
      if (
        act === "02199" &&
        chamber &&
        turnOrder(game).some((i) => inv(game, i).location === chamber.id)
      )
        queue(game, advanceAct());
      if (act !== "02200") return;
      // act 2: "if Silas Bishop is defeated: (→R1)"; "if there are no clues in the Hidden Chamber, advance"
      if (findByCode(game, SILAS, [ZONE.Victory, ZONE.EncounterDiscard]))
        queue(game, endScenario({ id: "R1" }));
      else if (chamber && card(game, chamber.id).clues === 0) queue(game, advanceAct());
    },
    ended(game: GameContext, won: boolean) {
      // beneath the agenda deck, and, with no resolution, every potential sacrifice left
      const beneath = allCards(game)
        .filter(
          (c) =>
            c.zone === ZONE.Beneath &&
            !!c.location &&
            AGENDAS.includes(cardIf(game, c.location)?.code ?? ""),
        )
        .map((c) => c.id);
      const sacrificed = [...beneath, ...(won ? [] : sideDeck(game, SACRIFICES))];
      const unique = [
        ...new Set(
          sacrificed.filter((id) => def(game, id).unique).map((id) => card(game, id).code),
        ),
      ];
      flags.cardsEntry.set(game, SACRIFICED, unique);
    },
  },
} satisfies CardScript;
