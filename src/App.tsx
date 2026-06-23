import { useRef } from "react";
import { useSession } from "./store";
import { gameById } from "./game/games";
import { type InputSource } from "./input/types";
import { KeyboardInput } from "./input/keyboardInput";
import { PoseInput } from "./input/poseInput";
import { MainMenu } from "./ui/MainMenu";
import { GameCanvas } from "./ui/GameCanvas";
import { CameraPreview } from "./ui/CameraPreview";
import { GestureLab } from "./ui/GestureLab";

export function App() {
  const { screen, gameId, numPlayers, inputMode, setScreen, setError } = useSession();
  const inputRef = useRef<InputSource | null>(null);

  const stopInput = () => {
    inputRef.current?.stop();
    inputRef.current = null;
  };

  const handleStart = async () => {
    setError(null);
    stopInput();
    try {
      if (inputMode === "pose") {
        const src = new PoseInput(numPlayers);
        inputRef.current = src;
        setScreen("ready");
        await src.start(); // camera + model; may reject if permission denied
      } else {
        const src = new KeyboardInput(numPlayers);
        inputRef.current = src;
        await src.start();
        setScreen("playing");
      }
    } catch (e) {
      stopInput();
      setError(e instanceof Error ? e.message : "Could not start the camera.");
      setScreen("menu");
    }
  };

  const openLab = async () => {
    setError(null);
    stopInput();
    try {
      const src = new PoseInput(1);
      inputRef.current = src;
      setScreen("lab");
      await src.start();
    } catch (e) {
      stopInput();
      setError(e instanceof Error ? e.message : "Could not start the camera.");
      setScreen("menu");
    }
  };

  const quit = () => {
    stopInput();
    setScreen("menu");
  };

  const game = gameById(gameId);

  if (screen === "lab" && inputRef.current instanceof PoseInput) {
    return <GestureLab pose={inputRef.current} onExit={quit} />;
  }

  if (screen === "playing" && inputRef.current) {
    return <GameCanvas game={game} input={inputRef.current} numPlayers={numPlayers} onExit={quit} />;
  }

  if (screen === "ready" && inputRef.current instanceof PoseInput) {
    return (
      <div className="ready">
        <h2>Get in frame</h2>
        <p>Stand back so your whole body is visible. {numPlayers > 1 ? "One player per column." : ""}</p>
        <CameraPreview pose={inputRef.current} numPlayers={numPlayers} />
        <div className="ready-actions">
          <button className="btn-primary" onClick={() => setScreen("playing")}>
            Start game
          </button>
          <button className="btn-secondary" onClick={quit}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return <MainMenu onStart={handleStart} onOpenLab={openLab} />;
}
