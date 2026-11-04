# ADR-0042: The chaos bag is three places, and every token kind carries its reveal rule

- Status: proposed
- Date: 2026-11-03

## Context and Problem Statement

The chaos bag is one array of sixteen token kinds; a token is either in it or gone. Seal (The Forgotten Age onward) keeps tokens on cards, out of the bag but in the game; bless and curse (The Innsmouth Conspiracy onward) are limited to ten each in the bag and sealed together and return to a pool, not the bag, after they are revealed; frost (Edge of the Earth) and blood (Children of Blood) have reveal rules of their own. Seven cycles and two boxes read these.

## Considered Options

1. Keep one array and let scripts remember sealed and pooled tokens.
2. The state holds the bag, a table of tokens sealed per card instance, and a pool per capped kind; a kind that is not a scenario symbol carries its reveal rule (modifier, whether another token is revealed, where it returns) in one table in the engine; the scenario reference card keeps the four symbols.
3. A token as an entity with a zone, like a card.

## Decision Outcome

Chosen option: "three places and a rule table per kind", because sealing and the pool are facts the draw, the cap, undo, the snapshot and the bag modal all read, and a kind's reveal rule is a rule, not scenario data: bless is +2 and reveals another wherever it is revealed. Tokens are not entities because nothing attaches to a token and the draw is a splice from a list.

### Consequences

- Good, because Seal is one op (`sealToken`) and one release in `moveCard`, and the Grimoire's "a sealed token is not in the bag" holds by construction.
- Good, because frost and blood are a row in the table and a cap in the pool, not a second reveal path.
- Good, because the bag modal, the card frame and the token draw read the same three places.
- Bad, because `ENGINE_VERSION` bumps and snapshots gain two keys.
- Bad, because a scenario-specific rule about a kind (Feeding Grounds' auto-fail on blood) is a token-line effect, not a row: the table holds only what is true everywhere.
- Follow-up: Hemlock House's second bag (`engine-fhv-days-relationships`) is a second `chaosBag` list that the draw can be pointed at.
