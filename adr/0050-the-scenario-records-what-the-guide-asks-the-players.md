# ADR-0050: The scenario records what the guide asks the players; the flow asks only what the table can't tell

- Status: proposed
- Date: 2026-11-02

## Context and Problem Statement

The campaign guides are written for a table with no computer: between scenarios they ask the players what happened ("Which version of act 2 did you play?", "Which VIPs were interviewed?", "How many clues are on the act deck?", "Is Sebastien in the victory display?", "Who has a Possession in hand?"). The compiled flow (ADR-0011) keeps these as prompts: `chooseOne`, `cardChoice`, `counter`, `investigatorCount`. The game knows every answer. A prompt invites a wrong answer that desynchronises the log from the game, costs a click, and in online play (ADR-0018) asks one client what every client already holds.

## Considered Options

- Keep the prompts as compiled; the player answers.
- The scenario script records the answer into the campaign log when it happens, and the flow step is dropped; the flow keeps only the questions no state answers (reading a story the players may skip, choosing who takes a card).
- The flow step stays but is pre-filled from the game state and shown for confirmation.

## Decision Outcome

Chosen option: "the scenario records, the flow asks the rest", because the log then says what the game did, the step list stays a flow of decisions the players actually make, and replays and online play carry the answer in the scenario's actions. Pre-filled prompts were rejected: they keep the click and the wrong-answer path for nothing. A recorded key is a log entry like any other (`record`, `count`, `recordCards`, `setData` through the resolution's data), so the flow's conditions read it unchanged.

### Consequences

- Good, because a campaign's flow holds fewer prompts, and each remaining one is a real choice.
- Good, because a scenario's test can assert the log it leaves, and the flow's tests read a fixed log.
- Bad, because a compiled flow must have the recorded steps removed by hand or by a compiler rule per key, and the scenario script must know the flow's key names.
- Bad, because a campaign without a scenario script keeps the prompts, so the two kinds of campaign differ until each is scripted.
- Follow-up: each campaign change lists the prompts its scenarios answer; the flow compiler may learn to drop a prompt whose key a scenario script declares it records.
