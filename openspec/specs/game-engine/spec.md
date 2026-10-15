# game-engine Specification

## Purpose
The deterministic rules engine: game state, recorded choices that replay exactly, phase flow, and the facts the table UI reads from the log.

## Requirements

### Requirement: Phase pacing
A game whose setup asks for paced phases SHALL pause before each mythos, investigation, enemy and upkeep phase begins. The pause is a pending choice for the lead investigator (the first active investigator if the lead is out), with a single "continue" option. The phase-begins log entry and the phase's own steps come only after it is chosen. A pause after the scenario has ended is skipped.

The choice is recorded like any other, so replaying the same setup and choices gives the same game. The bot chooses "continue". Setups that don't ask for pacing, including the engine tests' default and saves made before this change, never pause, and replay their recorded choices unchanged.

#### Scenario: Enemy phase waits
- **WHEN** in a paced game the last investigator ends their turn
- **THEN** the pending choice is the lead investigator's "continue" for the enemy phase, and no enemy has attacked yet
- **WHEN** "continue" is chosen
- **THEN** the log shows the enemy phase beginning and the enemy phase resolves

#### Scenario: Old save
- **WHEN** a save made without pacing is loaded
- **THEN** its choices replay to the same state as before, with no pauses

### Requirement: Reveal counter
The game state SHALL count every point at which hidden information enters the game:
- a chaos token is drawn;
- a card is drawn or revealed from any deck (player deck, encounter deck);
- deck cards are looked at or searched;
- a deck is shuffled;
- the random generator is used.

A choice whose resolution leaves the counter unchanged revealed nothing, so the UI may undo it.

#### Scenario: Move vs draw
- **WHEN** Roland moves to an adjacent revealed location
- **THEN** the reveal counter is unchanged
- **WHEN** he takes the Draw action
- **THEN** the reveal counter has gone up

#### Scenario: Skill test
- **WHEN** Roland starts a Fight and commits a card
- **THEN** the counter is unchanged
- **WHEN** the commit window closes and the chaos token is drawn
- **THEN** the counter has gone up

### Requirement: Event sources
Log events for an investigator taking damage or horror, or losing resources, clues or actions because of a card's effect SHALL name that card as their source, in `data.source`. Damage from an enemy attack names the enemy. Events with no card behind them, such as a chaos token's effect, have no source.

#### Scenario: Attic
- **WHEN** Roland enters the Attic and takes 1 horror from its forced ability
- **THEN** the damage event's source is the Attic

#### Scenario: Enemy attack
- **WHEN** an engaged Ghoul attacks Roland in the enemy phase
- **THEN** the damage event's source is the Ghoul
