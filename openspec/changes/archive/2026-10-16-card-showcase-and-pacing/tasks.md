## 1. Engine

- [x] 1.1 Phase pacing:
  - `pacePhases` on `GameSetup`;
  - a `PhasePause` step at the start of the mythos, investigation, enemy and upkeep phases, asked of the lead investigator (kind `"phase"`, one option `continue`);
  - the bot answers `continue`;
  - the testkit stays unpaced;
  - `scenarioSetup` in the UI sets the flag.

  Verify with engine tests: a paced game pauses after the enemy-phase log entry with no attack yet, `continue` resolves it, the replay is identical, and an unpaced setup never pauses. Run `npm test`, including the bot playthroughs.
- [x] 1.2 Reveal counter: `counters.reveal` is bumped in the RNG, in the player and encounter deck draws, and in `searchDeck`/`lookAtTop`.

  Verify with engine tests: a move and a commit leave it unchanged; a draw, the commit window closing into the token draw, and a search all bump it. Add a fuzz check that any change to deck zones, `chaosBag` or `rng` bumps it.
- [x] 1.3 Event sources: `data.source` on `damage` and `assetDamage` (from `AssignDamage.source`, or the enemy for attacks), and on resource, clue and action losses from effects.

  Verify with engine tests: Attic horror has the Attic as its source, and a Ghoul attack has the Ghoul.

## 2. Phase pacing and Undo in the UI

- [x] 2.1 `PhaseTitle`:
  - shows the persistent title with "Continue — <lead>" and Space/Enter while `pending.kind === "phase"`;
  - unpaced games keep the timed title;
  - `HandOff` skips `"phase"` choices;
  - `optionHome` homes the option to the title;
  - en/ru strings.

  Verify in the browser with screenshots of the enemy-phase title waiting with no attack, and the upkeep title after Continue, with private hands on.
- [x] 2.2 Undo:
  - `undoFloor` in the store, recomputed on load and import;
  - `undo()` replays without the last action and clears the event queue;
  - `canUndo`;
  - a rail Undo button and Ctrl/Cmd+Z, with a tooltip when disabled;
  - `PhaseTitle`, the feed and arrivals cope with a shorter log.

  Verify with a store test: fight, commit, Done, undo ×3 returns the original state and action count, and undo is refused after the token draw. Also take browser screenshots of the reopened commit window.

## 3. Showcase

- [x] 3.1 Draw showcase:
  - a `showcase` view slice and `Showcase.tsx`;
  - the on-screen investigator's non-opening deck → hand arrivals stop in the centre, face up and large, side by side;
  - a click, "To hand" or Space/Enter flies them into the fan;
  - choices are blocked while the showcase is open;
  - privacy and reduced motion as in the spec;
  - en/ru strings.

  Verify with screenshots of the Draw action in the showcase and after dismissing it, and an upkeep draw with two investigators.
- [x] 3.2 Picking from a deck:
  - a generic pick whose card options are all in the on-screen investigator's deck or discard renders in the showcase;
  - clicking a card chooses it, and it flies from the showcase into the fan without stopping again;
  - non-card options are buttons below;
  - the cards wrap and scroll.

  Verify with screenshots of the Old Book of Lore search and the picked card's flight.

## 4. Table feedback

- [x] 4.1 Investigate in the action rail: an intellect-icon button with the action-cost marker beside Draw and Gain resource; the location click still works.

  Verify with a screenshot of Roland in the Study and an `optionHome` unit test.
- [x] 4.2 Effect hits: the source card pulses (map card via `CardMesh`, HTML cards via a class) and a streak flies to the investigator's portrait. Floating numbers wait for it to land; same-effect hits play together; reduced motion shows only the pulse. Export the map card screen rects outside dev.

  Verify with screenshots mid-streak when Roland enters the Attic, and with a Ghoul attack.
- [x] 4.3 Chaos bag entrance: in the hand draw the bag grows out of `#chaos-bag` to the centre, the circles appear after it lands, and it shrinks back after the pick; the automatic draw gets a small bag out of the button. Reduced motion as in the spec.

  Verify with screenshots mid-grow and mid-shrink.
- [x] 4.4 Act and agenda buttons on the card: `OptionButtons` overlaid on the act/agenda `MiniCard` in the panel, with the card's click still opening the viewer. In `DeckViewer` they sit over the current card. `optionHome` homes them to the card.

  Verify with a screenshot of "Advance act" on the panel card and advancing from it, and in the viewer.

## 5. Wrap-up

- [x] 5.1 Update the scripts and docs:
  - `drive.js` presses phase Continue, dismisses the showcase, does one Undo in a fight, and takes the shots for each feature;
  - `setup-fight.js` handles pauses;
  - README "Playing" notes.

  Verify that `npm test`, lint, build and `check:content` are clean, and that the 2-player drive runs through round 3 with no console errors.
