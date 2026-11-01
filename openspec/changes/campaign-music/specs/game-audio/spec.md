## MODIFIED Requirements

### Requirement: Scenario music

While a scenario is in play and the tab is visible, music SHALL play: the chapter's track, replaced by the tension track (the scenario's own, else the shared one) while the agenda is one doom from advancing or the enemy phase is playing, replaced by the fight track while any enemy is engaged with an investigator. Priority is fight, then tension, then the chapter's track. The chapter's track SHALL be the one keyed to the current agenda card, else the one keyed to the current act card, else the scenario's bed, else the default bed. A track marked silent in the manifest SHALL keep its slot, files and candidates but never play: the music that was on goes on. The shared tension track is silent, so a scenario without its own keeps the chapter's track through the enemy phase. A track MAY have an alternate take; each game SHALL start each track on the take its seed picks, so the same seed sounds the same. The menu screens (main menu, new game wizard, deck builder, campaign log, settings) SHALL play the menu theme, one take picked per page load; the scenario's end screen SHALL be silent. Track changes, between the menu and the table included, SHALL crossfade over about 1.5 seconds, and a looping track SHALL loop without an audible seam: its loop points are in the manifest and the content check SHALL fail when the track's level at the loop start and loop end differs by more than 6 dB. A track that does not loop (a composed piece with an intro and an ending) SHALL crossfade into its other take, or into itself when it has none, about 1.5 seconds before it ends, and so on for as long as it is wanted. Music SHALL pause when the tab is hidden and resume when it is shown. A scenario's music files SHALL load when they are first played, not with the menu.

#### Scenario: Engagement

- **WHEN** a Ghoul Minion engages Roland
- **THEN** the fight track fades in over the chapter's track within 2 seconds
- **WHEN** the Ghoul is defeated and no enemy is engaged
- **THEN** the fight track fades out and the chapter's track fades back in

#### Scenario: Evaded

- **WHEN** Roland evades the only enemy engaged with him
- **THEN** the fight track fades out, though the enemy stays at his location

#### Scenario: Silent tension

- **WHEN** The Gathering's enemy phase begins, its tension being the shared track marked silent
- **THEN** the chapter's track keeps playing

#### Scenario: Chapter

- **WHEN** The Gathering's act advances from Trapped to The Barrier
- **THEN** The Barrier's track crossfades in

#### Scenario: Agenda before act

- **WHEN** The Midnight Masks starts, with Predator or Prey? as agenda and Uncovering the Conspiracy as act
- **THEN** Predator or Prey?'s track plays, and Uncovering the Conspiracy plays as the scenario's tension track

#### Scenario: Same seed, same take

- **WHEN** two games of The Gathering start with the same seed
- **THEN** both start Trapped on the same take

#### Scenario: A piece with an ending

- **WHEN** Trapped's first take is 1.5 seconds from its end
- **THEN** its other take fades in as it fades out, with no silence between them

#### Scenario: Menu

- **WHEN** the player leaves the table for the main menu
- **THEN** the scenario's track fades out and the menu theme fades in

#### Scenario: Hidden tab

- **WHEN** the player switches to another app or tab during a scenario
- **THEN** the music pauses, and continues from where it was when they return

#### Scenario: Seam

- **WHEN** a bed's loop end is 6 dB louder than its loop start
- **THEN** `check:content` reports the seam and fails

### Requirement: Sound manifest and provenance

Every clip and track SHALL be an entry in `content/sounds/sounds.json` with its id, author, licence, trim and loop points, and what it serves (an event, a UI moment, a trait, a card code or a music role). The licence SHALL be CC0, `own` (made by the project's author) or `provided` (supplied by the project's author, origin not recorded); a CC0 entry SHALL carry its source URL. The converted files SHALL be committed under `public/sounds/`, produced by an import script from the originals with ffmpeg: effects as mono MP3 normalised to −18 LUFS integrated with a −1 dBTP peak, music as AAC and Opus normalised to −23 LUFS; a clip's `gain` is a mix offset between 0.5 and 1.5 after that. The content check SHALL fail when a manifest entry lacks its files, its licence is not one of those three, a CC0 entry has no source, its target is unknown, or a converted effect's integrated loudness is more than 2 LU from the target. Effects SHALL total at most 1.5 MB and music at most 50 MB. The README SHALL credit the sources.

#### Scenario: Missing file

- **WHEN** a manifest entry's converted file is absent
- **THEN** `check:content` reports it and fails

#### Scenario: Wrong licence

- **WHEN** a manifest entry's licence is CC-BY
- **THEN** `check:content` reports it and fails

#### Scenario: CC0 without a source

- **WHEN** a CC0 entry has no source URL
- **THEN** `check:content` reports it and fails

#### Scenario: Even loudness

- **WHEN** the effects are imported
- **THEN** every converted effect measures at most 2 LU above −18 LUFS and none peaks above −1 dBTP, and any measuring more than 2 LU below is a transient held by the −2 dBTP peak ceiling

### Requirement: Sound candidates

For every sound slot whose clip is CC0 (each event and variant, each UI moment, each trait and card sound, and each music role) the import SHALL gather ten to fifteen (twelve by default) CC0 candidates besides the current clip into `sounds-src/candidates/<slot>/` (untracked), each listed in `content/sounds/candidates.json` with its source URL, author, licence, original file and a short description, so a choice can be audited and the download repeated. A slot whose clip is `own` or `provided` needs no candidates. A candidate whose licence is not CC0 SHALL be refused by the content check. The candidates file SHALL be committed; the candidate audio SHALL NOT.

#### Scenario: A dozen per slot

- **WHEN** `npm run import:sounds -- --candidates` finishes
- **THEN** every CC0 slot of the manifest has twelve candidates listed with provenance, and their files are under `sounds-src/candidates/`

#### Scenario: The author's own track

- **WHEN** a music role's track has the licence `own`
- **THEN** `check:content` asks for no candidates for it

#### Scenario: A repeatable download

- **WHEN** `sounds-src/candidates/` is deleted and the command is run again
- **THEN** the same files come back from the listed sources
