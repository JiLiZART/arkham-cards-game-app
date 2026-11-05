// Breaking Through (v. II) (Return to Lost in Time and Space, agenda 3) — its forced horror is the scenario's
// `encounterMove`; back: Yog-Sothoth moves to The Edge of the Universe (or Another Dimension), Realms Beyond leaves the
// game with its text ignored (its investigators and enemies go to Another Dimension), and agenda 4a follows
import {
  type CardScript,
  def,
  emit,
  enemies,
  EVENT,
  flags,
  type GameContext,
  queue,
  removeLocation,
  setCardLocation,
} from "../../../../src/engine/api";
import {
  ANOTHER_DIMENSION,
  EDGE,
  inPlay,
  SHARED,
  YOG,
} from "../../../campaigns/the-dunwich-legacy/scripts/lost-in-time-and-space";
import {
  devourSeth,
  REALMS,
  REALMS_IGNORED,
} from "../../../campaigns/return-to-the-dunwich-legacy/scripts/return-to-lost-in-time-and-space";

export default {
  abilities: [{ kind: "revelation", run: "back" }],
  fns: {
    ...SHARED.fns,
    back(game: GameContext) {
      flags.setNamed(game, REALMS_IGNORED, true);
      const yog = enemies(game).find((e) => e.code === YOG);
      const to = inPlay(game, EDGE) ?? inPlay(game, ANOTHER_DIMENSION);
      if (yog && to && yog.location !== to) {
        const from = yog.location;
        setCardLocation(game, yog.id, to);
        emit(game, EVENT.EnemyMove, `${def(game, yog.id).name} moves to ${def(game, to).name}`, {
          card: yog.id,
          data: { from, to },
        });
        devourSeth(game);
      }
      const realms = inPlay(game, REALMS);
      if (realms) queue(game, removeLocation({ location: realms, outOfGame: true }));
    },
  },
} satisfies CardScript;
