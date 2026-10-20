// Dynamite Blast (level 3) — as the core Dynamite Blast, playable during any fast window
import type { CardScript } from "../../../../src/engine/api";
import blast from "../../core/scripts/01024";

export default { abilities: [{ kind: "onPlay", anyWindow: true, run: "blast" }], fns: blast.fns } satisfies CardScript;
