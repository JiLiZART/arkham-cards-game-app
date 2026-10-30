/** the new-game wizard's filters: what is being looked at, kept while the app is open and never saved (ADR-0004) */
import { create } from "zustand";
import {
  DEFAULT_CAMPAIGN_FILTER,
  DEFAULT_PICKER_FILTER,
  NO_CAMPAIGN_FILTER,
  NO_PICKER_FILTER,
  type CampaignFilter,
  type PickerFilter,
  type SortBy,
} from "./wizard";

interface WizardFilters {
  campaign: CampaignFilter;
  picker: PickerFilter;
  sort: SortBy;
  setCampaign(patch: Partial<CampaignFilter>): void;
  setPicker(patch: Partial<PickerFilter>): void;
  setSort(sort: SortBy): void;
  /** Clear all: every filter unset, the default included; the order stays */
  clearCampaign(): void;
  clearPicker(): void;
}

export const useWizardFilters = create<WizardFilters>((set, get) => ({
  campaign: DEFAULT_CAMPAIGN_FILTER,
  picker: DEFAULT_PICKER_FILTER,
  sort: "release",
  setCampaign: (patch) => set({ campaign: { ...get().campaign, ...patch } }),
  setPicker: (patch) => set({ picker: { ...get().picker, ...patch } }),
  setSort: (sort) => set({ sort }),
  clearCampaign: () => set({ campaign: NO_CAMPAIGN_FILTER }),
  clearPicker: () => set({ picker: NO_PICKER_FILTER }),
}));
