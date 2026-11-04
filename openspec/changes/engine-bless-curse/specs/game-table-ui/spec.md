## MODIFIED Requirements

### Requirement: Chaos bag modal

The chaos bag SHALL be shown in the top-right corner of the screen with its token count. Clicking it SHALL open a modal listing every token currently in the bag, grouped by kind, each with its icon and count, for example −1 ×3. Sealed or removed tokens are not listed. The modal SHALL also show the scenario reference card for the current difficulty, which explains the special tokens. The modal SHALL close on Escape or on a click outside it.

The modal SHALL list bless and curse tokens in the bag like any other kind, and beside them how many of each are left in the pool. A card holding sealed tokens SHALL show them on its frame on the map and in the play area strip, and its card detail SHALL list them; the bag's count excludes them.

#### Scenario: Standard bag

- **WHEN** the player clicks the chaos bag in The Gathering on Standard
- **THEN** the modal lists +1 ×1, 0 ×2, −1 ×3, −2 ×2, −3 ×1, −4 ×1, skull ×2, cultist ×1, tablet ×1, auto-fail ×1 and elder sign ×1, next to The Gathering's reference card

#### Scenario: Bless and curse in the bag

- **GIVEN** 3 bless and 1 curse tokens added during the scenario
- **WHEN** the player opens the modal
- **THEN** it lists bless ×3 and curse ×1 with "7 left" and "9 left" beside them

#### Scenario: A sealed token on a card

- **WHEN** The Chthonian Stone seals a skull
- **THEN** the skull icon sits on the card's frame in the play area strip, the bag's count drops by one, and the modal no longer lists that skull
