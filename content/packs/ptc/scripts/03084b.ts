// Whispers in Your Head (Dread) — hidden; you cannot move more than once each turn; [action][action]: discard it.
import {
  activeInvestigator,
  card,
  type CardScript,
  currentRound,
  flags,
  type GameContext,
  type InstId,
  type InvId,
  type ScriptRun,
} from "../../../../src/engine/api";

/** the turn under way: the round and whose turn (none outside the investigation phase's turns) */
const turnKey = (game: GameContext) =>
  `dread:${currentRound(game)}:${activeInvestigator(game) ?? ""}`;

export default {
  abilities: [
    { kind: "forced", trigger: "enterLocation", run: "moved" },
    {
      kind: "action",
      actionCost: 2,
      label: "Whispers in Your Head (Dread): discard it",
      effects: [{ op: "discardSelf" }],
    },
  ],
  modifiers(game: GameContext, cardId: InstId) {
    const holder = card(game, cardId).controller as InvId | null;
    return holder && flags.remembered.get(game, [turnKey(game), holder])
      ? [{ target: holder, mod: { flag: "cannotMove" as const } }]
      : [];
  },
  fns: {
    moved(game: GameContext, run: ScriptRun) {
      flags.remembered.set(game, [turnKey(game), run.you], true);
    },
  },
} satisfies CardScript;
