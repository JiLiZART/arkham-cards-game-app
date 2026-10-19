# ADR-0010: Developer tooling lives in the app behind the DEV flag and writes content through the dev server

- Status: accepted
- Date: 2026-10-19

## Context and Problem Statement

Choosing content by ear or by eye (which sound a moment plays, later perhaps which scan a card uses) needs the game's own presentation: the real audio engine and sliders, the real card faces. A standalone page can't give that, and copying choices into JSON by hand doesn't scale to dozens of slots. The production build is a static copy on GitHub Pages and must not grow with tooling or with candidate assets.

## Considered Options

- Dev-only screens inside the app, lazy-loaded and mounted only under `import.meta.env.DEV`, reached from the Debug panel; a Vite dev middleware (`configureServer`) serves untracked working assets from `sounds-src/` (and the like) and accepts writes to a content file, validating the result with the content schema before saving.
- Standalone HTML pages under `scripts/` with their own playback and a JSON the developer imports.
- Hand-editing the manifest with a script that prints candidates.

## Decision Outcome

Chosen option: "dev-only screens plus a dev middleware", because the tooling then uses the same engine, settings and components as play, so what is auditioned is what ships; the DEV gate and lazy import keep it out of the bundle; and the middleware is the one place that writes content, where the schema check guards every write. Standalone pages were rejected for not matching in-game presentation; hand editing for its round trips.

### Consequences

- Good, because a new content-choosing tool is a component and a route on the middleware, not a second app.
- Good, because nothing of it reaches the production build or the deploy.
- Bad, because `vite.config.ts` carries dev-only server code, and a developer without the untracked working assets sees empty candidate lists.
- Bad, because a middleware that writes files is a small security surface on the local dev server: it binds to localhost only, writes only under `content/`, and refuses anything the schema rejects.
- Follow-up: the first tool is the sound picker; a card-override or icon tool would follow the same shape.
