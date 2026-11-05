// Straitjacket — Revelation: if there is no copy in your threat area, it enters it as an asset taking up a body slot
// and 2 hand slots (your slots shrink by as many while it is there), and each asset in those slots returns to your
// hand. [action][action]: discard it. (Its other way out of play, a discard by another effect, is not barred.)
import {
  allCards,
  card,
  type CardScript,
  def,
  emit,
  type GameContext,
  type InstId,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";

const STRAITJACKET = "03185";

export default {
  abilities: [
    { kind: "revelation", run: "bind" },
    {
      kind: "action",
      actionCost: 2,
      label: "Straitjacket: discard it",
      effects: [{ op: "discardSelf" }],
    },
  ],
  modifiers(game: GameContext, cardId: InstId) {
    const c = card(game, cardId);
    if (c.zone !== ZONE.Threat || !c.controller) return [];
    return [
      { target: c.controller, mod: { stat: "bodySlots" as const, value: -1 } },
      { target: c.controller, mod: { stat: "handSlots" as const, value: -2 } },
    ];
  },
  fns: {
    bind(game: GameContext, run: ScriptRun) {
      const worn = allCards(game).some(
        (c) => c.code === STRAITJACKET && c.zone === ZONE.Threat && c.controller === run.you,
      );
      if (worn) return;
      for (const a of allCards(game).filter(
        (c) =>
          c.zone === ZONE.Play &&
          c.controller === run.you &&
          !!c.owner &&
          def(game, c.id).slots.some((s) => s === "hand" || s === "body"),
      ))
        moveCard(game, a.id, ZONE.Hand);
      moveCard(game, run.source, ZONE.Threat);
      setController(game, run.source, run.you);
      emit(game, EVENT.Threat, "Straitjacket enters the threat area", {
        inv: run.you,
        card: run.source,
      });
    },
  },
} satisfies CardScript;
