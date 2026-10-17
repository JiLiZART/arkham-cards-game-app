## Context

- Everything the ribbon shows is in `GameState`: `round`, `phase`, `order`, `invs[i].turnDone`, `invs[i].status`, `active`, `invs[i].actionsLeft`, `invs[i].restrictedActions`. There is no "actions at turn start" field.
- Enemy facts needed for intents are on `CardInst` (`exhausted`, `engagedWith`, `location`) and the def (`keywords`, `attack` damage/horror as the enemy's printed values; `TokenBadges` and the hover details already read them).
- The map renders investigators' mini-portraits as HTML projected over the WebGL table (`mapProjector.mini`). Map cards get a projected rect through `mapProjector.rect`.
- `PhaseTitle` shows how a title derives from log entries, claims the stage and plays once.
- `TopBar` holds the scenario line and the Journal, Debug and Menu buttons.

## Goals / Non-Goals

**Goals:**
- Pure, tested helpers for the ribbon model and the intents; thin components.
- The ribbon is the only place for round, phase, whose turn and actions left.
- A layout that survives a narrow screen: one row, portraits-only below 700 px.

**Non-Goals:**
- Captions, camera and pace (phase-director).
- Changing the prompt or the rail's layout (choice-bar), beyond the glow and the dimming.
- Intents for enemies with special enemy-phase behaviour from scripts (e.g. an enemy that moves without the hunter keyword). The badge covers the base rules; scripts can override later by a card-script hook if needed.

## Decisions

### 1. `ribbonModel(game)` is a pure function
Returns `{ round, phases: [{ id, state: "done" | "current" | "todo" | "skipped" }], turns: [{ inv, state: "active" | "done" | "todo", pips, filled }] }`. `pips` = `max(3, actionsLeft + restricted)` for the active investigator; 3 for the others. Tested in `ribbon.test.ts`. The component only renders it.

*Why not store actions at turn start:* no engine or save change for a cosmetic number; extra actions beyond three are rare and still shown correctly when present.

*As built:* during a paced game's pause before a phase, the model treats the paused phase as current (the engine still reads the previous phase, and the round has already ticked over before mythos), and before the investigation phase last round's `turnDone` flags are ignored.

### 2. Pips animate by CSS
A pip is a span with a `filled` class; removing the class runs a short shrink transition. No JS timers. Reduced motion: no transition.

### 3. Intents are a pure `intentOf(game, enemyId)`
Returns `{ kind: "attack", damage, horror } | { kind: "hunt" } | { kind: "rest" } | { kind: "wait" }`, following the enemy phase rules in `enemies.ts` (`hunterMovesHandler`'s filter, `enemyAttacksHandler`'s engaged-and-ready test). Tested in `intent.test.ts` with the four cases and the evade/engage transitions.

*As built:* `IntentBadge` (beside `TokenBadges`, reading the live game) sits on a strip card's top-left corner (the hand fan covers the bottom), on a map card's bottom-left corner in the card's own drei `Html` overlay (no projector needed), and spelled out in words on the hover copy.

Badges: `TokenBadges` renders the badge for strip cards (it already draws damage and doom on a `CardInst`); map enemies get an HTML `intent-badge` placed by the same projector the mini-portraits use, so the badge follows the camera and never needs a WebGL text. Hover title text comes from `intent.*` strings.

### 4. End turn glow in `ActionRail`
No actions left for the active investigator (`actionsLeft` plus restricted actions, so Daisy's Tome action keeps End turn quiet): the End turn button gets a `glow` class. *As built:* no dimming. `legalTurnActions` drops every option that costs more than the actions left, so at 0 Draw, Resource and Investigate aren't on the rail to dim. Hand cards: the fan already shows only legal options.

### 5. Turn title is derived from `turn` log entries
`TurnTitle` mirrors `PhaseTitle`: it queues `turn` entries as they appear, skips one when the previous shown overlay was the investigation phase's pause for the same investigator, skips when a hand-off will show (private hands, more than one player, viewer's hand not revealed), claims `turn:<logIndex>` on the stage and plays a 1.2 s title. The phase title and the turn title share CSS.

*As built:* a title is shown only if its investigator is still the active one when the screen settles, so a player quicker than the screen never gets a title for a turn already over.

### 6. The ribbon replaces the scenario line
`TopBar` keeps its buttons; the scenario name moves to the ribbon's left end as a small label with the round. Below 700 px the labels hide and the phase segments become icons with the portraits.

## Risks / Trade-offs

- **Ribbon width with four investigators plus labels.** Mitigation: portraits at 32 px, labels hidden under 700 px, and the ribbon wraps the turn row under the phases if needed.
- **Intent badges clutter the map when many enemies are out.** They are small (22 px) and sit on the card's corner like the damage tokens; the hover gives the words.
- **Turn title plus hand-off plus phase title in a row** could feel like three gates. The rules in decision 5 ensure at most one of them per turn start.
- **Scripts that change enemy-phase behaviour** make the badge wrong. Accepted for Night of the Zealot's base enemies; noted in the non-goals.
