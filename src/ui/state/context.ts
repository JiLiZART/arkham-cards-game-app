import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { campaignLoaded, content, loadCampaign, loadPack } from "../../content";
import { packLoaded } from "../../content/loader";
import { campaignSpriteLoaded, loadCampaignSprite } from "../assets/icons";
import { trackArrivals } from "../game/arrivals";
import { trackIntro } from "../game/intro";
import { trackReader } from "../game/readerTrack";
import { trackShowcase } from "../game/showcase";
import { createGameStore, type UiState } from "./store";

export const db = content;
/**
 * A campaign's scenarios, every card pack and the icons (generated campaigns) before it starts or restores; nothing when
 * all are in
 */
const prepare = (campaignId: string) => {
  const c = content.campaigns[campaignId];
  if (!c) return;
  // every pack, not only the campaign's and the decks': a random basic weakness (a deck's, or a campaign step's like
  // Undimensioned and Unseen's) is drawn from all of them, and a missing pack would change what a seed draws
  // ponytail: loads every pack on start/restore; narrow to the packs holding basic weaknesses if that load is felt
  const packs = Object.keys(content.packs).filter((p) => !packLoaded(content, p));
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
trackReader(gameStore, content);
trackShowcase(gameStore);
export const GameStoreContext = createContext<StoreApi<UiState>>(gameStore);

/** select from the game store (engine state + session) */
export function useGame<T>(sel: (s: UiState) => T): T {
  return useStore(useContext(GameStoreContext), sel);
}
