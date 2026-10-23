## ADDED Requirements

### Requirement: Campaigns imported from the campaign guides

A command SHALL generate `content/campaigns/<id>/campaign.json` and its `scenarios/*.json` from ArkhamCards' campaign guides (`inspired/ArkhamCards/assets/generated/all_campaigns.txt`) for every official campaign whose scenarios' encounter sets and cards exist in the snapshot; fan-made campaigns and scenarios with unknown sets are skipped and listed. Per scenario it SHALL take the scenario reference card, the encounter sets, the acts and agendas of the scenario's sets in stage order, the locations put into play and the starting location (from the location layout, or from the setup text by card name), the cards set aside (by name), the layout, the chaos-token modifiers per difficulty (read from the scenario reference card; a value it cannot read becomes −2 and is listed), and the resolutions with the campaign log records and experience they grant. Location connections are not in any source: neighbouring locations in the guide's layout are connected, and a scenario without a layout connects every location in play. Per campaign it SHALL take the chaos bag of each difficulty (tokens the engine does not know, such as frost, are left out and listed), the scenario order, the log labels and the packs its cards come from. Generated files carry `"generated": true`; a hand-written campaign with the same id is never overwritten. Reruns give identical files.

#### Scenario: Extracurricular Activity

- **WHEN** the import runs
- **THEN** `extracurricular-activity.json` names the reference card 02041, the Extracurricular Activity, Sorcery, The Beyond, Bishop's Thralls, Whippoorwills, Ancient Evils, Locked Doors and Agents of Yog-Sothoth sets, puts the six campus locations into play, starts at the Miskatonic Quad, and sets aside the Dormitories and the Alchemy Labs

#### Scenario: Fan-made campaigns skipped

- **WHEN** the import runs
- **THEN** no campaign is written for Alice in Wonderland, and the summary lists it as skipped

#### Scenario: Night of the Zealot kept

- **WHEN** the import runs
- **THEN** `content/campaigns/night-of-the-zealot/` is unchanged
