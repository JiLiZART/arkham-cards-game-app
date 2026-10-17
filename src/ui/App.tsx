import { useEffect } from "react";
import { contentErrors } from "../content";
import { gameStore, useGame } from "./context";
import { HandFan } from "./hud/HandFan";
import { Hud } from "./hud/Hud";
import { CampaignLog } from "./menu/CampaignLog";
import { HowTo } from "./menu/HowTo";
import { Settings } from "./menu/Settings";
import { Title } from "./menu/Title";
import { Wizard } from "./menu/NewGame";
import { Table } from "./scene/Table";
import { useView } from "./view";

export function App() {
  const screen = useGame((s) => s.screen);
  const game = useGame((s) => s.game);
  const testing = useView((s) => s.testing);
  useEffect(() => {
    gameStore.getState().resume();
  }, []);
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
      <div className={`game ${testing ? "testing" : ""}`}>
        <Table />
        <Hud />
        <HandFan />
      </div>
    );
  }
  if (screen === "log") return <CampaignLog />;
  if (screen === "howto") return <HowTo />;
  if (screen === "wizard") return <Wizard />;
  if (screen === "settings") return <Settings />;
  return <Title />;
}
