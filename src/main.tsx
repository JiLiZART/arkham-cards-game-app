import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { gameStore } from "./ui/context";
import { watchIconFonts } from "./ui/glyphs";
import { useView } from "./ui/view";
import "./ui/styles.css";

watchIconFonts();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// dev-only handle for browser automation / debugging from the console
if (import.meta.env.DEV) Object.assign(window, { __arkham: gameStore, __arkhamView: useView });
