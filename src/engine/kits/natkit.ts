/** constants and setup for the nat pack's card tests (not used at runtime); the generic helpers are in `driver.ts` */
import type { ChaosToken } from "../../content/schema";
import { cardsOf, type GameContext } from "../context";
import type { Result } from "../index";
import { game } from "./driver";

export const NATHANIEL = "60101";
export const ROLAND = "01001";
export const DAISY = "01002";
export const MINION = "01160"; // Ghoul Minion: fight 2, health 2, 1 damage 1 horror
export const ACOLYTE = "01169"; // Acolyte: fight 3, health 1
export const PRIEST = "01116"; // Ghoul Priest (Elite): fight 4, health 5 per investigator, 2 damage 2 horror
export const STUDY = "01111";
export const HALLWAY = "01112";
export const ATTIC = "01113";

/** Nathaniel (with Roland's deck) and `extra` investigators at the first turn, a bag of one 0 unless given */
export const nathaniel = (
  prep: (game: GameContext) => void = () => {},
  extra: string[] = [],
  bag: ChaosToken[] = ["0"],
) => game({ investigators: [NATHANIEL, ...extra], prep, bag });

export const attacks = (r: Result) => r.state.log.filter((e) => e.type === "attack").length;
export const enemyIn = (r: Result, code: string) =>
  cardsOf(r.state).find((c) => c.code === code && c.zone === "enemy");
export const zoneOf = (r: Result, code: string) =>
  cardsOf(r.state)
    .filter((c) => c.code === code)
    .map((c) => c.zone);
