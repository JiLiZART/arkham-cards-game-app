import { createContext, useContext } from "react";
import type { StoreApi } from "zustand";
import { useStore } from "zustand";
import { content } from "../content";
import { createGameStore, type UiState } from "./store";

export const db = content;
export const gameStore = createGameStore(content);
export const GameContext = createContext<StoreApi<UiState>>(gameStore);

/** select from the game store (engine state + session) */
export function useGame<T>(sel: (s: UiState) => T): T {
  return useStore(useContext(GameContext), sel);
}
