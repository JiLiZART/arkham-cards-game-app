// The Last King (the token table's functions are its reference card's, 03061): the five Bystanders, one at random at each location but the Foyer, with 1 clue plus 1 per investigator.
// A Bystander's parley takes control of 1 of its clues; when its last clue is gone it flips to its story ("interviewed")
// and back. There is no objective: the game ends when every investigator has resigned or been defeated, Resolution 1
// if anyone resigned, else Resolution 2; agenda 2b is Resolution 3. As it ends the campaign log learns the VIPs
// interviewed and slain and the clues on the act.
import {
  allCards,
  card,
  cardIf,
  type CardScript,
  currentAct,
  def,
  emit,
  findByCode,
  flags,
  type GameContext,
  inv,
  locations,
  moveCard,
  playerCount,
  setController,
  shuffleList,
  turnOrder,
  addCounter,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  endScenario,
  flip,
  resolveStory,
} from "../../../../src/engine/api";

export const FOYER = "03070";
/** each Bystander, its story face's "remember" key, and the Sickening Reality that turns it */
export const BYSTANDERS: Record<string, { fact: string; reality: string }> = {
  "03076a": { fact: "interviewedConstance", reality: "03065" },
  "03077": { fact: "interviewedJordan", reality: "03066" },
  "03078": { fact: "interviewedHaruko", reality: "03067" },
  "03079": { fact: "interviewedSebastien", reality: "03068" },
  "03080": { fact: "interviewedAshleigh", reality: "03069" },
};
/** the Possessed versions, recorded under "VIPs Slain" when in the victory display */
const POSSESSED = ["03065b", "03066b", "03067b", "03068b", "03069b"];
const CLUES_ON_ACT = ["hidden", "tlkCluesOnAct"] as const;

/** the Bystanders at their locations */
export const bystanders = (game: GameContext) =>
  allCards(game).filter((c) => c.zone === ZONE.Attached && c.code in BYSTANDERS);

export default {
  fns: {
    bystanders(game: GameContext) {
      const rooms = locations(game).filter((l) => l.code !== FOYER);
      const pool = Object.keys(BYSTANDERS).flatMap(
        (code) => findByCode(game, code, [ZONE.SetAside]) ?? [],
      );
      shuffleList(game, pool);
      pool.forEach((b, k) => {
        const at = rooms[k];
        if (!at) return;
        moveCard(game, b.id, ZONE.Attached, { location: at.id });
        setController(game, b.id, null);
        addCounter(game, b.id, "clues", 1 + playerCount(game));
        emit(game, EVENT.Place, `${def(game, b.id).name} is at ${def(game, at.id).name}`, {
          card: b.id,
        });
      });
    },
    /** after a parley took a clue: the Bystander's last clue gone, it flips to its story and back */
    interviewed(game: GameContext, run: ScriptRun) {
      const b = cardIf(game, run.source);
      if (b?.zone !== ZONE.Attached || b.clues > 0) return;
      queue(game, flip(b.id), resolveStory({ card: b.id, you: run.you }));
    },
  },
  hooks: {
    allEliminated(game: GameContext) {
      const resigned = turnOrder(game).some((i) => inv(game, i).status === "resigned");
      queue(game, endScenario({ id: resigned ? "R1" : "R2" }));
    },
    ended(game: GameContext) {
      const act = currentAct(game);
      const onAct = act ? card(game, act).clues : 0;
      if (onAct) flags.countEntry.set(game, CLUES_ON_ACT, onAct);
      for (const [code, { fact }] of Object.entries(BYSTANDERS))
        if (flags.rememberedFact.get(game, fact))
          flags.logEntry.set(game, ["vipsInterviewed", code], true);
      for (const c of allCards(game))
        if (c.zone === ZONE.Victory && POSSESSED.includes(c.code))
          flags.logEntry.set(game, ["vipsSlain", c.code], true);
    },
  },
} satisfies CardScript;
