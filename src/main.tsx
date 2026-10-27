import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { gameStore } from "./ui/state/context";
import { loadSprite } from "./ui/assets/icons";
import { useView } from "./ui/state/view";
import "./ui/styles.css";

// the icon sprite is in the document before the first screen: icons never flash blank (without it, text badges)
loadSprite()
  .catch((e) => console.error(e))
  .finally(() =>
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );

// dev-only handle for browser automation / debugging from the console
if (import.meta.env.DEV) Object.assign(window, { __arkham: gameStore, __arkhamView: useView });
