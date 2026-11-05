// Aquinnah (level 3) — as the core Aquinnah: the attack's damage goes to another enemy at your location instead (its
// horror is still taken); the reaction is in cards.json
import type { CardScript } from "../../../../src/engine/api";
import aquinnah from "../../core/scripts/01082";

export default { fns: aquinnah.fns } satisfies CardScript;
