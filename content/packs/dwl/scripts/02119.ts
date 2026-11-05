// Restricted Access (The Miskatonic Museum, agenda 1) — when Hunting Horror enters play, Shadow-spawned goes on it (or
// gains a resource); back: 1 doom on the Horror, or it is found and spawns in the Museum Halls; the encounter discard
// pile is shuffled in. Agenda 2 (02120) is the same card; agenda 3 (02121) shares the forced ability
import {
  addCounter,
  attachTo,
  card,
  type CardScript,
  def,
  emit,
  type EffCtx,
  findByCode,
  type GameContext,
  type InstId,
  moveCard,
  reshuffleDiscard,
  EVENT,
  ZONE,
  type ScriptRun,
} from "../../../../src/engine/api";
import { doomOnHorror, HORROR, spawnHorror } from "./02141";

const SHADOW_SPAWNED = "02142";

/** "Attach the set-aside copy of Shadow-spawned to it, or add 1 resource to Shadow-spawned if it is already attached" */
export function empowerHorror(game: GameContext, horror: InstId) {
  const on = findByCode(game, SHADOW_SPAWNED, [ZONE.Attached]);
  if (on && card(game, on.id).attachedTo === horror) {
    addCounter(game, on.id, "resources", 1);
    emit(game, EVENT.Place, `Shadow-spawned gains 1 resource`, { card: on.id });
    return;
  }
  const aside = findByCode(game, SHADOW_SPAWNED, [ZONE.SetAside]);
  if (!aside) return;
  moveCard(game, aside.id, ZONE.Attached);
  attachTo(game, aside.id, horror);
  emit(game, EVENT.Attach, `Shadow-spawned is attached to ${def(game, horror).name}`, {
    card: aside.id,
  });
}

/** the agendas' forced ability, by the Horror's spawn */
export const horrorEntersPlay = {
  kind: "forced" as const,
  trigger: "enemySpawns" as const,
  condition: { eventEnemy: { code: HORROR } },
  run: "empower",
};

/** agendas 1 and 2's back */
export function huntedBack(game: GameContext, run: ScriptRun) {
  if (!doomOnHorror(game, run)) {
    const halls = findByCode(game, "02127", [ZONE.Location]);
    if (halls) spawnHorror(game, { at: halls.id });
  }
  reshuffleDiscard(game, "encounter");
  emit(game, EVENT.Reshuffle, "The encounter discard pile is shuffled into the encounter deck");
}

export const empower = (game: GameContext, run: ScriptRun) => {
  const ctx: EffCtx = run.ctx;
  if (ctx.enemy) empowerHorror(game, ctx.enemy);
};

export default {
  abilities: [horrorEntersPlay, { kind: "revelation", run: "back" }],
  fns: { empower, back: huntedBack },
} satisfies CardScript;
