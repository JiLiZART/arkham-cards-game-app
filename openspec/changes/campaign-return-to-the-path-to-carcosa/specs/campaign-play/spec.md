## ADDED Requirements

### Requirement: Return to The Path to Carcosa content

The content SHALL hold Return to The Path to Carcosa as a hand-kept campaign under `content/campaigns/return-to-the-path-to-carcosa/` with the 8 Return scenarios in the base order and the base interludes and epilogue. Each SHALL set up as its base scenario does and then as its Return-to setup card (52014, 52021, 52028, 52034, 52040, 52048, 52054, 52059) says, use the replacement encounter sets of the box in place of the sets they replace, play the full act and agenda decks with their Return-to versions, use its base scenario's chaos token table, run its base scenario's script extended by the box's rules, and end in the base scenario's resolutions.

#### Scenario: Return to Curtain Call

- **WHEN** Return to Curtain Call's act 1 advances
- **THEN** act 2 is one of 03047a, 03047b, 03047c, 52015, 52016 or 52017 at random, the setup card 52014 is attached to Royal Emissary, and after Royal Emissary is added to the victory display and returns it has one warning and 1 extra health per investigator

#### Scenario: Return to The Last King

- **WHEN** Return to The Last King starts with two investigators
- **THEN** the agenda deck is 52022 then 03063, eight Sickening Reality cards lie beneath the reference card, Shocking Display is set aside, Dianne Devine 52025 is the one spawned by agenda 1b and the base Dianne is not in the game, and a Bystander with a Party Guest cannot be parleyed with until the guest is paid off

#### Scenario: Return to Echoes of the Past

- **WHEN** Return to Echoes of the Past starts
- **THEN** Entry Hall, three Quiet Halls and eight Historical Societies (two per floor, Basement included) are in play, both Keepers of the Oath are set aside, and when act 2 is revealed a Keeper spawns at an empty Historical Society

#### Scenario: Return to The Unspeakable Oath

- **GIVEN** a log with 2 Conviction and 3 Doubt
- **WHEN** Return to The Unspeakable Oath starts
- **THEN** act 2 is 52036 (v. IV), neither base act 2 is in the game, and Host of Insanity and Radical Treatment are set aside

#### Scenario: Return to A Phantom of Truth

- **WHEN** Return to A Phantom of Truth starts
- **THEN** each of Montparnasse, Grand Guignol, Père Lachaise Cemetery, Canal Saint-Martin, Notre-Dame and Gardens of Luxembourg is the base or the Return-to version at random, never both, and after The Organist enters play both Figure in the Shadows and the encounter discard are shuffled into the encounter deck

#### Scenario: Return to The Pallid Mask

- **WHEN** Return to The Pallid Mask starts
- **THEN** the Catacombs pool holds 52049–52052, four Catacombs other than the start, the Tomb and Blocked Passage were removed unseen, and during act 2 The Man in the Pallid Mask stays in the Tomb of Shadows

#### Scenario: Return to Black Stars Rise

- **WHEN** Return to Black Stars Rise starts
- **THEN** either both base Cloister and Knight's Hall or both 52055 and 52056 are set aside, never a mix, and Hastur's Gaze and Hastur's Grasp react to doom placed on the c and a agenda decks

#### Scenario: Return to Dim Carcosa

- **GIVEN** no investigator knows the secret
- **WHEN** Hastur would take damage below 2 per investigator
- **THEN** his damage stops at that floor, Hastur's Domain (52060) stands where the Palace of the King would, and flipping it puts the set-aside location matching Hastur's version into play with the Palace's connections

### Requirement: Replacement encounter sets as a Carcosa option

A new The Path to Carcosa campaign SHALL offer the option to use the Return to The Path to Carcosa replacement encounter sets, through the campaign option mechanism `scenario-import-fixes` defines: chosen at creation, off by default, fixed for the campaign. With the option on, each scenario SHALL gather Delusory Evils for Ancient Evils, Neurotic Fear for Striking Fear, Hastur's Envoys for Agents of Hastur, Decaying Reality for Decay and Filth, and Maddening Delusions for Delusions.

#### Scenario: Option on

- **GIVEN** a The Path to Carcosa campaign created with the replacement sets option on
- **WHEN** Curtain Call starts
- **THEN** the encounter deck holds Maddening Delusions and Neurotic Fear and none of Delusions or Striking Fear

#### Scenario: Option off

- **GIVEN** a The Path to Carcosa campaign created with the option off
- **WHEN** any of its scenarios starts
- **THEN** no card of the five replacement sets is in the encounter deck
