/**
 * Background-music player. One looping <audio> element, a global mute/volume
 * preference (persisted), and graceful handling of missing files / autoplay
 * blocks so a game with no audio files just plays silently.
 *
 * Music must start from a user gesture (browsers block autoplay) — the Start
 * button covers that, and toggling unmute also (re)attempts playback.
 */
const LS_MUTED = "ad.music.muted";
const LS_VOLUME = "ad.music.volume";
const FADE_MS = 600;

class AudioManager {
  private el: HTMLAudioElement | null = null;
  private current: string | null = null;
  private fadeRaf = 0;
  private _muted: boolean;
  private _volume: number;
  private listeners = new Set<() => void>();

  constructor() {
    this._muted = localStorage.getItem(LS_MUTED) === "1";
    const v = Number(localStorage.getItem(LS_VOLUME));
    this._volume = Number.isFinite(v) && v > 0 ? Math.min(1, v) : 0.5;
  }

  get muted() {
    return this._muted;
  }
  get volume() {
    return this._volume;
  }

  /** Subscribe to mute/volume changes (for UI). Returns an unsubscribe fn. */
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  /** Pick a random track from the list and loop it. No-op if already playing it. */
  play(tracks: string[]) {
    if (!tracks.length) return;
    const next = tracks[Math.floor(Math.random() * tracks.length)];
    if (next === this.current && this.el && !this.el.paused) return;
    this.current = next;

    if (!this.el) {
      this.el = new Audio();
      this.el.loop = true;
      // A missing/undecodable file shouldn't throw — just stay silent.
      this.el.addEventListener("error", () => {});
    }
    cancelAnimationFrame(this.fadeRaf);
    this.el.src = next;
    this.el.volume = this._muted ? 0 : 0;
    this.el.play().then(() => this.fadeTo(this._muted ? 0 : this._volume)).catch(() => {});
  }

  stop() {
    cancelAnimationFrame(this.fadeRaf);
    if (this.el) {
      this.el.pause();
      this.el.currentTime = 0;
    }
    this.current = null;
  }

  setMuted(muted: boolean) {
    this._muted = muted;
    localStorage.setItem(LS_MUTED, muted ? "1" : "0");
    if (this.el) {
      if (muted) {
        this.fadeTo(0);
      } else {
        // Resume if it had been blocked/paused, then fade in.
        if (this.el.paused) this.el.play().catch(() => {});
        this.fadeTo(this._volume);
      }
    }
    this.emit();
  }

  setVolume(volume: number) {
    this._volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem(LS_VOLUME, String(this._volume));
    if (this.el && !this._muted) this.el.volume = this._volume;
    this.emit();
  }

  /** Linearly fade the element's volume toward a target. */
  private fadeTo(target: number) {
    if (!this.el) return;
    cancelAnimationFrame(this.fadeRaf);
    const start = this.el.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      if (!this.el) return;
      const k = Math.min(1, (now - t0) / FADE_MS);
      this.el.volume = start + (target - start) * k;
      if (k < 1) this.fadeRaf = requestAnimationFrame(step);
    };
    this.fadeRaf = requestAnimationFrame(step);
  }
}

export const audio = new AudioManager();
