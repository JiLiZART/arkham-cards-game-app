// Historical Society, Museum Storage (Return to Echoes of the Past, Basement) — while a [[Cultist]] enemy is in play, it
// gets -3 shroud while you investigate it; a symbol or the auto-fail revealed during that investigation moves 1 clue
// from it to the [[Cultist]] enemy farthest from you (you choose among equals), before the test's effects.
import {
  addCounter,
  card,
  type CardScript,
  currentTest,
  def,
  distances,
  type EffCtx,
  emit,
  enemies,
  EVENT,
  type GameContext,
  inv,
  openWindow,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";

const cultists = (game: GameContext) =>
  enemies(game).filter((e) => def(game, e.id).traits.includes("Cultist"));
const investigating = (game: GameContext, loc: string | null | undefined) => {
  const t = currentTest(game);
  return !!loc && t?.kind === "investigate" && t.target === loc ? t : null;
};

export default {
  abilities: [
    {
      kind: "forced",
      trigger: "tokenRevealed",
      condition: {
        all: [
          { tokenIs: ["skull", "cultist", "tablet", "elderThing", "autoFail"] },
          { script: "storage" },
        ],
      },
      run: "toCultist",
    },
  ],
  conditions: {
    storage: (game: GameContext, ctx: EffCtx) =>
      !!investigating(game, ctx.source) && cultists(game).length > 0,
  },
  modifiers: (game: GameContext, id: string) =>
    investigating(game, id) && cultists(game).length
      ? [{ target: id, mod: { stat: "shroud", value: -3 } }]
      : [],
  fns: {
    toCultist(game: GameContext, run: ScriptRun) {
      const here = run.source;
      const t = currentTest(game);
      if (!t || !card(game, here).clues) return;
      const from = inv(game, t.inv).location;
      const dist = from ? distances(game, from) : new Map<string, number>();
      const far = (id: string) => dist.get(card(game, id).location ?? "") ?? -1;
      const all = cultists(game);
      const most = Math.max(...all.map((e) => far(e.id)));
      const pick = run.chooseCard(
        all.filter((e) => far(e.id) === most).map((e) => e.id),
        { text: "Move 1 clue to which Cultist enemy?", key: "museumStorageCultist" },
        { who: t.inv },
      );
      addCounter(game, here, "clues", -1);
      addCounter(game, pick, "clues", 1);
      emit(
        game,
        EVENT.Clues,
        `1 clue moves from ${def(game, here).name} to ${def(game, pick).name}`,
        {
          card: pick,
          data: { n: 1, placed: true },
        },
      );
      queue(game, openWindow("cluesPlaced", { card: pick, amount: 1 }));
    },
  },
} satisfies CardScript;
