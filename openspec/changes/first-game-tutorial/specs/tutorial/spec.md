## Purpose

Teaches a first-time player how to play while they play: one tip at a time, pointed at the thing it is about, shown the first time each situation comes up, plus a short how-to-play summary in the menu.

## ADDED Requirements

### Requirement: Tips shown once, at the right moment
With tips on, the first time each of the following situations comes up on this device, a tip card SHALL appear with one or two plain sentences and an arrow to what it is about:
- the scenario starts: the goal, the act and the agenda;
- the mulligan: which cards to keep;
- your turn: the three actions and where they are counted;
- investigating: tap your location or Investigate to look for clues;
- moving: drag your portrait to a connected location;
- playing a card: tap a glowing card, resources are its cost;
- a skill test: your skill against the difficulty, commit cards with matching icons, then Done;
- the chaos token: tap a circle to draw it;
- an enemy appears: fight or evade it, it attacks in the enemy phase;
- taking damage or horror: health and sanity, defeat at zero;
- the mythos phase: doom on the agenda, an encounter card each;
- upkeep: ready, draw and gain a resource, hand limit of 8;
- ending the turn;
- undo.

A tip appears only when nothing is playing, nothing holds the middle of the screen, and the game is waiting for the player the tip addresses. Only one tip shows at a time. A tip never covers the middle of the screen and never blocks input: everything stays tappable. It goes away when the player does what it says, when the situation passes, or when they tap "Got it". A tip seen that way is not shown again on this device. Tips are shown in the game's language.

#### Scenario: First test
- **WHEN** Roland investigates for the first time on this device and the commit prompt is offered
- **THEN** the skill test tip appears beside the test panel, pointing at the hand, and goes when he presses Done
- **WHEN** he investigates again
- **THEN** no tip appears

#### Scenario: Tip waits for the showcase
- **WHEN** the upkeep tip would be shown while drawn cards are in the showcase
- **THEN** it appears only after the cards have gone to the hand

#### Scenario: Got it
- **WHEN** the player taps "Got it" on the moving tip without moving
- **THEN** the tip goes and is not shown again

### Requirement: Tips setting
The menu SHALL have a "Show tips" setting, on by default and saved with the other settings, and a "Reset tips" action that forgets which tips were seen. With tips off no tip is shown.

#### Scenario: Reset
- **WHEN** the player chooses Reset tips and starts a new scenario
- **THEN** the scenario-start tip appears again

### Requirement: How to play page
The menu SHALL offer a "How to play" page: a short summary in five parts (the goal, a round, your turn, skill tests, enemies and harm), each a few sentences in plain words, in the game's language, with a Back button.

#### Scenario: Reading before the first game
- **WHEN** the player opens How to play from the menu in Russian
- **THEN** the five parts are shown in Russian and Back returns to the menu
