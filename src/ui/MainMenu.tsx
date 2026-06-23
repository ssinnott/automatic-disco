import { GAMES } from "../game/games";
import { KEYBOARD_HELP } from "../input/keyboardInput";
import { useSession } from "../store";

export function MainMenu({ onStart, onOpenLab }: { onStart: () => void; onOpenLab: () => void }) {
  const { gameId, numPlayers, inputMode, error, setGame, setNumPlayers, setInputMode } = useSession();

  return (
    <div className="menu">
      <h1 className="menu-logo">automatic-disco</h1>
      <p className="menu-tagline">Body-controlled minigames — a theme + 4 random phases, ~90 seconds.</p>

      {error && <div className="menu-error">{error}</div>}

      <section className="menu-section">
        <h2>Pick a game</h2>
        <div className="game-grid">
          {GAMES.map((g) => (
            <button
              key={g.id}
              className={`game-card${gameId === g.id ? " selected" : ""}`}
              onClick={() => setGame(g.id)}
            >
              <span className="game-card-title">{g.title}</span>
              <span className="game-card-sub">{g.theme.name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="menu-section">
        <h2>Players</h2>
        <div className="pill-row">
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              className={`pill${numPlayers === n ? " selected" : ""}`}
              onClick={() => setNumPlayers(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </section>

      <section className="menu-section">
        <h2>Input</h2>
        <div className="pill-row">
          <button
            className={`pill${inputMode === "pose" ? " selected" : ""}`}
            onClick={() => setInputMode("pose")}
          >
            📷 Webcam pose
          </button>
          <button
            className={`pill${inputMode === "keyboard" ? " selected" : ""}`}
            onClick={() => setInputMode("keyboard")}
          >
            ⌨️ Keyboard
          </button>
        </div>
        {inputMode === "keyboard" && (
          <div className="keyhelp">
            {KEYBOARD_HELP.slice(0, numPlayers).map((km, i) => (
              <span key={i} className="keyhelp-row">
                P{i + 1}: lean {km.left.replace("Key", "").toLowerCase()}/
                {km.right.replace("Key", "").toLowerCase()} · jump{" "}
                {km.jump.replace("Key", "").toLowerCase()} · duck{" "}
                {km.duck.replace("Key", "").toLowerCase()} · grab{" "}
                {km.grab.replace("Key", "").toLowerCase()}
              </span>
            ))}
          </div>
        )}
      </section>

      <button className="btn-primary btn-start" onClick={onStart}>
        Start
      </button>
      <button className="btn-secondary btn-lab" onClick={onOpenLab}>
        🔧 Gesture Lab — calibrate & tune pose detection
      </button>
    </div>
  );
}
