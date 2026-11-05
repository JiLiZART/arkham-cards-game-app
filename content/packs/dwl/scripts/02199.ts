// Searching for Answers (Blood on the Altar, act 1) — its objective (an investigator enters The Hidden Chamber) is the
// scenario's; back: each unrevealed location is revealed, then every clue in play, the investigators' too, moves to The
// Hidden Chamber, and Silas Bishop spawns there
import {
  activeInvs,
  addCounter,
  allCards,
  type CardScript,
  findByCode,
  type GameContext,
  inv,
  locations,
  setCounter,
  ZONE,
  type ScriptRun,
  queue,
  revealLocation,
  runScript,
  spawn,
} from "../../../../src/engine/api";
import {
  HIDDEN_CHAMBER,
  SILAS,
} from "../../../campaigns/the-dunwich-legacy/scripts/blood-on-the-altar";

/** the zones of cards in play that can hold clues */
const IN_PLAY: string[] = [ZONE.Location, ZONE.Play, ZONE.Threat, ZONE.Enemy, ZONE.Attached];

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      queue(
        game,
        ...locations(game)
          .filter((l) => !l.revealed)
          .map((l) => revealLocation(l.id)),
        runScript({ code: "02199", fn: "gather", ctx: run.ctx }),
      );
    },
    gather(game: GameContext) {
      const chamber = findByCode(game, HIDDEN_CHAMBER, [ZONE.Location]);
      if (!chamber) return;
      let n = 0;
      for (const c of allCards(game))
        if (c.id !== chamber.id && c.clues > 0 && IN_PLAY.includes(c.zone)) {
          n += c.clues;
          setCounter(game, c.id, "clues", 0);
        }
      for (const i of activeInvs(game)) {
        n += inv(game, i).clues;
        setCounter(game, i, "clues", 0);
      }
      addCounter(game, chamber.id, "clues", n);
      const silas = findByCode(game, SILAS, [ZONE.SetAside]);
      if (silas) queue(game, spawn({ enemy: silas.id, inv: null, at: chamber.id }));
    },
  },
} satisfies CardScript;
