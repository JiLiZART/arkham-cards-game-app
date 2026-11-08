// The Stranger (Curtain Call, act 2, three versions) — objective: when The Man in the Pallid Mask would be discarded
// from play, advance (the scenario's script replaces his defeat). Back: instead of discarding him, he moves to the
// Lobby; 2 tokens of the version's symbol for the rest of the campaign; horror on a location and what horror means
// until the end of the scenario (A City Aflame: flames; The Path is Mine: ooze; The Shores of Hali: flood). Return to
// Curtain Call's three more versions (52015–52017) are here too: two different tokens each, horror on a named location
// (Alaran Mists: mists; Under the City: overgrowth; Here Is My Reply: screeching). The campaign learns which version
// was advanced from its two tokens, recorded for the campaign: each version's pair is its own.
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
  BACKSTAGE,
  BALCONY,
  horrorOn,
  LOBBY,
  THEATRE,
} from "../../../campaigns/the-path-to-carcosa/scripts/curtain-call";
import { MITPM } from "./03059";

type Token = "cultist" | "tablet" | "elderThing";
const KINDS = ["flames", "ooze", "flood", "mists", "overgrowth", "screeching"] as const;
/** the two tokens (the version's own pair) and what horror becomes */
type Version = { tokens: [Token, Token]; kind: (typeof KINDS)[number] };
export const VERSIONS: Record<string, Version> = {
  "03047a": { tokens: ["cultist", "cultist"], kind: "flames" },
  "03047b": { tokens: ["tablet", "tablet"], kind: "ooze" },
  "03047c": { tokens: ["elderThing", "elderThing"], kind: "flood" },
  "52015": { tokens: ["cultist", "tablet"], kind: "mists" },
  "52016": { tokens: ["cultist", "elderThing"], kind: "overgrowth" },
  "52017": { tokens: ["tablet", "elderThing"], kind: "screeching" },
};
/** where the new versions place their 1 horror */
const HORROR_ON: Partial<Record<Version["kind"], string>> = {
  flames: THEATRE,
  mists: BACKSTAGE,
  overgrowth: BALCONY,
  screeching: LOBBY,
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
      queue(
        game,
        resolveEffect({
          effect: { op: "addChaosTokens", tokens: v.tokens, forCampaign: true },
          ctx: run.ctx,
        }),
      );
      const named = HORROR_ON[v.kind];
      const on = named
        ? [findByCode(game, named, [ZONE.Location])?.id]
        : v.kind === "ooze"
          ? [from]
          : locations(game)
              .filter((l) => def(game, l.id).traits.includes("Private"))
              .map((l) => l.id);
      for (const loc of on) if (loc) horrorOn(game, loc);
    },
  },
});

/** which spreading horror this game has: flames, ooze, flood, mists, overgrowth or screeching (none before act 2's back) */
export const spreading = (game: GameContext): Version["kind"] | undefined =>
  KINDS.find((k) => flags.named(game, `ccSpreading:${k}`));

export default stranger("03047a") satisfies CardScript;
