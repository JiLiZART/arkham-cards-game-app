## MODIFIED Requirements

### Requirement: Title screen and settings

The game SHALL open on a title screen: the title, Continue (only while a game, a campaign or a save exists at that moment), New campaign, How to play, and a gear that opens the settings screen. Settings hold language, private hands, drawing tokens by hand, pace, tips, Reset tips, music and sound effects; Back returns to the title. "Draw chaos tokens by hand" SHALL start off on a fresh device; a saved setting keeps its value. The campaign log is reached from Continue when a campaign is between scenarios, and from the game's Menu button. Abandon campaign on the title clears the campaign and the save and leaves the title without Continue; it never needs a reload to take effect. On the phone layout the title's menu SHALL be a compact grid of 44 px buttons with 16 px labels and 6 px gaps, the title heading at most 48 px tall with its rule, so that the whole menu fits a 393 px tall screen without scrolling, and the fullscreen toggle sits in the top-right corner beside the language picker where the page can go fullscreen.

The language picker SHALL be one native select listing every locale the content holds, each option its endonym (`lang.name`, "Deutsch", "한국어", "简体中文"…) in its own `lang`, sorted by tag, the current locale selected; the same picker stands in the corner of every menu screen, in the game's top bar on the phone, and in the Settings language row. Choosing a locale SHALL load its text, then re-render every screen in it, set `html[lang]` to the tag and keep the choice on the device. The first visit SHALL open in the browser's language when the content has it (`zh-TW`, `zh-HK` and `zh-Hant` as `zh-hant`; `zh`, `zh-CN`, `zh-SG` and `zh-Hans` as `zh-hans`; a regional tag such as `pt-BR` or `de-AT` by its primary subtag), else in English. Dates the UI writes (a default deck name) SHALL format with the locale's tag.

#### Scenario: Cold load

- **WHEN** the app loads with no save
- **THEN** the title shows New campaign and How to play, no Continue, and the gear

#### Scenario: Continue with a save

- **WHEN** the app loads with a saved scenario in progress
- **THEN** Continue is the first button and restores the game

#### Scenario: Abandon

- **WHEN** the player presses Abandon campaign on the title
- **THEN** the campaign and the save are gone and the title shows no Continue, without a reload; pressing New campaign opens the wizard

#### Scenario: Fresh defaults

- **WHEN** the app loads on a device with no saved settings
- **THEN** Settings shows "Draw chaos tokens by hand" and "Tap decks to draw" both off

#### Scenario: Eleven languages in the picker

- **WHEN** the title screen opens
- **THEN** the picker in the corner lists de, en, es, fr, it, ko, pl, pt, ru, zh-hans and zh-hant by their endonyms, and the Settings row lists the same

#### Scenario: Switch to Korean during a game

- **WHEN** Roland's turn is on the table in English and the player picks 한국어 in the top bar
- **THEN** the hand, the feed, the act and agenda names and the campaign title read in Korean where Korean text exists, the instruction bar in English, with the same state and no reload

#### Scenario: Browser language on first visit

- **WHEN** the app opens for the first time in a browser whose language is `zh-TW`
- **THEN** the title screen is in Traditional Chinese and `html[lang]` is `zh-hant`; a browser in `nl` opens in English

#### Scenario: Deck name date

- **WHEN** a custom deck is saved for Roland on 17 October with the locale `de`
- **THEN** its default name reads "Roland · 17. Okt."
