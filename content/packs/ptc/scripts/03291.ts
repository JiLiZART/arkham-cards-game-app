// Abbey Church (Black Stars Rise) — +2 shroud while the two agendas in play have different numbers. Forced: when it is
// revealed, the set-aside Chœur Gothique, Knight's Hall, Cloister, Chapel of St. Aubert and Abbey Tower enter play.
// Unrevealed: entering it costs 3 clues per investigator, spent as a group by the investigators at Broken Steps (the
// card data: `enterCluesPerInvestigator`, `enterCluesFromHere`).
import {
  allCards,
  card,
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  moveCard,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";
import {
  agendasInPlay,
  CHAPEL,
  CHOEUR,
  CLOISTER,
  KNIGHTS_HALL,
  TOWER,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

const SET_ASIDE = [...CHOEUR, KNIGHTS_HALL, CLOISTER, ...CHAPEL, ...TOWER];

export default {
  abilities: [{ kind: "forced", trigger: "revealed", run: "abbey" }],
  modifiers(game: GameContext, self: InstId) {
    const stages = new Set(agendasInPlay(game).map((id) => def(game, id).stage));
    return card(game, self).revealed && agendasInPlay(game).length === 2 && stages.size === 2
      ? [{ target: self, mod: { stat: "shroud" as const, value: 2 } }]
      : [];
  },
  fns: {
    abbey(game: GameContext) {
      for (const c of allCards(game).filter(
        (x) => x.zone === ZONE.SetAside && SET_ASIDE.includes(x.code),
      )) {
        moveCard(game, c.id, ZONE.Location);
        emit(game, EVENT.Location, `${def(game, c.id).name} is put into play`, { card: c.id });
      }
    },
  },
} satisfies CardScript;
