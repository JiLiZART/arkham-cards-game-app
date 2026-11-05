// The Stranger (Curtain Call, act 2, three versions) — objective: when The Man in the Pallid Mask would be discarded
// from play, advance (the scenario's script replaces his defeat). Back: instead of discarding him, he moves to the
// Lobby; 2 tokens of the version's symbol for the rest of the campaign; horror on a location and what horror means
// until the end of the scenario (A City Aflame: flames; The Path is Mine: ooze; The Shores of Hali: flood).
import {
  type CardScript,
  def,
  emit,
  enemies,
  findByCode,
  flags,
  type GameContext,
  locations,
  setCardLocation,
  EVENT,
  ZONE,
  type ScriptRun,
  queue,
  resolveEffect,
} from "../../../../src/engine/api";
import {
  horrorOn,
  LOBBY,
  THEATRE,
} from "../../../campaigns/the-path-to-carcosa/scripts/curtain-call";
import { MITPM } from "./03059";

type Version = { token: "cultist" | "tablet" | "elderThing"; kind: "flames" | "ooze" | "flood" };
export const VERSIONS: Record<string, Version> = {
  "03047a": { token: "cultist", kind: "flames" },
  "03047b": { token: "tablet", kind: "ooze" },
  "03047c": { token: "elderThing", kind: "flood" },
};

/** the act 2 back of a version */
export const stranger = (code: string): CardScript => ({
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    back(game: GameContext, run: ScriptRun) {
      const v = VERSIONS[code];
      const him = enemies(game).find((e) => e.code === MITPM);
      const from = him?.location ?? null;
      const lobby = findByCode(game, LOBBY, [ZONE.Location]);
      if (him && lobby) {
        setCardLocation(game, him.id, lobby.id);
        emit(game, EVENT.EnemyMove, `${def(game, him.id).name} moves to the Lobby`, {
          card: him.id,
          data: { to: lobby.id },
        });
      }
      flags.setNamed(game, `ccSpreading:${v.kind}`, true);
      flags.logEntry.set(game, ["hidden", "ccaAddChaosToken"], true);
      queue(
        game,
        resolveEffect({
          effect: { op: "addChaosTokens", tokens: [v.token, v.token], forCampaign: true },
          ctx: run.ctx,
        }),
      );
      const on =
        v.kind === "flames"
          ? [findByCode(game, THEATRE, [ZONE.Location])?.id]
          : v.kind === "ooze"
            ? [from]
            : locations(game)
                .filter((l) => def(game, l.id).traits.includes("Private"))
                .map((l) => l.id);
      for (const loc of on) if (loc) horrorOn(game, loc);
    },
  },
});

/** which spreading horror this game has: flames, ooze or flood (none before act 2's back) */
export const spreading = (game: GameContext): Version["kind"] | undefined =>
  (["flames", "ooze", "flood"] as const).find((k) => flags.named(game, `ccSpreading:${k}`));

export default stranger("03047a") satisfies CardScript;
