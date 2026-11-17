import "./ui/game.css";
import "./ui/hud.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BootGate } from "./boot/BootGate";
import { ErrorBoundary } from "./ui/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BootGate app="street" />
    </ErrorBoundary>
  </React.StrictMode>,
);
