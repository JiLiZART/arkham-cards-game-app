## Context

`StatBody` already renders `OptionButtons` when given `options`; the avatar sheet passes the investigator's `abilities` (from `investigatorOptions`) and `StatBar` passes none, by the `player-bar` decision that investigator-card options live on the avatar. `useCardOptions([cardId])` gives the pending options tied to a card while the hand is visible and nothing animates.

## Goals / Non-Goals

**Goals:** the ability usable from the bottom-left bar with one tap; visible when it can be used.

**Non-Goals:** new abilities in the engine; the phone layout (the sheet serves).

## Decisions

1. `StatBar` computes `options = useCardOptions([cardId]).filter(o => investigatorOptions(game).abilities.some(x => x.id === o.id))` (the same filter the sheet uses) and passes `options` and `legal={options.length > 0}` to `StatBody`; the portrait's existing `legal` glow lights. Choices that are answers among investigators stay on the avatars.
2. Buttons in the bar use the rail's lit style (`primary` with the gold ring) and the 44 px minimum at the bar's zoom.
3. `bar-hover-sheet`'s note that "the ability button stays in the stat bar" becomes true through this change; the two can be applied in any order.

## Risks / Trade-offs

- [Two places for the same button] → both call the same option; the sheet remains for the phone and for hovering a teammate.

## Migration Plan

None.

## Open Questions

None.
