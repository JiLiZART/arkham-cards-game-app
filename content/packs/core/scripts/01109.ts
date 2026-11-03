// The Barrier (The Gathering, act 2): at round end, investigators in the Hallway may spend 3 clues/investigator
import {
  addCounter,
  type CardScript,
  def,
  emit,
  findByCode,
  type GameContext,
  inv,
  leadInvestigator,
  moveCard,
  push,
  setController,
  turnOrder,
  EVENT,
  ZONE,
  CHOICE,
  STEP,
  type ScriptRun,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "roundEnds", run: "objective" },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    objective(game: GameContext, run: ScriptRun) {
      const hallway = findByCode(game, "01112", [ZONE.Location]);
      if (!hallway) return;
      const there = turnOrder(game).filter(
        (i) => inv(game, i).status === "playing" && inv(game, i).location === hallway.id,
      );
      const need = 3 * turnOrder(game).length;
      const have = there.reduce((n, i) => n + inv(game, i).clues, 0);
      if (have < need) return;
      const yes = run.choose<boolean>(
        [
          { id: "yes", label: `Spend ${need} clues and advance`, value: true },
          { id: "no", label: "Not now", value: false },
        ],
        {
          text: `The Barrier: spend ${need} clues (investigators in the Hallway) to advance?`,
          key: "barrier",
          vars: { n: need },
        },
        { auto: false, kind: CHOICE.Generic, who: leadInvestigator(game) },
      );
      if (!yes) return;
      let n = need;
      for (const i of there) {
        const take = Math.min(n, inv(game, i).clues);
        addCounter(game, i, "clues", -take);
        n -= take;
      }
      push(game, { t: STEP.AdvanceAct });
    },
    back(game: GameContext) {
      const parlor = findByCode(game, "01115", [ZONE.Location])!;
      const hallway = findByCode(game, "01112", [ZONE.Location])!;
      push(game, {
        t: STEP.Script,
        code: "__engine",
        fn: "revealLocation",
        ctx: { location: parlor.id },
      });
      const lita = findByCode(game, "01117", [ZONE.SetAside]);
      if (lita) {
        moveCard(game, lita.id, ZONE.Attached, { location: parlor.id });
        setController(game, lita.id, null);
        emit(game, EVENT.Lita, `Lita Chantler is in the ${def(game, parlor.id).name}`, {
          card: lita.id,
        });
      }
      const priest = findByCode(game, "01116", [ZONE.SetAside]);
      if (priest) push(game, { t: STEP.Spawn, enemy: priest.id, inv: null, at: hallway.id });
    },
  },
} satisfies CardScript;
