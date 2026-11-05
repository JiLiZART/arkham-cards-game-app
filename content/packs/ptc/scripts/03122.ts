// Ransacking the Manor (Echoes of the Past, agenda 2) — front as agenda 1's. Back: the Possessed Oathspeaker spawns at
// the Entry Hall, and Sebastien Moreau with it unless he was slain (then he was never set aside).
import { type CardScript } from "../../../../src/engine/api";
import { echoesAgenda } from "./03121";

export default echoesAgenda([
  {
    kind: "revelation",
    effects: [
      { op: "spawnSetAside", code: "03140", at: "Entry Hall" },
      { op: "spawnSetAside", code: "03068b", at: "Entry Hall" },
    ],
  },
]) satisfies CardScript;
