## Why

In an online game each browser opens cards at full size only for itself. When Ana opens the agenda to read its text, or the Ghoul Priest that just spawned, Ben sees nothing and has to find and open the same card. At a real table the card goes into the middle for everyone. Players talk over the cards they share, so showing them to the whole room saves a round of "which card? open it".

## What Changes

- **Shared table cards open everywhere.** In an online room, when a player opens the act, the agenda, the scenario reference card or any card no investigator owns (an enemy, treachery, location or story card) at full size, the same view opens on the other browsers in the room, spectators included.
- **Labelled.** The copy opened by another player says who is showing it: "Ana is showing".
- **Each closes their own.** Closing the card closes it only on that browser. Opening another shared card shows that one in turn.
- **Never in the way.** A browser that already has something open at full size, or is in the middle of a menu or a drag, or is behind on moves so the card isn't on its table yet, doesn't open the shown card.
- **Investigators' cards stay local.** A hand card, a deck, a card in an investigator's play area, an investigator card or panel, and the chaos bag open only on the browser that opened them, as now.
- Hot-seat play is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `online-play`: a new requirement, "Shared table cards are shown to the room".

## Impact

- `src/net/transport.ts` (a `show` wire message, outside the move log), `src/net/session.ts` (send it to every player, hand received ones to the view).
- `src/ui/state/view.ts` (who is showing the open card), the place the session is wired to the view (`src/ui/menu/`), `src/ui/hud/Modals/` (the label).
- `content/i18n/{en,ru}/ui.json` ("{name} is showing").
- No room server change: `show` travels like any wire message, over the data channel or through the room (ADR-0020). No engine change, no save change.
