import { useMemo } from "react";
import type { ChoiceOption, GameState, InstId } from "../engine/types";
import { useGame } from "./context";
import { handVisible } from "./scene/Table";
import { viewerOf } from "./store";
import { useView } from "./view";

/** pending options by card, empty while animating or behind the hand-off screen */
export function useOptionsByCard(): Map<InstId, ChoiceOption[]> {
  const game = useGame((s) => s.game) as GameState;
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const privacy = useGame((s) => s.privacy);
  const revealedFor = useGame((s) => s.revealedFor);
  const visible = handVisible(privacy, game.order.length, viewerOf(game), revealedFor);
  return useMemo(() => {
    const m = new Map<InstId, ChoiceOption[]>();
    if (!game.pending || busy || !visible) return m;
    for (const o of game.pending.options) if (o.card) m.set(o.card, [...(m.get(o.card) ?? []), o]);
    return m;
  }, [game.pending, busy, visible]);
}

/** clicking a card anywhere (map or play strip): its one option is chosen, several open a menu */
export function useCardClick() {
  const byCard = useOptionsByCard();
  const choose = useGame((s) => s.choose);
  const click = (id: InstId, x: number, y: number) => {
    const opts = byCard.get(id);
    if (!opts?.length) return;
    if (opts.length === 1) choose(opts[0].id);
    else useView.getState().openMenu(x, y, opts);
  };
  return { byCard, click };
}
