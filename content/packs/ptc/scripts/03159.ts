// The Unspeakable Oath's reference card — "randomly choose an enemy from among the set-aside [[Monster]] enemies and
// place it beneath the act deck without looking at it", for its tokens and every card that says so; under agenda 3 (His
// Domain) it is shuffled into the encounter deck instead. Also the token conditions and the Garden's resign condition
// (Return to The Unspeakable Oath plays with this card too).
import {
  allCards,
  cardIf,
  type CardScript,
  currentAct,
  currentAgenda,
  currentTest,
  emit,
  enemiesAt,
  findByCode,
  type GameContext,
  moveCard,
  putBeneath,
  randomInt,
  shuffleDeck,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";
import {
  ACT_4,
  actIs,
  GARDEN,
  MONSTERS,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";

const HIS_DOMAIN = "03162";

/** a random set-aside Monster beneath the act deck (or, under His Domain, into the encounter deck) */
export function monsterBeneath(game: GameContext) {
  const pile = allCards(game).filter((c) => c.zone === ZONE.SetAside && MONSTERS.includes(c.code));
  const act = currentAct(game);
  if (!pile.length || !act) return;
  const m = pile[randomInt(game, pile.length)];
  if (cardIf(game, currentAgenda(game))?.code === HIS_DOMAIN) {
    moveCard(game, m.id, ZONE.EncounterDeck);
    shuffleDeck(game, "encounter");
    emit(game, EVENT.Shuffle, "A set-aside Monster is shuffled into the encounter deck");
    return;
  }
  putBeneath(game, m.id, act);
  emit(game, EVENT.UnderAct, "A set-aside Monster is placed beneath the act deck");
}

export default {
  conditions: {
    /** the Hard skull's "(Limit once per test.)": only the first skull of the test */
    firstSkull: (game: GameContext) =>
      (currentTest(game)?.tokens.filter((t) => t === "skull").length ?? 0) <= 1,
    monstersAside: (game: GameContext) =>
      allCards(game).some((c) => c.zone === ZONE.SetAside && MONSTERS.includes(c.code)),
    /** act 4: "Garden gains: '[action] If there is no ready enemy in the Garden: Resign.'" */
    gardenOpen: (game: GameContext) => {
      const garden = findByCode(game, GARDEN, [ZONE.Location]);
      return (
        actIs(game, ACT_4) && !!garden && !enemiesAt(game, garden.id).some((e) => !e.exhausted)
      );
    },
  },
  fns: { monsterBeneath },
} satisfies CardScript;
