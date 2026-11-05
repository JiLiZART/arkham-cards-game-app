// The City Floods (Black Stars Rise, agenda 3a) — each copy of Ancient Evils gains surge. Back (Die Unheard): R3.
import { type CardScript } from "../../../../src/engine/api";
import {
  ancientEvilsSurge,
  ashleighAbility,
  ashleighOffered,
  ashleighsInformation,
} from "../../../campaigns/the-path-to-carcosa/scripts/black-stars-rise";

export default {
  abilities: [ashleighAbility, { kind: "revelation", effects: [{ op: "resolution", id: "R3" }] }],
  conditions: { ashleighOffered },
  modifiers: ancientEvilsSurge,
  fns: { ashleigh: ashleighsInformation },
} satisfies CardScript;
