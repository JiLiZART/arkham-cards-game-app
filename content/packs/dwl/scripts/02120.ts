// Shadows Deepen (The Miskatonic Museum, agenda 2) — as agenda 1: Shadow-spawned on the Horror as it enters play; back:
// doom on the Horror, or it spawns in the Museum Halls; the encounter discard pile shuffled in
import { type CardScript } from "../../../../src/engine/api";
import { empower, horrorEntersPlay, huntedBack } from "./02119";

export default {
  abilities: [horrorEntersPlay, { kind: "revelation", run: "back" }],
  fns: { empower, back: huntedBack },
} satisfies CardScript;
