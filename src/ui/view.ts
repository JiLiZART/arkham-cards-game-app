/** purely visual UI state (hover, pop-up menus, panels) — never saved */
import { create } from "zustand";
import type { ChoiceOption, InstId, InvId } from "../engine/types";
import type { ScreenRect } from "./hit";

/** an investigator portrait being dragged to a location: legal targets map location → Move option id */
export interface MoveDrag {
  inv: InvId;
  targets: Record<InstId, string>;
  rects: ScreenRect[];
  dx: number;
  dy: number;
  over: InstId | null;
}

export interface ViewState {
  hovered: InstId | null;
  menu: { x: number; y: number; options: ChoiceOption[] } | null;
  dragging: InstId | null;
  panel: "none" | "log" | "debug";
  moveDrag: MoveDrag | null;
  /** full-size detail of a card, or an investigator's stats / hand / play area */
  modal: { card: InstId } | { inv: InvId } | null;
  setModal(m: { card: InstId } | { inv: InvId } | null): void;
  setMoveDrag(d: MoveDrag | null): void;
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
  moveDrag: null,
  modal: null,
  setModal: (modal) => set({ modal, menu: null }),
  setMoveDrag: (moveDrag) => set({ moveDrag }),
  setHovered: (hovered) => set({ hovered }),
  openMenu: (x, y, options) => set({ menu: { x, y, options } }),
  closeMenu: () => set({ menu: null }),
  setDragging: (dragging) => set({ dragging }),
  toggle: (p) => set({ panel: get().panel === p ? "none" : p }),
}));
