/** purely visual UI state (hover, pop-up menus, panels) — never saved */
import { create } from "zustand";
import type { ChoiceOption, InstId } from "../engine/types";

export interface ViewState {
  hovered: InstId | null;
  menu: { x: number; y: number; options: ChoiceOption[] } | null;
  dragging: InstId | null;
  panel: "none" | "log" | "debug";
  setHovered(id: InstId | null): void;
  openMenu(x: number, y: number, options: ChoiceOption[]): void;
  closeMenu(): void;
  setDragging(id: InstId | null): void;
  toggle(panel: "log" | "debug"): void;
}

export const useView = create<ViewState>((set, get) => ({
  hovered: null,
  menu: null,
  dragging: null,
  panel: "none",
  setHovered: (hovered) => set({ hovered }),
  openMenu: (x, y, options) => set({ menu: { x, y, options } }),
  closeMenu: () => set({ menu: null }),
  setDragging: (dragging) => set({ dragging }),
  toggle: (p) => set({ panel: get().panel === p ? "none" : p }),
}));
