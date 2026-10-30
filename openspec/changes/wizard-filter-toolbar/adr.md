# ADR Review Manifest

- Status: completed
- Review date: 2026-10-30

## Review Summary

ADR review completed for this change. The wizard's filters move into a toolbar and a panel, held in a screen-local zustand store. Every choice applies a decision already in force: the filters are view state kept beside the screen as the catalog's are (ADR-0004); the panel's frame branches on the one layout mode (ADR-0005) and is the shared bottom sheet on the phone while the desktop keeps a popover (ADR-0017); the two new components own their styles in CSS Modules and the chip primitives stay global (ADR-0016). No major durable architectural decisions were introduced and no new repository-level ADR files were created.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0020 in `adr/`, with ADR-0019 superseded by ADR-0020. Directly relevant: ADR-0004 (what is being looked at is view state), ADR-0005 (layout through one mode the components read), ADR-0016 (components own their styles in CSS Modules), ADR-0017 (phone details panes open as bottom sheets; the desktop keeps popovers).

## New Durable ADRs Created

None.
