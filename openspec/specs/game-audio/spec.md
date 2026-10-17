# game-audio Specification

## Purpose
Sound for the table: effects on the moments the screen marks, trait-based card sounds, scenario music that follows the state of play, and the controls and provenance around them.

## Requirements

### Requirement: Effects on the animation clock
An effect SHALL play when its engine event starts playing on screen (the moment the event player begins it), not when the event is logged, so the sound matches the float and the dim at every pace. The events with a sound: chaos token draw (a bag rattle when the circles appear, a clink on the reveal), test result (success chime, fail thud), encounter card, attack, spawn, enemy move, damage, horror, clues, doom, agenda advance, act advance, enemy defeated, investigator defeated, resolution. Events skipped without animation (the Debug panel, scripts) SHALL make no sound. Several effects MAY overlap when their events overlap.

#### Scenario: Tap pace
- **GIVEN** the pace is Tap and an attack and its damage are queued
- **WHEN** the attack starts playing
- **THEN** the strike plays then, and the hit plays only when the damage event starts after the tap, not before

#### Scenario: Skipped events
- **WHEN** queued events are skipped
- **THEN** no effect plays for them

### Requirement: Effects for UI moments
The following moments, which have no engine event of their own, SHALL play an effect: a card drawn into the fan or sent from the showcase (slide), a card played to the strip (snap), a card turned over on the map or in the showcase (flip), a card committed to a test (soft snap), the mulligan redraw (shuffle), a phase title appearing (drone swell), a button or rail option pressed (click), a tip appearing (soft pop), the hand-off screen appearing (two notes), undo (rewind tick).

#### Scenario: Playing a card
- **WHEN** Roland plays Machete and it lands in the strip
- **THEN** the snap plays once as it lands

### Requirement: Card sounds by trait
When a card has a matching entry, its sound SHALL replace the generic one: on play (the card's trait sound instead of the snap), when a fight test starts with the card as its source (the weapon's sound), and on spawn (a growl variant by the enemy's traits). Matching SHALL be by card code first, then by the card's traits in the manifest's order, then the generic clip. The manifest maps traits and card codes to clips; adding a card sound SHALL need no code change.

#### Scenario: Firearm
- **WHEN** Roland fights with the .45 Automatic
- **THEN** the gunshot plays when the test starts, in place of nothing

#### Scenario: Unknown trait
- **WHEN** a card with no code entry and no mapped trait is played
- **THEN** the generic snap plays

### Requirement: Scenario music
While a scenario is in play and the tab is visible, music SHALL play: the scenario's ambient bed, replaced by the shared tension track while the agenda is one doom from advancing or the enemy phase is playing, replaced by the shared fight track while any enemy is engaged with an investigator. Priority is fight, then tension, then bed. Track changes SHALL crossfade over about 1.5 seconds, and a track SHALL loop without an audible seam. Music SHALL pause when the tab is hidden and resume when it is shown. The menu, the campaign log and the scenario's end screen SHALL be silent. Music files SHALL load after the game starts, not with the menu.

#### Scenario: Engagement
- **WHEN** a Ghoul Minion engages Roland
- **THEN** the fight track fades in over the bed within 2 seconds
- **WHEN** the Ghoul is defeated and no enemy is engaged
- **THEN** the bed fades back in

#### Scenario: Hidden tab
- **WHEN** the player switches to another app or tab during a scenario
- **THEN** the music pauses, and continues from where it was when they return

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
Every clip and track SHALL be an entry in `content/sounds/sounds.json` with its id, source URL, author, licence (CC0 only), trim and loop points, and what it serves (an event, a UI moment, a trait or a card code). The converted files SHALL be committed under `public/sounds/`, produced by an import script from the originals with ffmpeg: effects as mono MP3, music as AAC and Opus. The content check SHALL fail when a manifest entry lacks its files, its licence is not CC0, or its target is unknown. Effects SHALL total at most 1 MB and music at most 10 MB. The README SHALL credit the sources.

#### Scenario: Missing file
- **WHEN** a manifest entry's converted file is absent
- **THEN** `check:content` reports it and fails

#### Scenario: Wrong licence
- **WHEN** a manifest entry's licence is anything but CC0
- **THEN** `check:content` reports it and fails
