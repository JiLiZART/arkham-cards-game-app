## 1. No pass screen

- [ ] 1.1 Remove HandOff, confirmHandoff, revealedFor and the privacy setting; `handVisible` simplified; tests and the drive scripts updated; turn title for turn starts and own decisions in any phase, none for helps (tests in the players/turn-title tests).
- [ ] 1.2 Automatic switch to whoever can act after about a second with no title, a tap switching sooner; tests.

## 2. Investigator choices

- [ ] 2.1 Avatar choice overlay for choices among investigators, lit like the bar, tap chooses; single option shown for 1 s then chosen (view-state timer, ordinary dispatch); tests for the routing and the timer.

## 3. Verification

- [ ] 3.1 Browser: two investigators, Roland ends his turn: no screen, "Daisy's turn" plays, her hand is shown; a commit window for Daisy switches by itself; a "choose an investigator" shows avatars; drive-calm to round 3 with 0 errors; the phone layout.
- [ ] 3.2 README (privacy gone, how turns pass); `openspec validate avatar-handoff --type change --strict`.
