import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { campaignLoaded, content, loadCampaign, loadPack, packsOf } from "../../content/index";
import { packLoaded } from "../../content/loader";
import { campaignSpriteLoaded, loadCampaignSprite } from "../assets/icons";
import { trackArrivals } from "../game/arrivals";
import { trackIntro } from "../game/intro";
import { trackShowcase } from "../game/showcase";
import { createGameStore, type UiState } from "./store";

export const db = content;
/**
 * A campaign's scenarios, card packs and icons (generated campaigns) before it starts or restores, and the packs of the
 * investigators and of the cards in their decks (`codes`); nothing when all are in
 */
const prepare = (campaignId: string, codes: string[] = []) => {
  const c = content.campaigns[campaignId];
  if (!c) return;
  const packs = [...new Set([...c.packs, ...packsOf(codes)])].filter(
    (p) => content.packs[p] && !packLoaded(content, p),
  );
  const icons = c.generated && !campaignSpriteLoaded();
  const scenarios = !campaignLoaded(campaignId);
  if (!packs.length && !icons && !scenarios) return;
  return Promise.all([
    scenarios
      ? loadCampaign(campaignId).then((errors) => {
          if (errors.length)
            throw new Error(`${campaignId}: ${errors[0].path} ${errors[0].message}`);
        })
      : null,
    ...packs.map((p) =>
      loadPack(p).then((errors) => {
        if (errors.length) throw new Error(`${p}: ${errors[0].path} ${errors[0].message}`);
      }),
    ),
    // icons are cosmetic: a sprite that fails to load is logged, not a reason to refuse the campaign
    icons ? loadCampaignSprite().catch((e) => console.error(e)) : null,
  ]).then(() => undefined);
};

export const gameStore = createGameStore(content, undefined, prepare);
trackArrivals(gameStore);
trackIntro(gameStore);
trackShowcase(gameStore);
export const GameContext = createContext<StoreApi<UiState>>(gameStore);

/** select from the game store (engine state + session) */
export function useGame<T>(sel: (s: UiState) => T): T {
  return useStore(useContext(GameContext), sel);
}
