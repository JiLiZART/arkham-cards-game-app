# ADR-0039: Scenario cards are instances with faces, in named decks, with piles beneath

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

The engine holds one act, one agenda, one card beneath a location and one way to turn a card over (`setCode`). Black Stars Rise runs two agenda decks, Threads of Fate three act decks, Blood on the Altar stacks sacrifices beneath the agenda, River of Blood stacks cards beneath lairs, The Last King's VIPs become story cards and Sickening Reality becomes an enemy, The Forgotten Age's acts flip into locations and assets, and the Hunting Horror leaves play keeping its attachments. Every campaign change after Night of the Zealot depends on these, so the shape has to be decided once.

## Considered Options

1. Scripts hold the second deck, the stacks and the flips in their own notes, the engine unchanged.
2. The engine's state gains the structure: act and agenda decks are named piles with a current card each, a card instance has a face, any instance can have an ordered pile beneath it, and an out-of-play void zone keeps a card's attachments.
3. A new "scenario object" type beside cards for stacks and decks.

## Decision Outcome

Chosen option: "the engine's state gains the structure", because doom placement, advancement, undo, the snapshot and the table's drawing are engine rules that read piles and instances; a script-held stack would be invisible to all of them. Concretely: `PILE` names act and agenda decks (`act:<deck>`, `agenda:<deck>`) and piles beneath instances (`beneath:<InstId>`); `GameState.acts` and `agendas` map deck names to current cards, and a one-deck scenario is deck `a`; `CardInst.face` says which printed side is shown, `flip` turns it and moves it to the zone its new type lives in, and a `b` code is never a card of its own; `ZONE.Void` keeps attachments and counters out of play; the scenario reference card is an instance so cards can be beneath it.

### Consequences

- Good, because a campaign's structure is data (`ScenarioDef.acts`/`agendas` as named decks with versions, setup ops) and the engine, the UI and the snapshot read one shape.
- Good, because Swarming, Veiled, Mirage, the Oath's Monster pile and Sefina's events are the same pile and the same flip.
- Good, because `currentAct(game)` keeps the one-deck meaning, so existing scripts and tests do not change.
- Bad, because `ENGINE_VERSION` bumps and saves from before are refused.
- Bad, because `flags.beneath` and `flags.underAct` are removed; the three scripts that use them are rewritten.
- Follow-up: `engine-location-instances-grid` stores connections per instance in the same store; `engine-generic-keywords` builds Swarming and Veiled on these piles and faces.
