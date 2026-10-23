# game-audio Specification

## Purpose

Sound for the table: effects on the moments the screen marks, trait-based card sounds, scenario music that follows the state of play, and the controls and provenance around them.

## Requirements

### Requirement: Effects on the animation clock

An effect SHALL play when its engine event starts playing on screen (the moment the event player begins it), not when the event is logged, so the sound matches the float and the dim at every pace. The events with a sound: chaos token draw (the bag landing when it is tossed, a clatter as the tokens hit the table, a clink on the reveal), test result (success chime, fail thud), encounter card, weakness drawn (a low sting), attack, spawn, enemy move, damage, horror, enemy damage (a hit), clues, doom, agenda advance, act advance, enemy defeated, investigator defeated, resolution. Events skipped without animation (the Debug panel, scripts) SHALL make no sound. Several effects MAY overlap when their events overlap.

#### Scenario: Tap pace

- **GIVEN** the pace is Tap and an attack and its damage are queued
- **WHEN** the attack starts playing
- **THEN** the strike plays then, and the hit plays only when the damage event starts after the tap, not before

#### Scenario: Skipped events

- **WHEN** queued events are skipped
- **THEN** no effect plays for them

#### Scenario: Enemy damage

- **WHEN** Roland's attack deals 1 damage to the Ghoul Minion and the enemy damage event plays
- **THEN** a hit plays as the damage lands on the enemy

### Requirement: Effects for UI moments

The following moments, which have no engine event of their own, SHALL play an effect: a card drawn into the fan or sent from the showcase (slide), a card played to the strip (snap), a card turned over on the map or in the showcase (flip), a card committed to a test (soft snap), the mulligan redraw confirmed (shuffle), a phase title appearing (drone swell), the phase countdown closing by itself (a soft tick), the turn title (a short rise), a button or rail option pressed (click), a tip appearing (soft pop), undo (rewind tick), a test cancelled (the rewind tick), an investigator's marker arriving at a location (footsteps), a location turning over as it is revealed (flip), a card discarded (a soft drop), a resource gained (a coin), a heal (a soft breath), an evade (a quick swish), an engage (a grab), a deck tapped to draw (a soft card lift), a token picked (a flick before its flip), an investigator chosen from the avatars, by a tap or by the automatic single pick (a soft confirm), a card added to or removed from a deck in the builder (a tick), a tab changed (a soft click), a modal or drawer opened and closed (a soft open and close), a menu screen entered (a soft page), and the scenario's victory (a bright sting). A moment whose manifest entry is "none" SHALL be silent. A moment SHALL play once per occurrence: a burst of the same moment within 60 ms plays once.

#### Scenario: Playing a card

- **WHEN** Roland plays Machete and it lands in the strip
- **THEN** the snap plays once as it lands

#### Scenario: Moving

- **WHEN** Roland's marker arrives at the Hallway
- **THEN** footsteps play as it lands, and the flip plays as the Hallway turns over

#### Scenario: Tapping the deck

- **WHEN** Roland taps his lit deck to draw
- **THEN** the card-lift plays on the tap, then the slide as the card reaches the fan

#### Scenario: Silenced moment

- **WHEN** the manifest sets the tab moment to "none"
- **THEN** changing a tab plays nothing

### Requirement: Card sounds by trait

When a card has a matching entry, its sound SHALL replace the generic one: on play (the card's trait sound instead of the snap), when a fight test starts with the card as its source (the weapon's sound), and on spawn (a growl variant by the enemy's traits). Matching SHALL be by card code first, then by the card's traits in the manifest's order, then the generic clip. The manifest maps traits and card codes to clips; adding a card sound SHALL need no code change.

#### Scenario: Firearm

- **WHEN** Roland fights with the .45 Automatic
- **THEN** the gunshot plays when the test starts, in place of nothing

#### Scenario: Unknown trait

- **WHEN** a card with no code entry and no mapped trait is played
- **THEN** the generic snap plays

### Requirement: Scenario music

While a scenario is in play and the tab is visible, music SHALL play: the scenario's ambient bed, replaced by the shared tension track while the agenda is one doom from advancing or the enemy phase is playing, replaced by the shared fight track while any enemy is engaged with an investigator. Priority is fight, then tension, then bed. Track changes SHALL crossfade over about 1.5 seconds, and a track SHALL loop without an audible seam: its loop points are in the manifest and the content check SHALL fail when the track's level at the loop start and loop end differs by more than 6 dB. Music SHALL pause when the tab is hidden and resume when it is shown. The menu, the campaign log and the scenario's end screen SHALL be silent. Music files SHALL load after the game starts, not with the menu.

#### Scenario: Engagement

- **WHEN** a Ghoul Minion engages Roland
- **THEN** the fight track fades in over the bed within 2 seconds
- **WHEN** the Ghoul is defeated and no enemy is engaged
- **THEN** the bed fades back in

#### Scenario: Hidden tab

- **WHEN** the player switches to another app or tab during a scenario
- **THEN** the music pauses, and continues from where it was when they return

#### Scenario: Seam

- **WHEN** a bed's loop end is 6 dB louder than its loop start
- **THEN** `check:content` reports the seam and fails

### Requirement: Volume and mute

The menu settings SHALL have Music and Effects sliders from 0 to 100, defaulting to 50 and 80, saved with the other settings and applied live. The game's top bar SHALL have a mute button that silences both and, pressed again, restores the levels. A slider at 0 silences its category. Sound SHALL NOT depend on the reduced-motion setting.

#### Scenario: Mute

- **WHEN** the player presses the mute button during a fight
- **THEN** the music and the effects fall silent at once, and pressing it again brings them back at their slider levels

#### Scenario: Old save

- **WHEN** a save written before this change is resumed
- **THEN** music is at 50, effects at 80, not muted

### Requirement: Audio unlock

The audio engine SHALL start on the first pointer or key event on the page, whichever screen it happens on, and SHALL play nothing before that. A game reloaded in progress SHALL get its music on the first interaction.

#### Scenario: Reload mid-game

- **WHEN** the page is reloaded during a scenario and the player taps anything
- **THEN** the scenario's music starts and later effects play

### Requirement: Sound manifest and provenance

Every clip and track SHALL be an entry in `content/sounds/sounds.json` with its id, source URL, author, licence (CC0 only), trim and loop points, and what it serves (an event, a UI moment, a trait or a card code). The converted files SHALL be committed under `public/sounds/`, produced by an import script from the originals with ffmpeg: effects as mono MP3 normalised to −18 LUFS integrated with a −1 dBTP peak, music as AAC and Opus normalised to −23 LUFS; a clip's `gain` is a mix offset between 0.5 and 1.5 after that. The content check SHALL fail when a manifest entry lacks its files, its licence is not CC0, its target is unknown, or a converted effect's integrated loudness is more than 2 LU from the target. Effects SHALL total at most 1.5 MB and music at most 12 MB. The README SHALL credit the sources.

#### Scenario: Missing file

- **WHEN** a manifest entry's converted file is absent
- **THEN** `check:content` reports it and fails

#### Scenario: Wrong licence

- **WHEN** a manifest entry's licence is anything but CC0
- **THEN** `check:content` reports it and fails

#### Scenario: Even loudness

- **WHEN** the effects are imported
- **THEN** every converted effect measures at most 2 LU above −18 LUFS and none peaks above −1 dBTP, and any measuring more than 2 LU below is a transient held by the −2 dBTP peak ceiling

### Requirement: Sound candidates

For every sound slot (each event and variant, each UI moment, each trait and card sound, and each music role) the import SHALL gather ten to fifteen (twelve by default) CC0 candidates besides the current clip into `sounds-src/candidates/<slot>/` (untracked), each listed in `content/sounds/candidates.json` with its source URL, author, licence, original file and a short description, so a choice can be audited and the download repeated. A candidate whose licence is not CC0 SHALL be refused by the content check. The candidates file SHALL be committed; the candidate audio SHALL NOT.

#### Scenario: A dozen per slot

- **WHEN** `npm run import:sounds -- --candidates` finishes
- **THEN** every slot of the manifest has twelve candidates listed with provenance, and their files are under `sounds-src/candidates/`

#### Scenario: A repeatable download

- **WHEN** `sounds-src/candidates/` is deleted and the command is run again
- **THEN** the same files come back from the listed sources

### Requirement: Audition picker

Under the development server, the Debug panel SHALL open a Sounds screen listing every sound slot with its name, where it plays, its current clip, its candidates and "no sound". Each clip SHALL play on a tap through the game's own audio engine at the gain it would have in play (the effects or music slider as set, the clip's gain, the normalised level), so clips are compared as they would be heard; a music candidate plays a 10-second excerpt from its loop start. Tapping a clip SHALL play it and mark it as the slot's choice (the current clip, a candidate, or "no sound"); the marks SHALL be kept in the browser until every slot has one, and only then SHALL Apply be offered. Apply writes every choice into `content/sounds/sounds.json` at once (each candidate's provenance moved in, the file name set) and converts the chosen clips, so the game plays them on the next load, without reloading the page under the picker; "no sound" sets a moment to "none". The screen SHALL NOT be in the production build.

#### Scenario: Choose a clip

- **WHEN** the developer taps the third candidate of the "draw" moment, marks a choice in every other slot and presses Apply
- **THEN** the candidate plays at in-game level when tapped, becomes the moment's clip in the manifest on Apply, and a card drawn after a reload makes that sound

#### Scenario: Not shipped

- **WHEN** the production build is made
- **THEN** it holds no Sounds screen and no candidate audio
