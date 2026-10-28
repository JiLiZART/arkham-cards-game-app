# fullscreen Specification

## Purpose

The fullscreen toggle on the title screen and the phone's game top bar: where it appears, how the page's fullscreen support is detected, and the one-time ask to play fullscreen (with an Add to Home Screen hint where the browser has no fullscreen API).

## Requirements

### Requirement: Fullscreen toggle

The app SHALL offer a fullscreen toggle on the title screen (beside the menu, as an icon button) and in the game's top bar on the phone layout. The toggle SHALL appear only when the page can enter fullscreen (`document.fullscreenEnabled` and an element-level `requestFullscreen`, with the WebKit-prefixed form accepted); where the API is missing, as on iPhone Safari, no toggle is shown. Pressing it SHALL request fullscreen on the app's root element, or exit fullscreen while in it; the icon reflects the state and the label is in the player's language. Leaving fullscreen by the browser's own gesture SHALL update the icon.

#### Scenario: Android phone

- **WHEN** the title screen opens in Chrome on an Android phone
- **THEN** a fullscreen icon button is shown, and tapping it puts the app in fullscreen with the icon switched to the exit form

#### Scenario: iPhone

- **WHEN** the title screen opens in Safari on an iPhone
- **THEN** no fullscreen button is shown

#### Scenario: Browser exits

- **WHEN** the player presses Escape (or the system gesture) while in fullscreen on a desktop
- **THEN** the toggle shows the enter form again

### Requirement: One-time fullscreen ask

The first time the phone layout is in force on a device, the app SHALL show a one-line ask: at the bottom edge of a menu screen, under the top bar in a game: "Play fullscreen?" with Enter and Not now. Enter requests fullscreen; either answer dismisses the ask and remembers it in local storage, so it never shows again on that device. Where the Fullscreen API is missing, the ask SHALL instead read as a one-line hint to add the page to the Home Screen for a full-screen table, with a single dismiss, remembered the same way. The ask SHALL never cover a control and SHALL not appear on the desktop layout.

#### Scenario: First visit on a phone

- **WHEN** the app opens for the first time at 852×393 in a browser with the Fullscreen API
- **THEN** the ask shows at the bottom edge; tapping Enter puts the app in fullscreen and the ask is gone on the next visit

#### Scenario: Declined

- **WHEN** the player taps Not now
- **THEN** the ask closes, and reopening the app on that device shows no ask

#### Scenario: iPhone hint

- **WHEN** the app opens for the first time in Safari on an iPhone
- **THEN** the line hints at Add to Home Screen with a single dismiss, and no fullscreen request is attempted
