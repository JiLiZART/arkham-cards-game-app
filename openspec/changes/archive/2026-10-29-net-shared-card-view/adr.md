# ADR Review Manifest

- Status: completed
- Review date: 2026-10-29

## Review Summary

ADR review completed for this change. Showing a card to the room is view state sent as a wire message beside the move log. That follows ADR-0004 (what is being looked at is view state), leaves ADR-0018's host-ordered move log untouched, and uses ADR-0020's transport (data channel, else the room socket) unchanged. No major durable architectural decisions were introduced and no new repository-level ADR files were created.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0020 in `adr/`, with ADR-0019 superseded in part by ADR-0020. Directly relevant: ADR-0004 (game state vs view state), ADR-0018 (host-ordered move log over WebRTC), ADR-0020 (messages fall back to the room socket).

## New Durable ADRs Created

None.
