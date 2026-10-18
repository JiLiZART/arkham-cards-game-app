# ADR-0007: Scenario and campaign definitions are generated from ArkhamCards' campaign guides

- Status: accepted
- Date: 2026-10-18

## Context and Problem Statement

Only Night of the Zealot has scenario definitions, written by hand with the behaviour of its 160 encounter and player cards. The other 20 official campaigns have about 200 scenarios and several thousand encounter cards; writing each by hand before it can be played would take months. ArkhamCards' campaign guides (`inspired/ArkhamCards/assets/generated/all_campaigns*.txt`) describe every campaign in a structured form, in English and Russian: encounter sets, location layouts, chaos bags, resolutions and log entries. No source holds location connections or card behaviour in a machine-readable form.

## Considered Options

- Generate every campaign's definitions from the guides; mark them as generated; derive connections from the guide's layout; let unscripted cards show their text without effect; write behaviour campaign by campaign later, with hand-written files taking precedence.
- Write each campaign by hand, fully scripted, one at a time.
- Show the other campaigns only as text (a reader), not as games.

## Decision Outcome

Chosen option: "generate from the guides", because every campaign becomes playable at once with its real setup, chaos bag, story and campaign log, Russian text comes along through the existing import, and the hand-written path stays open for the fidelity work.

### Consequences

- Good, because one command produces and refreshes 20 campaigns, reproducibly.
- Good, because the scenario story, resolutions and log are the published ones, in both languages.
- Bad, because generated scenarios play with partial rules: treacheries without behaviour do nothing, scenario-specific mechanics are missing, connections are a layout approximation, and unreadable token values become −2. The new-game screen says so.
- Bad, because the engine needs a generic ending (last act or agenda) that scripted scenarios never relied on.
- Follow-up: script campaigns one at a time; a hand-written `campaign.json` without `"generated": true` is never overwritten by the import.
