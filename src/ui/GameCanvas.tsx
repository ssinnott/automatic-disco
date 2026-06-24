import { useEffect, useRef, useState } from "react";
import { type InputSource } from "../input/types";
import { PoseInput } from "../input/poseInput";
import { GameRunner } from "../game/gameRunner";
import { type MiniGame } from "../game/types";
import { CameraPreview } from "./CameraPreview";
import { GestureDiagnostics } from "./GestureDiagnostics";
import { MusicControl } from "./MusicControl";
import { audio } from "../audio/audioManager";

export function GameCanvas({
  game,
  input,
  numPlayers,
  onExit,
}: {
  game: MiniGame;
  input: InputSource;
  numPlayers: number;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runnerRef = useRef<GameRunner | null>(null);
  const [done, setDone] = useState(false);
  const [round, setRound] = useState(0); // bump to start a fresh run

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const isPose = input instanceof PoseInput;
    const runner = new GameRunner(game, {
      numPlayers,
      // Give pose players time to step back into a neutral pose; calibrate late.
      countdownMs: isPose ? 6000 : 3000,
      onCalibrate: isPose ? () => (input as PoseInput).recalibrate() : undefined,
    });
    runnerRef.current = runner;
    setDone(false);

    // Themed background music; loops for the run, fades out on exit.
    audio.play(game.theme.music);

    let raf = 0;
    let last = performance.now();
    let reportedDone = false;

    const resize = () => {
      const parent = canvas.parentElement!;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(50, now - last);
      last = now;
      runner.update(dt, input.snapshot(), input.poses());
      runner.render(ctx, canvas.width, canvas.height);
      if (runner.isDone && !reportedDone) {
        reportedDone = true;
        setDone(true);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      audio.stop();
    };
  }, [game, input, numPlayers, round]);

  return (
    <div className="game-stage">
      <canvas ref={canvasRef} className="game-canvas" />
      <div className="game-topbar">
        <span className="game-title">{game.title}</span>
        <span className="game-mode">{input.kind === "pose" ? "📷 pose" : "⌨️ keyboard"}</span>
        <MusicControl />
        <button className="btn-quit" onClick={onExit}>
          Quit
        </button>
      </div>
      {input instanceof PoseInput && (
        <>
          <div className="game-pip">
            <CameraPreview pose={input} numPlayers={numPlayers} />
          </div>
          <GestureDiagnostics pose={input} numPlayers={numPlayers} />
        </>
      )}
      {done && (
        <div className="game-overlay">
          <button className="btn-primary" onClick={() => setRound((r) => r + 1)}>
            Play again
          </button>
          <button className="btn-secondary" onClick={onExit}>
            Back to menu
          </button>
        </div>
      )}
    </div>
  );
}
