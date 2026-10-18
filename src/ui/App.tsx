import { useEffect } from "react";
import { contentErrors } from "../content";
import { gameStore, useGame } from "./context";
import { HandFan } from "./hud/HandFan";
import { HandDrawer } from "./hud/HandDrawer";
import { Hud } from "./hud/Hud";
import { CampaignLog } from "./menu/CampaignLog";
import { HowTo } from "./menu/HowTo";
import { Settings } from "./menu/Settings";
import { Title } from "./menu/Title";
import { Wizard } from "./menu/NewGame";
import { Table } from "./scene/Table";
import { useView } from "./view";
import { useLayout } from "./layoutMode";
import { installTouch } from "./touch";

export function App() {
  const screen = useGame((s) => s.screen);
  const game = useGame((s) => s.game);
  const testing = useView((s) => s.testing);
  const { mode } = useLayout();
  useEffect(() => {
    gameStore.getState().resume();
  }, []);
  // touch: tap to peek, tap again to choose, long press for the card (mouse unchanged)
  useEffect(() => installTouch(), []);
  if (contentErrors.length) {
    return (
      <div className="screen">
        <h1>Content errors</h1>
        {contentErrors.map((e, k) => (
          <div key={k}>{e.file} {e.path}: {e.message}</div>
        ))}
      </div>
    );
  }
  if (screen === "game" && game) {
    return (
      <div className={`game ${mode} ${testing ? "testing" : ""}`}>
        <Table />
        <Hud />
        {mode === "phone" ? <HandDrawer /> : <HandFan />}
      </div>
    );
  }
  if (screen === "log") return <CampaignLog />;
  if (screen === "howto") return <HowTo />;
  if (screen === "wizard") return <Wizard />;
  if (screen === "settings") return <Settings />;
  return <Title />;
}
