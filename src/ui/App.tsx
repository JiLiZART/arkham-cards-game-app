import { useEffect } from "react";
import { contentErrors } from "../content";
import { gameStore, useGame } from "./context";
import { Hud } from "./hud/Hud";
import { CampaignLogScreen, MenuScreen } from "./Screens";
import { Table } from "./scene/Table";

export function App() {
  const screen = useGame((s) => s.screen);
  const game = useGame((s) => s.game);
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
      <div className="game">
        <Table />
        <Hud />
      </div>
    );
  }
  if (screen === "log") return <CampaignLogScreen />;
  return <MenuScreen />;
}
