// Uncovering the Conspiracy (Midnight Masks, act 1)
import { def, emit, push, type CardScript, type EffCtx, type G } from "../../../../src/engine/api";

export default {
  abilities: [
    {
      kind: "action",
      label: "Spend 2 clues per investigator: draw from the Cultist deck",
      usableBy: "anyone",
      cost: { cluesPerInvestigator: 2 },
      run: "drawCultist",
    },
    { kind: "revelation", effects: [{ op: "resolution", id: "R1" }] },
  ],
  fns: {
    drawCultist(g: G, ctx: EffCtx) {
      const id = g.s.sideDecks.cultists?.shift();
      if (!id) {
        emit(g, "empty", "The Cultist deck is empty");
        return;
      }
      emit(g, "encounter", `Drawn from the Cultist deck: ${def(g, id).name}`, { card: id });
      g.s.cards[id].zone = "limbo";
      push(g, { t: "Spawn", enemy: id, inv: ctx.you! });
    },
  },
} satisfies CardScript;
