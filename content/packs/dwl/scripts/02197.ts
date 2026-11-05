// The Old Ones Hunger (Blood on the Altar, agenda 2) — back: if there are 2 or more potential sacrifices, one of them at
// random goes underneath the agenda deck, unseen
import type { CardScript } from "../../../../src/engine/api";
import { sacrificeIfAtLeast } from "./02196";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: { back: sacrificeIfAtLeast(2) },
} satisfies CardScript;
