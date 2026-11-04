// Mind Wipe — a non-Elite enemy at your location has a blank text box until the end of the phase
import {
  addTempMod,
  def,
  emit,
  enemiesAt,
  inv,
  isElite,
  type CardScript,
  type GameContext,
  EVENT,
  type ScriptRun,
} from "../../../../src/engine/api";

/** a modifier, as the engine takes it */
type Modifier = Parameters<typeof addTempMod>[1];

/** blank the text box of a non-Elite enemy at your location until the phase ends; `also` modifies it the same while */
export function wipe(game: GameContext, run: ScriptRun, also: Modifier[] = []) {
  const here = enemiesAt(game, inv(game, run.you).location).filter((e) => !isElite(game, e.id));
  if (!here.length) return;
  const pick = run.chooseCard(
    here.map((e) => e.id),
    { text: "Mind Wipe: choose an enemy", key: "chooseEnemy" },
  );
  for (const mod of [{ flag: "blankText" } as Modifier, ...also])
    addTempMod(game, mod, pick, "phase", run.ctx.source ?? null);
  emit(
    game,
    EVENT.Blank,
    `${def(game, pick).name}'s text box is blank until the end of the phase`,
    {
      card: pick,
    },
  );
}

export default {
  fns: {
    wipe(game: GameContext, run: ScriptRun) {
      wipe(game, run);
    },
  },
} satisfies CardScript;
