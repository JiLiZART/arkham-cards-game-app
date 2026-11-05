// Imperceptible Creature (Return to Undimensioned and Unseen) — Surge is a keyword; revelation: attached to a Brood of
// Yog-Sothoth in play with no copy of it attached, 1 clue removed from that Brood; the Brood gains Elite
import {
  addCounter,
  allCards,
  attachTo,
  card,
  type CardScript,
  def,
  emit,
  EVENT,
  type GameContext,
  type InstId,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { broods } from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

const CODE = "51046";
const attached = (game: GameContext, host: InstId) =>
  allCards(game).some((c) => c.code === CODE && c.zone === ZONE.Attached && c.attachedTo === host);

export default {
  abilities: [{ kind: "revelation", run: "hide" }],
  fns: {
    hide(game: GameContext, run: ScriptRun) {
      const pool = broods(game).filter((id) => !attached(game, id));
      if (!pool.length) return;
      const brood = run.chooseCard(pool, {
        text: "Choose a Brood of Yog-Sothoth for Imperceptible Creature",
        key: "imperceptibleCreature",
      });
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, brood);
      emit(game, EVENT.Attach, `Imperceptible Creature is attached to ${def(game, brood).name}`, {
        card: run.source,
      });
      if (card(game, brood).clues > 0) addCounter(game, brood, "clues", -1);
    },
  },
  modifiers: (game: GameContext, id: InstId) => {
    const host = card(game, id).attachedTo;
    if (card(game, id).zone !== ZONE.Attached || !host) return [];
    return [{ target: host, mod: { flag: "elite" as const } }];
  },
} satisfies CardScript;
