import { describe, expect, it } from "vitest";
import { skipMulligans, start } from "../engine/testkit";
import type { ChoiceOption, GameEvent, GameState, PendingChoice } from "../engine/types";
import { heldGame, spotlightNow, spotlightOf, spotlightOfChoice } from "./spotlight";

describe("spotlight", () => {
  const game = skipMulligans(start("the-gathering", ["01001"], 1)).state;
  const study = game.invs["01001"].location!;
  const inHand = game.invs["01001"].hand[0];
  const ev = (type: string, inv: string | null, card: string | null): GameEvent => ({ type, text: type, inv, card, data: {} });

  it("lights the map card and the investigator's portrait an event is about", () => {
    expect(spotlightOf(ev("damage", "01001", study), game)).toEqual({ cards: [study], invs: ["01001"] });
  });

  it("drops what isn't on the map; nothing on the map means no spotlight", () => {
    expect(spotlightOf(ev("doom", null, inHand), game)).toBeNull();
    expect(spotlightOf(ev("agendaAdvance", null, null), game)).toBeNull();
    expect(spotlightOf(ev("testResult", "01001", null), game)).toBeNull();
  });

  it("an enemy whose move is still queued stays where it came from, unengaged", () => {
    const enemy = "x1";
    const moved = { ...game, cards: { ...game.cards, [enemy]: { ...game.cards[study], id: enemy, code: "01159", zone: "enemy" as const, location: "dest", engagedWith: "01001" } } };
    const move: GameEvent = { type: "enemyMove", text: "", card: enemy, data: { from: study, to: "dest" } };
    expect(heldGame(moved, [move]).cards[enemy]).toMatchObject({ location: study, engagedWith: null });
    // once the move plays (no longer queued) the enemy is shown where it is
    expect(heldGame(moved, [])).toBe(moved);
    expect(spotlightOf(move, moved)).toEqual({ cards: [enemy], invs: [] });
  });
});

describe("choice spotlight", () => {
  const game = skipMulligans(start("the-gathering", ["01001"], 1)).state;
  const R = "01001";
  const roland = game.invs[R].cardId;
  const study = game.invs[R].location!;
  const hand = game.invs[R].hand;
  const asking = (kind: PendingChoice["kind"], options: ChoiceOption[], patch: Partial<GameState> = {}): GameState => ({ ...game, ...patch, pending: { ...game.pending!, inv: R, kind, options } });
  const opt = (card: string): ChoiceOption => ({ id: card, label: card, card, value: card });
  const done: ChoiceOption = { id: "done", label: "Done", value: "done" };

  it("nothing for the turn, the mulligan, the phase pause and deck picks", () => {
    expect(spotlightOfChoice(game, R)).toBeNull(); // the turn
    expect(spotlightOfChoice(asking("mulligan", [done, ...hand.map(opt)]), R)).toBeNull();
    expect(spotlightOfChoice(asking("phase", [{ id: "continue", label: "Continue", value: "continue" }]), R)).toBeNull();
    const deck = game.invs[R].deck.slice(0, 3);
    expect(spotlightOfChoice(asking("generic", deck.map(opt)), R)).toBeNull();
    // a question of no card has nothing to light
    expect(spotlightOfChoice(asking("generic", [{ id: "0", label: "Yes", value: 0 }]), R)).toBeNull();
  });

  it("assign: the investigator and the asset that can take it", () => {
    const dog = "dog";
    expect(spotlightOfChoice(asking("assign", [opt(roland), opt(dog)], { cards: { ...game.cards, [dog]: { ...game.cards[hand[0]], id: dog, zone: "play" } } }), R)).toEqual({ cards: [dog], invs: [R], choice: true });
  });

  it("targets, discards and hand options", () => {
    expect(spotlightOfChoice(asking("target", [opt(study)]), R)).toEqual({ cards: [study], invs: [], choice: true });
    expect(spotlightOfChoice(asking("generic", hand.slice(0, 2).map(opt)), R)).toEqual({ cards: hand.slice(0, 2), invs: [], choice: true });
  });

  it("a playing event's spotlight replaces the choice's; the choice's returns once all is played", () => {
    const s = asking("target", [opt(study)]);
    const attack: GameEvent = { type: "attack", text: "", inv: R, card: null, data: {} };
    const choice = { cards: [study], invs: [], choice: true };
    expect(spotlightNow(s, R, null, true)).toEqual(choice);
    expect(spotlightNow(s, R, attack, false)).toEqual({ cards: [], invs: [R] });
    // an event that lights nothing still wins
    expect(spotlightNow(s, R, { ...attack, type: "testResult" }, false)).toBeNull();
    // played, but more waits to play or something holds the middle
    expect(spotlightNow(s, R, null, false)).toBeNull();
    expect(spotlightNow(s, R, null, true)).toEqual(choice);
  });

  it("commit: the hand cards that can be committed, the tested location and the tester", () => {
    const skillTest = { inv: R, target: study } as GameState["skillTest"];
    expect(spotlightOfChoice(asking("commit", [done, opt(hand[0])], { skillTest }), R)).toEqual({ cards: [hand[0], study], invs: [R], choice: true });
  });
});
