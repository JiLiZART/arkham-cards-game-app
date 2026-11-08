// Curtain Call: Lola Hayes starts at Backstage (the token table's functions are its reference card's, 03043). Act 2's
// objective ("when The Man in the Pallid Mask would be discarded from play, advance") replaces his defeat; act 3's
// ("each undefeated investigator has resigned") is met when every investigator is gone and someone resigned. The
// campaign log learns whether anyone stole from the box office, and, with no resolution, how often the Stranger fell.
import {
  addCounter,
  cardIf,
  type CardScript,
  currentAct,
  def,
  emit,
  findByCode,
  flags,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  placeInvestigator,
  turnOrder,
  EVENT,
  ZONE,
  queue,
  advanceAct,
  dealDamage,
  endScenario,
  runScript,
} from "../../../../src/engine/api";
import { MITPM, strangerDefeated } from "../../../packs/ptc/scripts/03059";

export const LOLA = "03006";
export const THEATRE = "03049";
export const LOBBY = "03050";
export const BACKSTAGE = "03052";
export const BALCONY = "03051";
/** act 2's versions: the three here, and Return to Curtain Call's three more */
export const ACT_2 = ["03047a", "03047b", "03047c", "52015", "52016", "52017"];
export const ACT_3 = "03048";

/** 1 horror on a location (the theatre's flames, ooze and flood) */
export function horrorOn(game: GameContext, loc: InstId, n = 1) {
  addCounter(game, loc, "horror", n);
  emit(game, EVENT.Place, `${n} horror is placed on ${def(game, loc).name}`, {
    card: loc,
    data: { horror: n },
  });
}

/** an investigator takes horror from the token pool */
export const takeHorror = (game: GameContext, i: InvId, n: number, source: InstId | null) =>
  queue(game, dealDamage({ inv: i, damage: 0, horror: n, direct: false, source }));

const actIs = (game: GameContext, codes: string[]) =>
  codes.includes(cardIf(game, currentAct(game))?.code ?? "");

export default {
  fns: {
    /** "If Lola Hayes was chosen as an investigator, she begins play at Backstage, instead" */
    lolaBackstage(game: GameContext) {
      const back = findByCode(game, BACKSTAGE, [ZONE.Location]);
      if (back && turnOrder(game).includes(LOLA)) placeInvestigator(game, LOLA, back.id);
    },
  },
  hooks: {
    wouldBeDefeated(game: GameContext, who: InvId | InstId) {
      // act 2: The Man in the Pallid Mask is not discarded, the act advances (its back moves him to the Lobby)
      if (cardIf(game, who)?.code !== MITPM || !actIs(game, ACT_2)) return false;
      strangerDefeated(game);
      queue(game, advanceAct());
      return true;
    },
    allEliminated(game: GameContext) {
      const resigned = turnOrder(game).some((i) => inv(game, i).status === "resigned");
      const act = currentAct(game);
      // act 3's objective is met: its back, the investigators' decision, is asked of the lead (no one is playing)
      queue(
        game,
        act && actIs(game, [ACT_3]) && resigned
          ? runScript({ code: ACT_3, fn: "back", ctx: { source: act } })
          : endScenario({ id: "none" }),
      );
    },
    ended(game: GameContext, won: boolean) {
      if (flags.rememberedFact.get(game, "stoleFromBoxOffice"))
        flags.logEntry.set(game, ["hidden", "stoleFromBoxOffice"], true);
      // a resolution places its own two tallies under "Chasing the Stranger": only no resolution counts the defeats
      if (won) flags.countEntry.clear(game, ["chasingTheStranger", "chasingTheStranger"]);
    },
  },
} satisfies CardScript;
