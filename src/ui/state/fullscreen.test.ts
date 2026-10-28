import { describe, expect, it, vi } from "vitest";
import {
  ASKED_KEY,
  askKind,
  fullscreenActive,
  fullscreenSupported,
  toggleFullscreen,
  type FullscreenDoc,
  type FullscreenEl,
} from "./fullscreen";

const el = (over: Partial<FullscreenEl> = {}): FullscreenEl => ({
  requestFullscreen: vi.fn().mockResolvedValue(undefined),
  ...over,
});
const doc = (over: Partial<FullscreenDoc> = {}): FullscreenDoc => ({
  fullscreenEnabled: true,
  fullscreenElement: null,
  exitFullscreen: vi.fn().mockResolvedValue(undefined),
  documentElement: el(),
  ...over,
});

describe("fullscreenSupported", () => {
  it("is true where the page can request fullscreen", () => {
    expect(fullscreenSupported(doc())).toBe(true);
  });

  it("is false when the browser has no element-level request, as on iPhone Safari", () => {
    const d = doc({ documentElement: {} as FullscreenEl, fullscreenEnabled: undefined });
    expect(fullscreenSupported(d)).toBe(false);
  });

  it("is false when the document forbids it", () => {
    expect(fullscreenSupported(doc({ fullscreenEnabled: false }))).toBe(false);
  });

  it("accepts the WebKit-prefixed form", () => {
    const d = doc({
      fullscreenEnabled: undefined,
      webkitFullscreenEnabled: true,
      documentElement: { webkitRequestFullscreen: vi.fn() } as FullscreenEl,
    });
    expect(fullscreenSupported(d)).toBe(true);
  });
});

describe("toggleFullscreen", () => {
  it("requests fullscreen on the element when not in it", async () => {
    const d = doc();
    await toggleFullscreen(d);
    expect(d.documentElement.requestFullscreen).toHaveBeenCalledTimes(1);
    expect(d.exitFullscreen).not.toHaveBeenCalled();
  });

  it("exits when already in fullscreen", async () => {
    const d = doc({ fullscreenElement: el() });
    await toggleFullscreen(d);
    expect(d.exitFullscreen).toHaveBeenCalledTimes(1);
    expect(d.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it("falls back to the prefixed request", async () => {
    const webkit = vi.fn();
    const d = doc({ documentElement: { webkitRequestFullscreen: webkit } as FullscreenEl });
    await toggleFullscreen(d);
    expect(webkit).toHaveBeenCalledTimes(1);
  });

  it("a refused request is caught and reports false", async () => {
    const d = doc({
      documentElement: el({ requestFullscreen: vi.fn().mockRejectedValue(new Error("no")) }),
    });
    await expect(toggleFullscreen(d)).resolves.toBe(false);
  });

  it("reports true when the request went through", async () => {
    await expect(toggleFullscreen(doc())).resolves.toBe(true);
  });
});

describe("fullscreenActive", () => {
  it("follows the document's fullscreen element, prefixed or not", () => {
    expect(fullscreenActive(doc())).toBe(false);
    expect(fullscreenActive(doc({ fullscreenElement: el() }))).toBe(true);
    expect(fullscreenActive(doc({ webkitFullscreenElement: el() }))).toBe(true);
  });
});

describe("askKind", () => {
  it("asks on a phone that has not been asked, where fullscreen works", () => {
    expect(askKind({ phone: true, supported: true, asked: false })).toBe("fullscreen");
  });

  it("hints at the Home Screen where the API is missing", () => {
    expect(askKind({ phone: true, supported: false, asked: false })).toBe("homeScreen");
  });

  it("never asks twice, on the desktop, or while already in fullscreen", () => {
    expect(askKind({ phone: true, supported: true, asked: true })).toBeNull();
    expect(askKind({ phone: false, supported: true, asked: false })).toBeNull();
    expect(askKind({ phone: true, supported: true, asked: false, active: true })).toBeNull();
  });

  it("keeps its storage key stable", () => {
    expect(ASKED_KEY).toBe("fullscreen-asked");
  });
});
