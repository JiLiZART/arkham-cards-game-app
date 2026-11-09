# ADR-0084: A scenario's opening is read in a story reader screen paged from campaign state

- Status: proposed
- Date: 2026-11-09

## Context and Problem Statement

The campaign guide's text before a scenario (the campaign's prologue, the scenario's own setup steps, the scenario's intro) was read in two places: the paper campaign screen (`flow.shown` and `FlowPrompt`) and the table's scenario introduction (`IntroOverlay`'s story step), with a rule so the prologue isn't read twice. Which one a campaign used depended on how its flow happened to start. The players want a scenario's opening to be one fullscreen reading moment, with the guide's painting, read paragraph by paragraph, choices answered in it. Online, players read at different speeds while choices and Begin are shared moves (ADR-0018). The flow (ADR-0011) already holds every page's content; reading pace is viewing (ADR-0004).

## Considered Options

- A `reader` screen between the campaign screen and the table, its pages a pure function of campaign state, the pages already turned and the paragraph pace kept in view state.
- An overlay over the paper campaign screen, sharing its state.
- A reader cursor in `CampaignState`, advanced by a move per page or paragraph.
- Marking reader ranges with a new flow step kind in `flow.json`.

## Decision Outcome

Chosen option: "a `reader` screen paged from campaign state", because the flow already says where a scenario's opening starts and ends (`flow.next` while its own setup steps run, "play" at the end, and a "continue" stop before them), a screen keeps the table and its event clock unmounted while reading (ADR-0032), and view-state pacing lets each online screen read at its own speed while answers stay the existing `flow` and `start` moves.

### Consequences

- Good, because the guide's opening has one look and one implementation; the paper screen keeps resolutions, interludes and the log, and the table introduction keeps the agenda, act and dealing.
- Good, because extending the reader to interludes and resolutions later is a change to which flow states open it, not a new mechanism.
- Bad, because a reader that keeps turned pages in view state must reconcile with campaign state that moved on (a choice answered elsewhere) and show it as answered.
- Bad, because the flow interpreter gains a "continue" stop before a scenario's own setup steps whenever anything was shown, one more tap after a resolution that showed only records.
