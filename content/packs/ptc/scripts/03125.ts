// Mistakes of the Past (Echoes of the Past, act 2) — back: clues on the revealed Historical Societies as act 1's; an
// investigator the lead chooses takes control of Mr. Peabody; the Hidden Library enters play.
import {
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  moveCard,
  setController,
  activeInvs,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  checkSlots,
} from "../../../../src/engine/api";
import {
  HIDDEN_LIBRARY,
  PEABODY,
} from "../../../campaigns/the-path-to-carcosa/scripts/echoes-of-the-past";
import { lateNightStudies } from "./03124";

export default {
  abilities: [{ kind: "revelation", run: "secretPassageways" }],
  fns: {
    secretPassageways(game: GameContext, run: ScriptRun) {
      const who = run.chooseInvestigator(
        activeInvs(game),
        { text: "Choose an investigator to take control of Mr. Peabody", key: "eotpPeabody" },
        { who: run.you },
      );
      lateNightStudies(game);
      const him = findByCode(game, PEABODY, [ZONE.SetAside]);
      if (him) {
        moveCard(game, him.id, ZONE.Play);
        setController(game, him.id, who);
        emit(game, EVENT.Control, `${def(game, him.id).name} joins the investigators`, {
          card: him.id,
          inv: who,
        });
        queue(game, checkSlots({ inv: who, card: him.id }));
      }
      const library = findByCode(game, HIDDEN_LIBRARY, [ZONE.SetAside]);
      if (library) {
        moveCard(game, library.id, ZONE.Location);
        emit(game, EVENT.Location, `${def(game, library.id).name} is put into play`, {
          card: library.id,
        });
      }
    },
  },
} satisfies CardScript;
