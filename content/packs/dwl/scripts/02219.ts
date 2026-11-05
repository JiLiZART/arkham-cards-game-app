// Powder of Ibn-Ghazi — enters play with X clues, X the characters who "survived the Dunwich Legacy" in the campaign log;
// fast: 1 of its clues moves to an exhausted Brood of Yog-Sothoth at your location
import {
  addCounter,
  campaignLogOf,
  card,
  type CardScript,
  def,
  type EffCtx,
  enemiesAt,
  type GameContext,
  type InstId,
  inv,
  setCounter,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the campaign log entries of the characters who survived The Dunwich Legacy */
const SURVIVED = [
  "henryArmitageSurvived",
  "warrenRiceSurvived",
  "francisMorganSurvived",
  "zebulonWhateleySurvived",
  "earlSawyerSurvived",
];

/** the clues it enters play with: one per character who survived The Dunwich Legacy */
export const powderClues = (game: GameContext) => {
  const log = campaignLogOf(game);
  return SURVIVED.filter((k) => log[k]).length;
};

/** the exhausted Brood of Yog-Sothoth at the investigator's location */
const broods = (game: GameContext, you: string | null | undefined): InstId[] =>
  you
    ? enemiesAt(game, inv(game, you).location)
        .filter((e) => e.exhausted && def(game, e.id).name === "Brood of Yog-Sothoth")
        .map((e) => e.id)
    : [];

export default {
  abilities: [
    { kind: "forced", trigger: "enterPlay", run: "charge" },
    {
      kind: "fast",
      label: "Powder of Ibn-Ghazi: move 1 clue to an exhausted Brood of Yog-Sothoth",
      condition: { script: "broodHere" },
      run: "dust",
    },
  ],
  conditions: {
    broodHere: (game: GameContext, ctx: EffCtx) =>
      !!ctx.source && card(game, ctx.source).clues > 0 && broods(game, ctx.you).length > 0,
  },
  fns: {
    charge(game: GameContext, run: ScriptRun) {
      setCounter(game, run.source, "clues", powderClues(game));
    },
    dust(game: GameContext, run: ScriptRun) {
      const brood = run.chooseCard(broods(game, run.you), {
        text: "Choose a Brood of Yog-Sothoth to move a clue to",
        key: "powderBrood",
      });
      addCounter(game, run.source, "clues", -1);
      addCounter(game, brood, "clues", 1);
    },
  },
} satisfies CardScript;
