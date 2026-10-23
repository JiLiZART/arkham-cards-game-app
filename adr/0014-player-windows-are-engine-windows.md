# ADR-0014: Player windows are engine windows at the points the rules' flow chart marks

- Status: accepted
- Date: 2026-10-20

## Context and Problem Statement

The engine's round runs the framework events of the Arkham Grimoire's flow chart (mythos, investigation, enemy, upkeep), but offers players a move only during their own turn and in reaction windows a card's text names ("after you defeat an enemy"). The grimoire (p.11, p.27–29) also marks _player windows_, red boxes between framework events, in which any investigator may play a fast card printed "during any [fast] window" or use a fast ability. Three cards of the first starter pack need them (Dynamite Blast 3, "Get over here!" 2, Taunt 3) and every later pack brings more. The engine needs one way to say where those moments are and what may happen in them.

## Considered Options

- Player windows as the engine's existing `Window` steps: a trigger `playerWindow` pushed at each red box of the chart (after the mythos encounter draws, when the investigation phase begins, when a turn begins, after hunter moves, before each investigator's enemy attacks and after the last, when upkeep begins). What may be used there is declared on the card (`anyWindow` on a fast event's play ability) and offered by the same handler that offers reactions: everyone in turn, pass or play, recorded like any choice, silent when no one can answer.
- A generic "fast step" prompt after every framework event, offering every fast card and ability to every investigator each time.
- Own-turn only: deviate from the rules and leave such cards playable only during their owner's turn.

## Decision Outcome

Chosen option: "engine windows at the chart's points", because the list of points comes from the rules document rather than from judgement, the window machinery already implements offer, pass, recording, replay and the bot's answer, and a window nobody can answer costs nothing. The generic prompt was rejected for asking at moments the rules don't name and for its prompt load; own-turn-only for being wrong (Taunt exists to be played before the enemies attack).

### Consequences

- Good, because a card's "any [fast] window" is one flag, and the points are written once; later packs add cards, not timing code.
- Good, because the same trigger is the hook for fast abilities on cards in play (Beat Cop's discard before an enemy attacks) when a change takes them on.
- Bad, because the engine now has a notion of "a moment at which anyone may act" distinct from turns; UI and bot have to treat the prompt (a reaction-kind choice naming the window) as one any investigator may receive outside their turn.
- Bad, because the chart's points are fixed in code; a campaign that adds framework events (and a window after them) must push the window itself.
- Follow-up: fast abilities in play during player windows; the skill test's own player windows (the chart's ST steps) when a card needs them.
