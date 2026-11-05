// Swallowed Sky (Black Stars Rise, agenda 3c) — each [[Monster]] enemy gets +1 fight. Back (Die Unheard): R3.
import { type CardScript } from "../../../../src/engine/api";
import {
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
  monstersFight,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [ashleighAbility, { kind: "revelation", effects: [{ op: "resolution", id: "R3" }] }],
  conditions: { ashleighOffered },
  modifiers: monstersFight,
  fns: { ashleigh: ashleighsInformation },
} satisfies CardScript;
