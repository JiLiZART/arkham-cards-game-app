/** the catalog's view state: filters, layout and the page being read are kept while the app is open, never saved (ADR-0004) */
import { create } from "zustand";
import { emptyFilters, type CatalogFilters, type Tab } from "./filter";

interface CatalogState {
  filters: CatalogFilters;
  view: "grid" | "list";
  /** the cards opened from one another: the last is on screen, Back returns to the one before, then to the list */
  open: string[];
  set(patch: Partial<CatalogFilters>): void;
  setTab(tab: Tab): void;
  clear(): void;
  setView(v: "grid" | "list"): void;
  openCard(code: string): void;
  back(): void;
}

/** what only makes sense within one tab */
const PER_TAB: Partial<CatalogFilters> = { types: [], levels: [], costs: [], icons: [], slots: [], sets: [], traits: [] };

export const useCatalog = create<CatalogState>((set, get) => ({
  filters: emptyFilters,
  view: "grid",
  open: [],
  set: (patch) => set({ filters: { ...get().filters, ...patch } }),
  setTab: (tab) => set({ filters: { ...get().filters, ...PER_TAB, tab }, open: [] }),
  clear: () => set({ filters: { ...emptyFilters, tab: get().filters.tab } }),
  setView: (view) => set({ view }),
  openCard: (code) => set({ open: [...get().open, code] }),
  back: () => set({ open: get().open.slice(0, -1) }),
}));
