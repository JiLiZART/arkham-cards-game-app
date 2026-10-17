import { skipMulligans, start } from "../engine/testkit";
import { describe, expect, it } from "vitest";
import { clampCam, eventFocus, fitCam, focusCam, panBy, zoomAt, zoomLimits } from "./camera";

const bounds = { x0: -10, x1: 10, z0: -5, z1: 5 };
const view = { w: 1000, h: 500 };
const none = { top: 0, right: 0, bottom: 0, left: 0 };

describe("map camera", () => {
  it("zoom limits: whole map at the far end, an 840 px location at the near end", () => {
    const big = { w: 1000, h: 1080 };
    // the whole map is smaller than half the default zoom here: the fit wins
    expect(zoomLimits({ x0: -50, x1: 50, z0: -50, z1: 50 }, big, 4)).toEqual({ min: 10, max: 210 });
    // a one-room map can still zoom out to half the default size (420 px / 2)
    expect(zoomLimits({ x0: -3, x1: 3, z0: -3.5, z1: 3.5 }, big, 4).min * 4).toBeCloseTo(210);
    // max never drops below min
    const l = zoomLimits(bounds, view, 1000);
    expect(l.max).toBeGreaterThanOrEqual(l.min);
  });

  it("clamps zoom and keeps at least 320 px of the map inside the free area between the HUD panels", () => {
    const hud = { top: 60, right: 170, bottom: 380, left: 200 };
    const v = { w: 1600, h: 900 };
    const big = { x0: -20, x1: 20, z0: -12, z1: 12 };
    const toScreenX = (x: number, c: { cx: number; zoom: number }) => v.w / 2 + (x - c.cx) * c.zoom;
    const toScreenY = (z: number, c: { cz: number; zoom: number }) => v.h / 2 + (z - c.cz) * c.zoom;
    // map dragged far up-left: its right/bottom edges stay 320 px inside the free area's left/top edges
    const a = clampCam({ cx: 999, cz: 999, zoom: 40 }, big, v, 4, hud);
    expect(toScreenX(big.x1, a)).toBeCloseTo(hud.left + 320);
    expect(toScreenY(big.z1, a)).toBeCloseTo(hud.top + 320);
    // and dragged far down-right: its left/top edges stay 320 px inside the free area's right/bottom edges
    const b = clampCam({ cx: -999, cz: -999, zoom: 40 }, big, v, 4, hud);
    expect(toScreenX(big.x0, b)).toBeCloseTo(v.w - hud.right - 320);
    expect(toScreenY(big.z0, b)).toBeCloseTo(v.h - hud.bottom - 320);
    // a centred camera is left alone; zoom is clamped
    expect(clampCam({ cx: 1, cz: 1, zoom: 50 }, bounds, view, 4)).toEqual({ cx: 1, cz: 1, zoom: 50 });
    expect(clampCam({ cx: 0, cz: 0, zoom: 999 }, bounds, view, 4).zoom).toBe(210);
  });

  it("zooming keeps the world point under the pointer fixed", () => {
    const c = { cx: 2, cz: 1, zoom: 50 };
    const before = { x: c.cx + (800 - 500) / c.zoom, z: c.cz + (100 - 250) / c.zoom };
    const z = zoomAt(c, 2, 800, 100, view);
    expect(z.zoom).toBe(100);
    expect(z.cx + (800 - 500) / z.zoom).toBeCloseTo(before.x);
    expect(z.cz + (100 - 250) / z.zoom).toBeCloseTo(before.z);
  });

  it("panning moves the map with the pointer", () => {
    expect(panBy({ cx: 0, cz: 0, zoom: 50 }, 100, -50)).toEqual({ cx: -2, cz: 1, zoom: 50 });
  });

  it("focus shows a location 420 px tall at 1080p and centres it in the free area", () => {
    const c = focusCam(3, 2, 4, { w: 1920, h: 1080 }, { top: 60, right: 160, bottom: 300, left: 200 });
    expect(c.zoom * 4).toBeCloseTo(420);
    // screen position of the location: centre + (world - camera) * zoom
    const sx = 960 + (3 - c.cx) * c.zoom;
    const sy = 540 + (2 - c.cz) * c.zoom;
    expect(sx).toBeCloseTo(200 + (1920 - 200 - 160) / 2);
    expect(sy).toBeCloseTo(60 + (1080 - 60 - 300) / 2);
    expect(focusCam(0, 0, 4, { w: 1280, h: 720 }, none).zoom * 4).toBeCloseTo(280);
  });

  it("whole map fits the free area, and the zoom limit allows it", () => {
    expect(fitCam(bounds, view, none)).toEqual({ cx: 0, cz: 0, zoom: 50 });
    const hud = { top: 60, right: 170, bottom: 330, left: 200 };
    const big = { x0: -20, x1: 20, z0: -12, z1: 12 };
    const fit = fitCam(big, { w: 1920, h: 1080 }, hud);
    expect(clampCam(fit, big, { w: 1920, h: 1080 }, 4, hud).zoom).toBeCloseTo(fit.zoom);
  });
});

describe("eventFocus", () => {
  const game = skipMulligans(start("the-gathering", ["01001"], 1)).state;
  const study = game.invs["01001"].location!;
  const ghoul = "g1";
  const withGhoul = { ...game, cards: { ...game.cards, [ghoul]: { ...game.cards[study], id: ghoul, code: "01160", zone: "enemy" as const, location: study } } };
  const ev = (type: string, extra: object) => ({ type, text: "", ...extra });

  it("an enemy's event looks at the enemy's location", () => {
    expect(eventFocus(ev("attack", { card: ghoul, inv: "01001" }), withGhoul)).toBe(study);
  });
  it("a spawn looks where it spawns; an investigator's event at their location", () => {
    expect(eventFocus(ev("spawn", { card: "nowhere", data: { at: study } }), game)).toBe(study);
    expect(eventFocus(ev("damage", { inv: "01001" }), game)).toBe(study);
  });
  it("nothing on the map: stays on the decider", () => {
    expect(eventFocus(ev("agendaAdvance", { card: game.agenda }), game)).toBeNull();
    expect(eventFocus(null, game)).toBeNull();
  });
});
