// Vengeance Awaits (Devourer Below, agenda 3)
import {
  type CardScript,
  currentAct,
  discard,
  emit,
  enemiesAt,
  findByCode,
  flags,
  type G,
  moveCard,
  pile,
  push,
} from "../../../../src/engine/api";

export default {
  abilities: [
    { kind: "forced", trigger: "agendaAdvances", run: "umordhoth" },
    { kind: "revelation", run: "back" },
  ],
  fns: {
    umordhoth(g: G) {
      let site = findByCode(g, "01156", ["location"]);
      if (!site) {
        const aside = findByCode(g, "01156", ["setAside"]);
        if (aside) moveCard(g, aside.id, "location");
        site = aside;
      } else for (const e of enemiesAt(g, site.id)) discard(g, e.id);
      const u = findByCode(g, "01157", ["setAside"]);
      if (u && site) push(g, { t: "Spawn", enemy: u.id, inv: null, at: site.id });
    },
    back(g: G) {
      // The Devourer Below becomes both act and agenda: only defeating Umôrdhoth (→R2) remains
      if (currentAct(g)) moveCard(g, currentAct(g)!, "removed");
      for (const id of [...pile(g, "actDeck"), ...pile(g, "agendaDeck")])
        moveCard(g, id, "removed");
      flags.devourer.set(g, true);
      emit(g, "devourer", `The Devourer Below: defeat Umôrdhoth!`, {
        card: findByCode(g, "01157")?.id ?? null,
      });
    },
  },
} satisfies CardScript;
