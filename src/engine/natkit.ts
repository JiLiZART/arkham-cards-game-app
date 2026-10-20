/** helpers for the nat pack's card tests (not used at runtime) */
import { card, createCard, inv, moveCard, type G } from "./core";
import { createGame, type Result } from "./engine";
import type { GameSetup } from "./types";
import { db, deckCodes, mutate, pick, putEnemy, skipMulligans } from "./testkit";

export const NATHANIEL = "60101";
export const ROLAND = "01001";
export const DAISY = "01002";
export const MINION = "01160"; // Ghoul Minion: fight 2, health 2, 1 damage 1 horror
export const ACOLYTE = "01169"; // Acolyte: fight 3, health 1
export const PRIEST = "01116"; // Ghoul Priest (Elite): fight 4, health 5 per investigator, 2 damage 2 horror

/** the neutral answer to whatever is pending: pass, close a commit window, else the first option */
export function neutral(r: Result): Result {
  const p = r.state.pending!;
  return pick(r, p.options.some((o) => o.id === "pass") ? "pass" : p.kind === "commit" || /^Done/.test(p.options[0].label) ? /^Done/ : /./);
}

/** answer neutrally until somebody has to choose an action (or `stop` holds) */
export function toTurn(r: Result, stop: (r: Result) => boolean = () => false): Result {
  for (let k = 0; k < 120 && r.state.pending && r.state.pending.kind !== "turn" && !stop(r); k++) r = neutral(r);
  return r;
}

/** the investigators (Nathaniel with Roland's deck, the others with their own) at the start of the first turn, with `prep` applied */
export function game(invs: string[], prep: (g: G) => void = () => {}, bag = ["0"]): Result {
  const s: GameSetup = {
    campaignId: "night-of-the-zealot", scenarioId: "the-gathering", difficulty: "standard", seed: 1, chaosBag: bag as never,
    investigators: invs.map((code) => ({ code, deck: deckCodes(code === DAISY ? "daisy-starter" : "roland-starter") })),
  };
  const r = toTurn(skipMulligans(createGame(db, s)));
  return mutate(r, prep);
}
export const nathaniel = (prep: (g: G) => void = () => {}, extra: string[] = [], bag?: string[]) => game([NATHANIEL, ...extra], prep, bag);

/** a card of `code` in the investigator's hand */
export function hand(g: G, i: string, code: string) {
  const id = createCard(g, code, "limbo", i);
  moveCard(g, id, "hand");
  return id;
}
/** a card of `code` in play under the investigator's control */
export function inPlay(g: G, i: string, code: string) {
  const id = createCard(g, code, "limbo", i);
  moveCard(g, id, "play");
  card(g, id).controller = i;
  if (g.db.cards[code].uses) card(g, id).uses = g.db.cards[code].uses!.count;
  return id;
}
/** an enemy at the investigator's location, engaged with them or not */
export const enemyHere = (g: G, i: string, code = MINION, engaged = true) => putEnemy(g, code, inv(g, i).location!, engaged ? i : null);
export const attacks = (r: Result) => r.state.log.filter((e) => e.type === "attack").length;
export const enemyIn = (r: Result, code: string) => Object.values(r.state.cards).find((c) => c.code === code && c.zone === "enemy");
export const zoneOf = (r: Result, code: string) => Object.values(r.state.cards).filter((c) => c.code === code).map((c) => c.zone);

/** a revealed, clueless location joined to the start (the Study) by `via` codes: [a, b] pairs of location codes */
export function addLocation(g: G, code: string, pairs: [string, string][]) {
  const id = createCard(g, code, "limbo");
  moveCard(g, id, "location");
  card(g, id).revealed = true;
  card(g, id).clues = 0;
  g.s.flags.connections = [...((g.s.flags.connections as [string, string][] | undefined) ?? []), ...pairs];
  return id;
}
export const STUDY = "01111";
export const HALLWAY = "01112";
export const ATTIC = "01113";
