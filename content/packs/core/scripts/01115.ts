// Parlor — unrevealed side: you cannot move into the Parlor
import { card, type CardScript, type G, type InstId } from "../../../../src/engine/api";

export default {
  modifiers(g: G, id: InstId) {
    return card(g, id).zone === "location" && !card(g, id).revealed ? [{ target: id, mod: { flag: "cannotMoveInto" as const } }] : [];
  },
} satisfies CardScript;
