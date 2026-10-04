import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Investigation } from "./Investigation";
import { ApiLab } from "./ApiLab";
import "./style.css";

function App() {
  const [screen, setScreen] = useState<"research" | "lab">("research");
  return (
    <div className="simple-app">
      <header className="simple-header">
        <button className="simple-brand" onClick={() => setScreen("research")}>
          SwarmScope
        </button>
        <span className="header-description">
          Understand what agents do together.
        </span>
        <button
          className={screen === "lab" ? "active" : ""}
          onClick={() => setScreen(screen === "lab" ? "research" : "lab")}
        >
          {screen === "lab"
            ? "← Back to investigations"
            : "API protection demo →"}
        </button>
      </header>
      <main className="simple-main">
        {screen === "research" ? (
          <Investigation onTryTrust={() => setScreen("lab")} />
        ) : (
          <ApiLab />
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
