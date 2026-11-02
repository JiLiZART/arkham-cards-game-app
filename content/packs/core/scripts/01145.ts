// Vengeance Awaits (Devourer Below, agenda 3)
import {
  type CardScript,
  currentAct,
  discard,
  emit,
  enemiesAt,
  findByCode,
  flags,
  type GameContext,
  moveCard,
  pile,
  push,
  EVENT,
  ZONE,
  STEP,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "agendaAdvances", run: "umordhoth" },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    umordhoth(game: GameContext) {
      let site = findByCode(game, "01156", [ZONE.Location]);
      if (!site) {
        const aside = findByCode(game, "01156", [ZONE.SetAside]);
        if (aside) moveCard(game, aside.id, ZONE.Location);
        site = aside;
      } else for (const e of enemiesAt(game, site.id)) discard(game, e.id);
      const u = findByCode(game, "01157", [ZONE.SetAside]);
      if (u && site) push(game, { t: STEP.Spawn, enemy: u.id, inv: null, at: site.id });
    },
    back(game: GameContext) {
      // The Devourer Below becomes both act and agenda: only defeating Umôrdhoth (→R2) remains
      if (currentAct(game)) moveCard(game, currentAct(game)!, ZONE.Removed);
      for (const id of [...pile(game, ZONE.ActDeck), ...pile(game, ZONE.AgendaDeck)])
        moveCard(game, id, ZONE.Removed);
      flags.devourer.set(game, true);
      emit(game, EVENT.Devourer, `The Devourer Below: defeat Umôrdhoth!`, {
        card: findByCode(game, "01157")?.id ?? null,
      });
    },
  },
} satisfies CardScript;
