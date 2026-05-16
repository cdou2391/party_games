import { create } from "zustand";
import type { PlayerInSession, SessionState, WsMessage } from "../types";

interface GameState {
  session: SessionState | null;
  gamePhase: Record<string, unknown>;
  roundResult: Record<string, unknown> | null;
  gameEnded: { rankings: { player_id: string; score: number; rank: number }[]; winner?: string } | null;
  ws: WebSocket | null;

  setSession: (s: SessionState) => void;
  updatePlayer: (user_id: string, patch: Partial<PlayerInSession>) => void;
  addPlayer: (p: Pick<PlayerInSession, "user_id" | "username" | "avatar_seed">) => void;
  removePlayer: (user_id: string) => void;
  setGamePhase: (phase: Record<string, unknown>) => void;
  setRoundResult: (result: Record<string, unknown>) => void;
  setGameEnded: (data: GameState["gameEnded"]) => void;
  setWs: (ws: WebSocket | null) => void;
  handleMessage: (msg: WsMessage) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  gamePhase: {},
  roundResult: null,
  gameEnded: null,
  ws: null,

  setSession: (s) => set({ session: s, gamePhase: s.game_state ?? {} }),
  updatePlayer: (user_id, patch) =>
    set((state) => ({
      session: state.session
        ? {
            ...state.session,
            players: state.session.players.map((p) => (p.user_id === user_id ? { ...p, ...patch } : p)),
          }
        : null,
    })),
  addPlayer: (p) =>
    set((state) => {
      if (!state.session) return {};
      const exists = state.session.players.some((pl) => pl.user_id === p.user_id);
      if (exists) return {};
      return {
        session: {
          ...state.session,
          players: [...state.session.players, { ...p, score: 0, status: "active", is_ready: false }],
        },
      };
    }),
  removePlayer: (user_id) =>
    set((state) => ({
      session: state.session
        ? { ...state.session, players: state.session.players.filter((p) => p.user_id !== user_id) }
        : null,
    })),
  setGamePhase: (phase) => set({ gamePhase: phase }),
  setRoundResult: (result) => set({ roundResult: result }),
  setGameEnded: (data) => set({ gameEnded: data }),
  setWs: (ws) => set({ ws }),
  reset: () => set({ session: null, gamePhase: {}, roundResult: null, gameEnded: null, ws: null }),

  handleMessage: (msg) => {
    const { setSession, addPlayer, removePlayer, updatePlayer, setGamePhase, setRoundResult, setGameEnded } = get();
    switch (msg.type) {
      case "session_state":
        setSession(msg.payload);
        break;
      case "player_joined":
        addPlayer(msg.payload);
        break;
      case "player_left":
        removePlayer(msg.payload.user_id);
        break;
      case "player_ready":
        updatePlayer(msg.payload.user_id, { is_ready: true });
        break;
      case "game_started":
        set((s) => ({ session: s.session ? { ...s.session, status: "in_progress" } : null }));
        break;
      case "game_update":
        setGamePhase(msg.payload);
        set({ roundResult: null });
        break;
      case "round_result":
        setRoundResult(msg.payload);
        setGamePhase({});
        Object.entries((msg.payload.total_scores as Record<string, number>) ?? {}).forEach(
          ([uid, score]) => updatePlayer(uid, { score })
        );
        break;
      case "score_update":
        Object.entries(msg.payload.scores).forEach(([uid, score]) => updatePlayer(uid, { score }));
        break;
      case "game_ended":
        setGameEnded(msg.payload);
        set((s) => ({ session: s.session ? { ...s.session, status: "finished" } : null }));
        break;
      case "player_eliminated":
        updatePlayer(msg.payload.player_id, { status: "finished" });
        break;
    }
  },
}));
