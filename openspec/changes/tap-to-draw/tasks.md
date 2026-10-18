## 1. Engine

- [x] 1.1 `tapDecks` on setup and state; the `draw` pending kind; `Draw` and `DrawEncounter` wait for the tap (one per effect, none in setup); the bot answers; tests for the four spec scenarios.

## 2. UI

- [x] 2.1 `deckOptions` (tested); piles highlighted and tapping chooses; the spotlight; instruction strings in English and Russian.
- [x] 2.2 The setting, on by default, saved and passed into the setup; phone: drawer handle glow and the bar's Draw button.
- [x] 2.3 Drive scripts and browser checks tap the lit decks.

## 3. Verification

- [x] 3.1 Browser: upkeep and mythos draws by tap on desktop and phone, the Draw action from the deck pile, setting off restores the old flow; drive-calm to round 3 with 0 errors; tests, lint, build, content check.
- [x] 3.2 README; `openspec validate tap-to-draw --type change --strict`.
