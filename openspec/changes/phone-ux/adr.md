# ADR Review Manifest

- Status: completed
- Review date: 2026-10-28

## Review Summary

ADR review completed for this change. Every file in `adr/` was read and none carries a `Supersedes` field, so all sixteen are in force. The decisions in `design.md` were checked against them: D1 (menus read the layout mode through a root class) applies ADR-0005, D4 (density by tokens under the mode class) applies ADR-0005 and ADR-0016, D3 (fullscreen helper and button) and D5 (the wizard's phone shape) and D6 (defaults) are tactical and bound to this change. D2 (one bottom sheet for every details pane on the phone) sets a pattern later panes must follow and is recorded below.

## In-Force ADRs Reviewed

- ADR-0001 CC0 audio assets with a provenance manifest
- ADR-0002 Presentation follows the animation clock
- ADR-0003 Icons ship as a generated SVG sprite
- ADR-0004 Viewing is view state, deciding is game state (the sheet and the ask are view state)
- ADR-0005 One layout mode read by components (the menus join the table under it; no media queries added)
- ADR-0006 Card data and text from the vendored ArkhamDB snapshot
- ADR-0007 Scenarios generated from the campaign guides
- ADR-0008 Catalog images linked from the arkham.build CDN
- ADR-0009 Sound assets normalised to fixed loudness on import
- ADR-0010 Dev-only tooling served by the dev server
- ADR-0011 Campaign flow is a typed step language run by the engine
- ADR-0012 Completeness is measured from the content and committed
- ADR-0013 A card works when every printed line is accounted for
- ADR-0014 Player windows are engine windows
- ADR-0015 The Arkham Grimoire is the engine's rules reference
- ADR-0016 UI components own their styles in CSS Modules (the new components get their own folders and modules)

## New Durable ADRs Created

- `adr/0017-phone-details-panes-open-as-bottom-sheets.md`: on the phone layout a details pane opens as a shared bottom sheet; the desktop keeps its popovers and sidebars.
