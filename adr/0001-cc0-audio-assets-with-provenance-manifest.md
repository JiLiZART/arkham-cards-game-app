# ADR-0001: Audio assets are CC0-only, committed as converted files with a provenance manifest

- Status: accepted
- Date: 2026-10-17

## Context and Problem Statement

The game needs sound effects and music. It is a fan project published on GitHub Pages, so every clip's licence must allow redistribution without per-clip attribution bookkeeping, and the build must stay a plain copy of static files. Sound sources (Freesound, OpenGameArt, Kenney, FreePD) mix licences per file and don't offer stable download URLs, so provenance has to be recorded by us.

## Considered Options

- CC0-only sources; converted files committed under `public/sounds/`; a manifest (`content/sounds/sounds.json`) records id, source URL, author, licence and what the clip serves; `check:content` fails on a missing file, a non-CC0 licence or an unknown target.
- CC0 plus no-attribution licences such as the Pixabay Licence, recorded the same way.
- Manifest only, files fetched at build time like the card images.

## Decision Outcome

Chosen option: "CC0-only, committed files, validated manifest", because one licence rule is auditable at a glance, the repo stays reproducible offline (the import script regenerates the files from originals with ffmpeg), and the deploy stays a static copy. Build-time fetching was rejected because the sources need API keys or have unstable URLs.

### Consequences

- Good, because licence review is a single check in CI, and the README credits section can be generated from the manifest.
- Good, because card-specific and future content-pack sounds are data entries, not code.
- Bad, because about 10 MB of binaries live in git and grow with every new track.
- Bad, because Pixabay and other permissive-but-not-CC0 banks are off the table until a superseding ADR says otherwise.
