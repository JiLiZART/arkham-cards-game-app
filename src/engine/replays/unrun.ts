/**
 * Card and scenario scripts no recorded game runs, the seed search's included (coverage.json); the replay test fails
 * when this list goes stale either way. The replay oracle can't vouch for these, so each needs a test of its own:
 * src/engine/scriptGuards.test.ts holds the ones no other test covered (engine-replay-oracle-and-seam, task 1.4).
 */
export const UNRUN_SCRIPTS: string[] = [
  // core
  "01103",
  "01110",
  "01134",
  // core 2026
  "12099",
  "12177",
  "12179",
  "12179b",
  // return (Return to the Night of the Zealot): no team plays it; src/engine/__tests__/rtnotzPlayerCards.test.ts
  "50008",
];
