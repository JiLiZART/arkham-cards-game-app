// Lola Hayes — after her opening hand she chooses a role; she plays, commits and uses only Neutral cards and cards of
// her role (the engine's `offRole`); a fast ability (once per round) and her elder sign switch it (cards.json)
import {
  type CardScript,
  emit,
  EVENT,
  flags,
  type GameContext,
  inv,
  type ScriptRun,
} from "../../../../src/engine/api";

const ROLES = ["survivor", "guardian", "seeker", "rogue", "mystic", "neutral"];

/** choose a role (other than the current one, when switching); `keep`: she may keep hers */
function chooseRole(game: GameContext, run: ScriptRun, switching: boolean, keep: boolean) {
  const now = flags.role.get(game, run.you);
  const roles = ROLES.filter((r) => !switching || r !== now);
  const pick = run.choose<string>(
    [
      ...roles.map((r) => ({ id: r, label: r, value: r, key: `card.faction.${r}` })),
      ...(keep
        ? [{ id: "keep", label: "Keep your role", value: "keep", key: "option.keepRole" }]
        : []),
    ],
    { text: "Choose a role", key: "lolaRole" },
    { auto: false },
  );
  if (pick === "keep") return;
  flags.role.set(game, run.you, pick);
  emit(game, EVENT.Place, `${inv(game, run.you).name}'s role is now ${pick}`, {
    inv: run.you,
    data: { role: pick },
  });
}

export default {
  openingHand: { fn: "chooseRole" },
  fns: {
    chooseRole(game: GameContext, run: ScriptRun) {
      chooseRole(game, run, false, false);
    },
    switchRole(game: GameContext, run: ScriptRun) {
      chooseRole(game, run, true, false);
    },
    maySwitchRole(game: GameContext, run: ScriptRun) {
      chooseRole(game, run, true, true);
    },
  },
} satisfies CardScript;
