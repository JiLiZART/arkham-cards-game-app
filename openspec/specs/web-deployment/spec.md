# web-deployment Specification

## Purpose

Publishes the game as a static site on GitHub Pages, so it can be played from a link and stays up to date with the `main` branch.

## Requirements

### Requirement: Automatic deploy to GitHub Pages

Every push to `main` SHALL build the game and publish it to the repository's GitHub Pages site, served at its custom domain `https://arkham.artkost.dev`. (The account's user site has the custom domain `artkost.dev`, which Cloudflare serves as a portfolio, so the default `jilizart.github.io/<repo>/` address can't reach a project site.) The deploy SHALL also be startable by hand from the Actions tab.

Before publishing, the deploy SHALL run the tests, the linter and the content check. If any of them, or the build, fails, nothing is published and the site keeps serving the previous version. Two deploys MUST NOT publish at the same time; a newer push replaces a deploy that hasn't started publishing yet.

#### Scenario: Push to main

- **WHEN** a commit is pushed to `main` and all checks pass
- **THEN** within a few minutes the Pages site serves the new build

#### Scenario: Failing test

- **WHEN** a commit is pushed to `main` and a test fails
- **THEN** the deploy stops before publishing, and the site still serves the previous build

#### Scenario: Manual run

- **WHEN** the maintainer starts the deploy workflow from the Actions tab
- **THEN** the current `main` is built and published the same way

### Requirement: Works at the site root or under a sub-path

The deployed game SHALL load and play correctly from `https://arkham.artkost.dev/`. That covers:

- scripts and styles;
- fonts and the table background;
- icons, card backs and card scans;
- the investigator portraits on the new-game screen.

The same build SHALL also work under a sub-path such as `/arkham-cards-game-app/` when it is built for one. Then no request goes outside that sub-path. The dev server and local builds SHALL keep working at `/` without extra setup.

#### Scenario: Open the site

- **WHEN** a player opens `https://arkham.artkost.dev/` in a fresh browser
- **THEN** the menu shows with its fonts and investigator portraits, and no asset request fails

#### Scenario: Sub-path build

- **WHEN** the game is built with `PAGES_BASE=/arkham-cards-game-app/` and served there
- **THEN** it loads and plays, and every request stays under `/arkham-cards-game-app/`

#### Scenario: Local development unchanged

- **WHEN** a developer runs `npm run dev`
- **THEN** the game loads at `http://localhost:5173/` as before, with card scans through the dev proxy

### Requirement: Card scans on the deployed site

The deployed site SHALL serve every card scan the game uses from its own origin: the front of every card, and the back of every double-sided card. The map's WebGL cards can then show the scans just like in development. The scans SHALL be taken at deploy time from the same source the dev proxy uses. A scan that can't be downloaded SHALL NOT fail the deploy; that card falls back to its drawn face, and the deploy log lists the missing codes.

#### Scenario: Scans on the map

- **WHEN** a player starts The Gathering on the deployed site
- **THEN** the Study, the act, the agenda and the hand cards show their real scans, and the browser console has no CORS or texture errors

#### Scenario: A scan is missing at the source

- **WHEN** one card's scan returns an error during the deploy
- **THEN** the deploy still publishes, its log names that card code, and in the game that card shows its drawn face

### Requirement: Signaling service deployed with the site

The deploy SHALL also publish the signaling service that online play uses: a Cloudflare Worker with one Durable Object per room, answering on the site's own origin under `/net/` (room sockets, TURN credentials, and a health check). The deploy SHALL pass it the TURN key from repository secrets, never from the source. A deploy whose signaling service fails to publish SHALL NOT fail the site's publish, and the site then hides online play.

#### Scenario: Health check after a deploy

- **WHEN** a deploy finishes
- **THEN** `https://arkham.artkost.dev/net/health` answers with the deployed build version

#### Scenario: Signaling publish fails

- **WHEN** the Worker deploy fails and the site build passes
- **THEN** the site still publishes, its title screen has no online entry, and the deploy log shows the Worker error
