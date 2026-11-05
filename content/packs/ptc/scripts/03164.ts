// "The Really Bad Ones" (v. I) (The Unspeakable Oath, act 2) — the unrevealed side of the [[Arkham Asylum]] locations
// is ignored (its data); it advances when Daniel's Cell is revealed. Back: an investigator at Daniel's Cell (the lead
// chooses) takes control of Daniel Chesterfield, asset side up; the encounter discard pile and every enemy beneath the
// act deck are shuffled into the encounter deck.
import {
  type CardScript,
  checkSlots,
  def,
  emit,
  findByCode,
  type GameContext,
  invsAt,
  leadInvestigator,
  moveCard,
  setController,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
} from "../../../../src/engine/api";
import {
  DANIEL,
  DANIELS_CELL,
} from "../../../campaigns/the-path-to-carcosa/scripts/the-unspeakable-oath";
import { underActToDeck } from "./03166";

export default {
  abilities: [{ kind: "revelation", run: "threeGeese" }],
  fns: {
    threeGeese(game: GameContext, run: ScriptRun) {
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
        queue(game, checkSlots({ inv: who, card: daniel.id }));
      }
      underActToDeck(game, run.source);
    },
  },
} satisfies CardScript;
