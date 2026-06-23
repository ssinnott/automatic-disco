import { useEffect, useState } from "react";
import { audio } from "../audio/audioManager";

/** Mute toggle + volume slider, bound to the global AudioManager. */
export function MusicControl() {
  const [, force] = useState(0);
  useEffect(() => audio.subscribe(() => force((n) => n + 1)), []);

  return (
    <div className="music-control">
      <button
        className="music-btn"
        onClick={() => audio.setMuted(!audio.muted)}
        title={audio.muted ? "Unmute music" : "Mute music"}
        aria-label={audio.muted ? "Unmute music" : "Mute music"}
      >
        {audio.muted ? "🔇" : "🔊"}
      </button>
      <input
        className="music-slider"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={audio.muted ? 0 : audio.volume}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (audio.muted && v > 0) audio.setMuted(false);
          audio.setVolume(v);
        }}
      />
    </div>
  );
}
