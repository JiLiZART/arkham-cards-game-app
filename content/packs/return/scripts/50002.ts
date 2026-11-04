// Dynamite Blast (level 2) — as the core Dynamite Blast; this action does not provoke attacks of opportunity
import type { CardScript } from "../../../../src/engine/api";
import blast from "../../core/scripts/01024";

export default {
  abilities: [{ kind: "onPlay", aoo: false, run: "blast" }],
  fns: blast.fns,
} satisfies CardScript;
