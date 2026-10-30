import { beforeEach, describe, expect, it } from "vitest";
import { useWizardFilters } from "./wizardFilters";
import {
  DEFAULT_CAMPAIGN_FILTER,
  DEFAULT_PICKER_FILTER,
  NO_CAMPAIGN_FILTER,
  NO_PICKER_FILTER,
} from "./wizard";

const get = () => useWizardFilters.getState();

describe("the wizard's filters", () => {
  beforeEach(() => useWizardFilters.setState(useWizardFilters.getInitialState()));

  it("start at the defaults: complete only, release order", () => {
    expect(get().campaign).toEqual(DEFAULT_CAMPAIGN_FILTER);
    expect(get().picker).toEqual(DEFAULT_PICKER_FILTER);
    expect(get().sort).toBe("release");
  });

  it("a patch keeps the rest", () => {
    get().setCampaign({ kind: "side" });
    get().setPicker({ faction: "mystic" });
    expect(get().campaign).toEqual({ ...DEFAULT_CAMPAIGN_FILTER, kind: "side" });
    expect(get().picker).toEqual({ ...DEFAULT_PICKER_FILTER, faction: "mystic" });
  });

  it("Clear all unsets everything, the rules default included", () => {
    get().setCampaign({ kind: "side", query: "carn" });
    get().clearCampaign();
    expect(get().campaign).toEqual(NO_CAMPAIGN_FILTER);
    get().setPicker({ faction: "mystic", stats: { combat: 4 } });
    get().clearPicker();
    expect(get().picker).toEqual(NO_PICKER_FILTER);
  });

  it("the sort survives a clear of the picker", () => {
    get().setSort("willpower");
    get().clearPicker();
    expect(get().sort).toBe("willpower");
  });
});
