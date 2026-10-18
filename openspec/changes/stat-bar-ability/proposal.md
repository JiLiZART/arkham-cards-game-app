## Why

Since the player bar arrived, an investigator's own ability (Roland's "after you defeat an enemy", Daisy's free tome action, Agnes's horror ability) is offered only in the avatar sheet, which opens by clicking the investigator's own avatar in the top bar. Nothing on the table says so, and the stat bar in the bottom-left shows the ability text with no button, so in play the ability looks unusable. With `bar-hover-sheet` the click on one's own avatar stops opening the sheet at all with a mouse, so the ability needs its place back.

## What Changes

- The stat bar in the bottom-left shows the investigator's ability options as buttons under the ability text whenever the pending choice offers them, lit as the rail's buttons are; tapping one uses the ability. The portrait and the bar glow while an ability can be used, as the avatar does.
- The avatar sheet keeps the same buttons, so the phone layout (no stat bar) still has them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `game-table-ui`: the stat bar offers the investigator's ability options.

## Impact

- `src/ui/hud/Stats.tsx` (`StatBar` passes the investigator's ability options to `StatBody`, which already renders them), styles for the lit state; a test; the drive scripts can use the ability from the bar.
