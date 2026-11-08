// Party Guest (Return to The Last King, an asset in the encounter deck) — Revelation: put into play at the location of
// the Bystander with the most clues (the lead chooses among equals). Investigators cannot parley with the Bystanders at
// its location. [action] Spend 2 resources: Parley: it moves to a connecting location.
import {
  allCards,
  card,
  type CardScript,
  connections,
  def,
  emit,
  EVENT,
  type GameContext,
  moveCard,
  type ScriptRun,
  setCardLocation,
  setController,
  ZONE,
} from "../../../../src/engine/api";
import { bystanders } from "../../../campaigns/the-path-to-carcosa/scripts/the-last-king";

export default {
  abilities: [
    { kind: "revelation", run: "arrive" },
    {
      kind: "action",
      designator: "parley",
      usableBy: "atLocation",
      label: "Party Guest: spend 2 resources to move it to a connecting location",
      cost: { resources: 2 },
      run: "shoo",
    },
  ],
  modifiers: (game: GameContext, id: string) => {
    const at = card(game, id).location;
    if (!at) return [];
    return allCards(game)
      .filter(
        (c) =>
          c.zone === ZONE.Attached &&
          c.location === at &&
          def(game, c.id).type === "asset" &&
          def(game, c.id).traits.includes("Bystander"),
      )
      .map((c) => ({ target: c.id, mod: { flag: "cannotBeParleyed" as const } }));
  },
  fns: {
    arrive(game: GameContext, run: ScriptRun) {
      const all = bystanders(game);
      const most = Math.max(...all.map((b) => b.clues));
      const pool = all.filter((b) => b.clues === most);
      if (!pool.length) return;
      const b = run.chooseCard(
        pool.map((x) => x.id),
        {
          text: "Party Guest enters play at which Bystander's location?",
          key: "partyGuestArrives",
        },
        { who: run.you },
      );
      const at = pool.find((x) => x.id === b)?.location;
      if (!at) return;
      moveCard(game, run.source, ZONE.Attached, { location: at });
      setController(game, run.source, null);
      emit(game, EVENT.Place, `${def(game, run.source).name} is at ${def(game, at).name}`, {
        card: run.source,
      });
    },
    shoo(game: GameContext, run: ScriptRun) {
      const at = card(game, run.source).location;
      const to = at ? connections(game, at) : [];
      if (!to.length) return;
      const where = run.chooseCard(to, {
        text: "Move Party Guest to which connecting location?",
        key: "partyGuestMove",
      });
      setCardLocation(game, run.source, where);
      emit(game, EVENT.Place, `${def(game, run.source).name} moves to ${def(game, where).name}`, {
        card: run.source,
        data: { to: where },
      });
    },
  },
} satisfies CardScript;
