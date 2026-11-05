// The Creatures' Tracks — peril; take 2 horror, or a set-aside Brood of Yog-Sothoth spawns at a random location (only
// while one is set aside)
import {
  type CardScript,
  dealDamage,
  type GameContext,
  queue,
  type ScriptRun,
} from "../../../../src/engine/api";
import {
  atRandom,
  broodsAside,
} from "../../../campaigns/the-dunwich-legacy/scripts/undimensioned-and-unseen";

export default {
  abilities: [{ kind: "revelation", run: "tracks" }],
  fns: {
    tracks(game: GameContext, run: ScriptRun) {
      const spawn = broodsAside(game).length
        ? run.choose<boolean>(
            [
              { id: "horror", label: "Take 2 horror", value: false, key: "option.take2Horror" },
              {
                id: "spawn",
                label: "A set-aside Brood of Yog-Sothoth spawns at a random location",
                value: true,
                key: "option.spawnBrood",
              },
            ],
            { text: "The Creatures' Tracks: choose one", key: "creaturesTracks" },
            { auto: false },
          )
        : false;
      queue(
        game,
        spawn
          ? atRandom(game, "uauSpawnBrood")
          : dealDamage({ inv: run.you, damage: 0, horror: 2, direct: false, source: run.source }),
      );
    },
  },
} satisfies CardScript;
