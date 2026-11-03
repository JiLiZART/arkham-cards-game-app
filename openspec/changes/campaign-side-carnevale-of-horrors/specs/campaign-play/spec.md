## ADDED Requirements

### Requirement: Carnevale of Horrors plays to its resolutions

The campaign `side-carnevale-of-horrors` SHALL be hand-written under `content/campaigns/`. Its chaos bag SHALL be the guide's: Standard `+1 0 0 0 -1 -1 -1 -2 -3 -4 -6` and Hard `+1 0 0 0 -1 -1 -3 -4 -5 -6 -7`, each with three skulls, cultist, tablet, elder thing, auto-fail and elder sign; Easy SHALL use the Standard bag and Expert the Hard bag. Setup SHALL remove one random location that is neither San Marco Basilica nor Canal-side, place the other eight in a random circle connected clockwise only, put the Abbess Allegria Di Biase at San Marco, shuffle the seven Masked Carnevale-Goers face down one to each location other than San Marco, and set aside Cnidathqua and the four masks. The token table SHALL follow 82001 on every difficulty. The scenario SHALL end in R1 when act 3 completes, in R2 when Cnidathqua is defeated, and in no resolution otherwise; the flow SHALL compute the rewards from the number of Innocent Revelers beneath the act and beneath the agenda without asking. Played standalone the scenario SHALL cost no experience.

#### Scenario: Setup

- **WHEN** a new Carnevale of Horrors game starts on Standard with two investigators
- **THEN** eight locations are in play, each connected only to the next one clockwise, the Abbess is at San Marco, six Masked Carnevale-Goers lie face down at the six other locations, the investigators are at San Marco, and the chaos bag holds 19 tokens with a −6 and no −8

#### Scenario: Skull counts revelers

- **GIVEN** two Innocent Revelers beneath the agenda on Standard
- **WHEN** a skull is revealed
- **THEN** the modifier is −4 (−2 and −1 per reveler beneath the agenda); on Hard the revelers beneath the act count too

#### Scenario: Elder thing summons Cnidathqua

- **GIVEN** Cnidathqua in play and a failed test on an elder thing
- **THEN** Cnidathqua attacks the investigator who revealed it, though it is at no location

#### Scenario: Resolution 1 rewards

- **GIVEN** act 3 completed with three revelers beneath the act and one beneath the agenda
- **WHEN** the resolution runs
- **THEN** the log records that the sun banished Cnidathqua, each investigator earns the victory experience, and the Abbess is offered as a reward because more revelers were saved than sacrificed

#### Scenario: Choosing masks

- **WHEN** a resolution reaches the mask step with three investigators
- **THEN** each investigator in player order may add one of the four masks not yet taken to their deck outside its size, or none
