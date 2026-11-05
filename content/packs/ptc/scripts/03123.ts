// Secrets Better Left Hidden (Echoes of the Past, agenda 3) — front as agenda 1's. Back: (→R4).
import { type CardScript } from "../../../../src/engine/api";
import { echoesAgenda } from "./03121";

export default echoesAgenda([
  { kind: "revelation", effects: [{ op: "resolution", id: "R4" }] },
]) satisfies CardScript;
