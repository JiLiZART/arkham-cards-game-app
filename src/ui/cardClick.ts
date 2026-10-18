import { useMemo } from "react";
import type { ChoiceOption, GameState, InstId } from "../engine/types";
import { useGame } from "./context";
import { useChoicesOffered } from "./usePlayers";
import { useView } from "./view";

/** pending options by card, empty while animating */
export function useOptionsByCard(): Map<InstId, ChoiceOption[]> {
  const game = useGame((s) => s.game) as GameState;
  const busy = useGame((s) => !!s.current || s.queue.length > 0);
  const offered = useChoicesOffered();
  return useMemo(() => {
    const m = new Map<InstId, ChoiceOption[]>();
    if (!game.pending || busy || !offered) return m;
    for (const o of game.pending.options) if (o.card) m.set(o.card, [...(m.get(o.card) ?? []), o]);
    return m;
  }, [game.pending, busy, offered]);
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
