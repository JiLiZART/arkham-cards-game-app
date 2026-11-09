import type { StoreApi } from "zustand";
import type { ContentDb } from "../../engine/world/types";
import type { UiState } from "../state/store";
import { useView } from "../state/view";
import { syncReader } from "./readerState";

/**
 * Keeps the story reader's pages in step with the campaign (ADR-0084): when the campaign's state moves, by an answer on this
 * screen or a move from another, the pages it now shows are added to those already held; when the screen leaves the reader
 * (Begin, the menu) the reader's state is dropped.
 */
export function trackReader(store: StoreApi<UiState>, db: ContentDb) {
  return store.subscribe((s, prev) => {
    const reader = useView.getState().reader;
    if (!reader) return;
    if (s.screen !== "reader" && prev.screen === "reader")
      return void useView.setState({ reader: null });
    if (s.campaign && s.campaign !== prev.campaign) {
      const next = syncReader(reader, db, s.campaign, s.locale);
      if (next !== reader) useView.setState({ reader: next });
    }
  });
}
