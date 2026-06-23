import { create } from "zustand";

export type Screen = "menu" | "ready" | "playing" | "lab";
export type InputMode = "keyboard" | "pose";

interface SessionState {
  screen: Screen;
  gameId: string;
  numPlayers: number; // 1..3
  inputMode: InputMode;
  error: string | null;
  setGame: (id: string) => void;
  setNumPlayers: (n: number) => void;
  setInputMode: (m: InputMode) => void;
  setScreen: (s: Screen) => void;
  setError: (e: string | null) => void;
}

export const useSession = create<SessionState>((set) => ({
  screen: "menu",
  gameId: "pirates",
  numPlayers: 1,
  inputMode: "keyboard",
  error: null,
  setGame: (gameId) => set({ gameId }),
  setNumPlayers: (numPlayers) => set({ numPlayers }),
  setInputMode: (inputMode) => set({ inputMode }),
  setScreen: (screen) => set({ screen }),
  setError: (error) => set({ error }),
}));
