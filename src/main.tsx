import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { gameStore } from "./ui/context";
import "./ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// dev-only handle for browser automation / debugging from the console
if (import.meta.env.DEV) (window as unknown as { __arkham: unknown }).__arkham = gameStore;
