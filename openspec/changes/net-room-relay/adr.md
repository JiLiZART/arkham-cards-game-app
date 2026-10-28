# ADR Review Manifest

- Status: completed
- Review date: 2026-10-28

## Review Summary

ADR review completed for this change. ADR-0019 decided that the room service never receives moves; this change has it forward moves it doesn't read, so ADR-0020 supersedes ADR-0019 in that part. The rest of ADR-0019 (a Worker with a Durable Object per room, rule-free, on the site's origin) stays in force through ADR-0020. ADR-0018 holds: moves are still host-ordered and replayed by every browser.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0019 in `adr/`. Directly relevant: ADR-0018 (host-ordered move log over WebRTC), ADR-0019 (rule-free signaling Worker, now superseded in part).

## New Durable ADRs Created

- [ADR-0020](../../../adr/0020-moves-fall-back-to-the-room-socket-when-no-peer-link-opens.md): moves fall back to the room's socket when no peer link opens; TURN from any provider by secrets.
