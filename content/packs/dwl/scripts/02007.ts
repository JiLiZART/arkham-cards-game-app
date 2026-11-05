// Smite the Wicked — it rides on an enemy from the encounter deck, spawned at the location farthest from Zoey; if that
// enemy is still in play when the game ends, she suffers 1 mental trauma
import {
  addCounter,
  attachTo,
  card,
  type CardScript,
  def,
  distances,
  emit,
  EVENT,
  type GameContext,
  type HookRun,
  inv,
  locations,
  moveCard,
  pile,
  queue,
  reshuffleDiscard,
  type ScriptRun,
  spawn,
  ZONE,
} from "../../../../src/engine/api";

export default {
  abilities: [{ kind: "revelation", run: "smite" }],
  fns: {
    smite(game: GameContext, run: ScriptRun) {
      // where it will spawn is chosen first: what follows changes the game
      const from = inv(game, run.you).location;
      const d = from ? distances(game, from) : new Map<string, number>();
      const far = Math.max(-1, ...locations(game).map((l) => d.get(l.id) ?? -1));
      const at = run.chooseCard(
        locations(game)
          .filter((l) => (d.get(l.id) ?? -1) === far)
          .map((l) => l.id),
        { text: "Choose the location farthest from you", key: "farthestLocation" },
      );
      let enemy: string | undefined;
      for (let k = 0; !enemy && k < 2; k++) {
        // ponytail: one reshuffle of the discard pile when the deck runs out; nothing more if there is no enemy at all
        if (k === 1) reshuffleDiscard(game, "encounter");
        while (!enemy && pile(game, ZONE.EncounterDeck).length) {
          const id = pile(game, ZONE.EncounterDeck)[0];
          if (def(game, id).type === "enemy") enemy = id;
          moveCard(game, id, enemy ? ZONE.Limbo : ZONE.EncounterDiscard);
        }
      }
      if (!enemy) return;
      moveCard(game, run.source, ZONE.Attached);
      attachTo(game, run.source, enemy);
      emit(game, EVENT.Attach, `Smite the Wicked is attached to ${def(game, enemy).name}`, {
        card: run.source,
      });
      queue(game, spawn({ enemy, inv: null, at }));
    },
  },
  hooks: {
    gameEnd(game: GameContext, run: HookRun) {
      const c = card(game, run.source);
      const host = c.attachedTo ? card(game, c.attachedTo) : undefined;
      if (host?.zone === ZONE.Enemy && c.owner) addCounter(game, c.owner, "mentalTrauma", 1);
    },
  },
} satisfies CardScript;
