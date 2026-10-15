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
  /** screen rect of the hovered card when it is an HTML card (map cards are projected instead) */
  hoverRect: { x0: number; y0: number; x1: number; y1: number } | null;
  setHover(id: InstId | null, rect?: DOMRect | null): void;
  menu: { x: number; y: number; options: ChoiceOption[] } | null;
  dragging: InstId | null;
  panel: "none" | "debug";
  moveDrag: MoveDrag | null;
  /** the right-hand feed: live kill feed or the full Journal */
  feedMode: "live" | "journal";
  setFeedMode(m: "live" | "journal"): void;
  /** a request from the HUD buttons to move the map camera */
  camCmd: { kind: "focus" | "fit"; n: number } | null;
  cameraCommand(kind: "focus" | "fit"): void;
  /** bumps whenever the map camera moves, so screen-space overlays can re-project */
  camTick: number;
  bumpCamera(): void;
  /** full-size detail of a card, or an investigator's stats / hand / play area */
  modal: Modal;
  setModal(m: Modal): void;
  setMoveDrag(d: MoveDrag | null): void;
  setHovered(id: InstId | null): void;
  openMenu(x: number, y: number, options: ChoiceOption[]): void;
  closeMenu(): void;
  setDragging(id: InstId | null): void;
  toggle(panel: "debug"): void;
  /** the token event whose draw may start: the screen settled after it became current */
  settledFor: unknown;
  /** the scenario introduction after the last mulligan (agenda, act, then dealing the locations); input waits meanwhile */
  intro: { step: IntroStep; setup: unknown } | null;
  /** cards just drawn into the on-screen hand, held large in the middle until sent on to the hand; input waits meanwhile */
  showcase: InstId[];
}

/** a card at full size, an investigator, the chaos bag, or every act / agenda / the reference card */
export type Modal = { card: InstId } | { inv: InvId } | { bag: true } | { deck: "act" | "agenda" | "reference" } | null;

export type IntroStep = "agenda" | "act" | "deal";

export const useView = create<ViewState>((set, get) => ({
  hovered: null,
  hoverRect: null,
  settledFor: null,
  intro: null,
  showcase: [],
  setHover: (hovered, rect) => set({ hovered, hoverRect: rect ? { x0: rect.left, y0: rect.top, x1: rect.right, y1: rect.bottom } : null }),
  menu: null,
  dragging: null,
  panel: "none",
  moveDrag: null,
  feedMode: "live",
  setFeedMode: (feedMode) => set({ feedMode }),
  camCmd: null,
  cameraCommand: (kind) => set({ camCmd: { kind, n: (get().camCmd?.n ?? 0) + 1 } }),
  camTick: 0,
  bumpCamera: () => set({ camTick: get().camTick + 1 }),
  modal: null,
  setModal: (modal) => set({ modal, menu: null }),
  setMoveDrag: (moveDrag) => set({ moveDrag }),
  setHovered: (hovered) => set({ hovered, hoverRect: null }),
  openMenu: (x, y, options) => set({ menu: { x, y, options } }),
  closeMenu: () => set({ menu: null }),
  setDragging: (dragging) => set({ dragging }),
  toggle: (p) => set({ panel: get().panel === p ? "none" : p }),
}));
