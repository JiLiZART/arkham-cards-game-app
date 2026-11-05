// Dark Bidding (Return to The Miskatonic Museum) — attached to the Hunting Horror wherever it is (the encounter deck, its
// discard pile, the void or play), and it stays on it into the void (movement keeps a void-bound card's attachments);
// when the Horror attacks, the attack deals 1 more damage and 1 more horror, the Horror heals 2 damage and Dark Bidding
// is discarded (max once per attack, however many are attached)
import {
  addCounter,
  attachTo,
  card,
  type CardScript,
  def,
  discard,
  emit,
  EVENT,
  findByCode,
  flags,
  type GameContext,
  moveCard,
  type ScriptRun,
  ZONE,
} from "../../../../src/engine/api";
import { HORROR } from "../../dwl/scripts/02141";

export default {
  abilities: [
    { kind: "revelation", run: "bid" },
    { kind: "forced", trigger: "enemyAttacks", run: "attack" },
  ],
  fns: {
    bid(game: GameContext, run: ScriptRun) {
      const h = findByCode(game, HORROR, [
        ZONE.Enemy,
        ZONE.EncounterDeck,
        ZONE.EncounterDiscard,
        ZONE.Void,
      ]);
      if (!h) return;
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, h.id);
      emit(game, EVENT.Attach, `Dark Bidding is attached to ${def(game, h.id).name}`, {
        card: run.source,
      });
    },
    attack(game: GameContext, run: ScriptRun) {
      const key = String(run.ctx.key);
      const once = `darkBidding:${key}`;
      if (flags.named(game, once)) return;
      flags.setNamed(game, once, true);
      const h = card(game, run.source).attachedTo;
      flags.attackBonus.add(game, key, 1);
      if (h) addCounter(game, h, "damage", -Math.min(2, card(game, h).damage));
      emit(
        game,
        EVENT.Place,
        "Dark Bidding: +1 damage and +1 horror, Hunting Horror heals 2 damage",
        {
          card: run.source,
        },
      );
      discard(game, run.source);
    },
  },
} satisfies CardScript;
