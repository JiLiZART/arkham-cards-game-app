// "The Really Bad Ones" (v. IV) (Return to The Unspeakable Oath, act 2 while Doubt leads) — as the base act 2's front
// (its data; Daniel's Cell revealed advances it). Back (Again and Again): an investigator at Daniel's Cell (the lead
// chooses) takes control of Daniel Chesterfield, asset side up, with the set-aside Radical Treatment attached to him;
// the encounter discard pile and every enemy beneath the act deck are shuffled into the encounter deck.
import {
  attachTo,
  type CardScript,
  checkSlots,
  def,
  emit,
  EVENT,
  findByCode,
  type GameContext,
  invsAt,
  leadInvestigator,
  moveCard,
  queue,
  type ScriptRun,
  setController,
  ZONE,
} from "../../../../src/engine/api";
import {
  DANIEL,
  DANIELS_CELL,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";
import { underActToDeck } from "../../ptc/scripts/03166";

export const RADICAL_TREATMENT = "52038";

export default {
  abilities: [{ kind: "revelation", run: "againAndAgain" }],
  fns: {
    againAndAgain(game: GameContext, run: ScriptRun) {
      const cell = findByCode(game, DANIELS_CELL, [ZONE.Location]);
      const there = cell ? invsAt(game, cell.id) : [];
      const daniel = findByCode(game, DANIEL, [ZONE.SetAside]);
      if (daniel && there.length) {
        const who = run.chooseInvestigator(
          there,
          {
            text: "Choose an investigator to take control of Daniel Chesterfield",
            key: "tuoDaniel",
          },
          { who: leadInvestigator(game) },
        );
        moveCard(game, daniel.id, ZONE.Play);
        setController(game, daniel.id, who);
        emit(game, EVENT.Control, `${def(game, daniel.id).name} joins the investigators`, {
          card: daniel.id,
          inv: who,
        });
        const treatment = findByCode(game, RADICAL_TREATMENT, [ZONE.SetAside]);
        if (treatment) {
          moveCard(game, treatment.id, ZONE.Attached);
          attachTo(game, treatment.id, daniel.id);
          emit(game, EVENT.Attach, "Radical Treatment is attached to Daniel Chesterfield", {
            card: treatment.id,
          });
        }
        queue(game, checkSlots({ inv: who, card: daniel.id }));
      }
      underActToDeck(game, run.source);
    },
  },
} satisfies CardScript;
