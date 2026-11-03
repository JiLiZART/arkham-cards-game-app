// Fire! — attaches to the nearest location without one; burns each non-Elite card with health there when the investigation phase ends
import {
  addCounter,
  ask,
  card,
  cardIf,
  type CardScript,
  cardsIn,
  currentPhase,
  def,
  distances,
  emit,
  type GameContext,
  type InstId,
  inv,
  type InvId,
  invsAt,
  isElite,
  locations,
  moveCard,
  pile,
  EVENT,
  ZONE,
  CHOICE,
  type ScriptRun,
  queue,
  resolveRevelation,
  dealDamage,
  checkAssetDefeat,
  damageEnemy,
} from "../../../../src/engine/api";

const FIRE = "12129";
const burning = (game: GameContext, loc: InstId) =>
  cardsIn(game, ZONE.Attached).some((c) => c.code === FIRE && c.location === loc);

/** the investigator draws the topmost Fire! of the encounter discard pile, if there is one */
export function drawFire(game: GameContext, who: InvId) {
  const id = [...pile(game, ZONE.EncounterDiscard)]
    .reverse()
    .find((x) => card(game, x).code === FIRE);
  if (!id) return;
  moveCard(game, id, ZONE.Limbo);
  emit(game, EVENT.Encounter, `${inv(game, who).name} draws Fire!`, { inv: who, card: id });
  queue(game, resolveRevelation({ inv: who, card: id }));
}

/** attach a Fire! to the nearest location (from `from`) without one */
export function attachFire(
  game: GameContext,
  fire: InstId,
  from: InstId | null,
  step: ScriptRun["step"],
  chooser: InvId,
) {
  let cands = locations(game).filter((l) => !burning(game, l.id));
  if (!cands.length) {
    moveCard(game, fire, ZONE.EncounterDiscard);
    return true;
  }
  if (from) {
    const d = distances(game, from);
    const best = Math.min(...cands.map((l) => d.get(l.id) ?? Infinity));
    cands = cands.filter((l) => (d.get(l.id) ?? Infinity) === best);
  }
  const at = ask<InstId>(
    game,
    step,
    chooser,
    CHOICE.Target,
    "Attach Fire! to:",
    cands.map((l) => ({ id: l.id, label: def(game, l.id).name, card: l.id, value: l.id })),
    { auto: true, key: "attach", vars: { card: fire } },
  );
  if (at === undefined) return false;
  moveCard(game, fire, ZONE.Attached, { location: at });
  emit(game, EVENT.Attach, `Fire! is attached to ${def(game, at).name}`, { card: fire });
  return true;
}

export default {
  abilities: [{ kind: "revelation", run: "attach" }],
  fns: {
    attach(game: GameContext, run: ScriptRun) {
      attachFire(game, run.source, inv(game, run.you).location, run.step, run.you);
    },
    burn(game: GameContext, run: ScriptRun) {
      if (currentPhase(game) !== "investigation") return;
      const loc = cardIf(game, run.source)?.location;
      if (!loc) return;
      for (const i of invsAt(game, loc)) {
        queue(game, dealDamage({ inv: i, damage: 1, horror: 0, direct: true, source: run.source }));
        for (const a of cardsIn(game, ZONE.Play))
          if (a.controller === i && (def(game, a.id).health ?? 0) > 0)
            addCounter(game, a.id, "damage", 1);
        queue(game, checkAssetDefeat(i));
      }
      for (const e of cardsIn(game, ZONE.Enemy))
        if (e.location === loc && !isElite(game, e.id))
          queue(game, damageEnemy({ enemy: e.id, amount: 1, by: null, source: run.source }));
    },
  },
} satisfies CardScript;
