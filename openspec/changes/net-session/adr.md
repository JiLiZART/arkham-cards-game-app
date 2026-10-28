# ADR Review Manifest

- Status: completed
- Review date: 2026-10-28

## Review Summary

ADR review completed for this change. No ADR is superseded. ADR-0004 already treats who is looking as view state and anticipates spectators, and online seats extend it. ADR-0002 holds because each browser plays the events of applied moves on its own animation clock.

## In-Force ADRs Reviewed

- ADR-0001 to ADR-0017 in `adr/`, none superseded. Directly relevant: ADR-0002 (presentation follows the animation clock), ADR-0004 (viewing is view state, deciding is game state), ADR-0005 (one layout mode), ADR-0011 (campaign flow run by the engine), ADR-0016 (CSS Modules for the new lobby and indicator components).

## New Durable ADRs Created

- [ADR-0018](../../../adr/0018-online-play-replays-a-host-ordered-move-log-over-webrtc.md): online play replays a host-ordered log of session moves, sent peer to peer over WebRTC.
- [ADR-0019](../../../adr/0019-signaling-is-a-rule-free-cloudflare-worker-with-a-durable-object-per-room.md): signaling is a rule-free Cloudflare Worker with a Durable Object per room.
