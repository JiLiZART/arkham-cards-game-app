# ADR Review Manifest

- Status: completed
- Review date: 2026-10-17

## Review Summary

ADR review completed for this change. ADR-0001 (audio provenance) and ADR-0002 (presentation clock) were reviewed; neither is affected. One durable decision is introduced: icons ship as a generated SVG sprite with a provenance manifest, replacing the icon fonts, which binds how every future pack's icons reach the game.

## In-Force ADRs Reviewed

- `adr/0001-cc0-audio-assets-with-provenance-manifest.md` (not affected; its provenance habit is followed)
- `adr/0002-presentation-follows-the-animation-clock.md` (not affected)

## New Durable ADRs Created

- `adr/0003-icons-ship-as-a-generated-svg-sprite.md`: one generated sprite from the icon sources, injected once, drawn with layered `<use>`; manifest and `check:content` tie content to it; the icon fonts are removed.
