// Lobby (Curtain Call) — revealed: 2 of the set-aside Lobby Doorways into play, at random; [action][action]: draw 3
// cards; on act 3, while The Man in the Pallid Mask is not in play: [action] resign.
import {
  allCards,
  cardIf,
  type CardScript,
  currentAct,
  def,
  emit,
  enemies,
  type GameContext,
  moveCard,
  shuffleList,
  EVENT,
  ZONE,
} from "../../../../src/engine/api";
import { ACT_3 } from "../../../campaigns/the-path-to-carcosa/scripts/curtain-call";
import { MITPM } from "./03059";

/** `n` of these set-aside doorways into play, at random */
export function doorways(game: GameContext, codes: string[], n = 2) {
  const aside = allCards(game).filter((c) => c.zone === ZONE.SetAside && codes.includes(c.code));
  shuffleList(game, aside);
  for (const d of aside.slice(0, n)) {
    moveCard(game, d.id, ZONE.Location);
    emit(game, EVENT.Location, `${def(game, d.id).name} is put into play`, { card: d.id });
  }
}

export default {
  abilities: [
    { kind: "forced", trigger: "revealed", run: "doorways" },
    {
      kind: "action",
      actionCost: 2,
      label: "Lobby: draw 3 cards",
      effects: [{ op: "drawCards", amount: 3 }],
    },
    {
      kind: "action",
      designator: "resign",
      label: "Lobby: resign",
      condition: { script: "canResign" },
      effects: [{ op: "resign" }],
    },
  ],
  conditions: {
    canResign: (game: GameContext) =>
      cardIf(game, currentAct(game))?.code === ACT_3 &&
      !enemies(game).some((e) => e.code === MITPM),
  },
  fns: {
    doorways(game: GameContext) {
      doorways(game, ["03053", "03054", "03055"]);
    },
  },
} satisfies CardScript;
