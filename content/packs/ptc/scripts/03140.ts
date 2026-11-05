// Possessed Oathspeaker — Hunter. Retaliate. Cannot be damaged during act 1 or act 2. At the beginning of the enemy
// phase the investigators (the lead for them) ready it or place 1 doom on it. Objective: defeated, (→R3).
import {
  card,
  cardIf,
  type CardScript,
  currentAct,
  def,
  emit,
  type GameContext,
  type InstId,
  ready,
  EVENT,
  type ScriptRun,
  queue,
  placeDoom,
} from "../../../../src/engine/api";

const EARLY_ACTS = ["03124", "03125"];

export default {
  abilities: [
    { kind: "forced", trigger: "phaseBegins", condition: { phase: "enemy" }, run: "readyOrDoom" },
    { kind: "forced", trigger: "enemyDefeatedSelf", effects: [{ op: "resolution", id: "R3" }] },
  ],
  modifiers(game: GameContext, cardId: InstId) {
    return EARLY_ACTS.includes(cardIf(game, currentAct(game))?.code ?? "")
      ? [{ target: cardId, mod: { flag: "cannotBeDamaged" as const } }]
      : [];
  },
  fns: {
    readyOrDoom(game: GameContext, run: ScriptRun) {
      const me = card(game, run.source);
      const how = run.choose<string>(
        [
          ...(me.exhausted
            ? [
                {
                  id: "ready",
                  label: "Ready Possessed Oathspeaker",
                  value: "ready",
                  key: "option.eotpReadyOathspeaker",
                },
              ]
            : []),
          {
            id: "doom",
            label: "Place 1 doom on Possessed Oathspeaker",
            value: "doom",
            key: "option.eotpDoomOathspeaker",
          },
        ],
        { text: "The investigators must decide", key: "eotpOathspeaker" },
        { who: run.you, auto: false },
      );
      if (how === "ready") {
        ready(game, me.id);
        emit(game, EVENT.Ready, `${def(game, me.id).name} readies`, { card: me.id });
        return;
      }
      queue(game, placeDoom({ card: me.id, n: 1 }));
    },
  },
} satisfies CardScript;
