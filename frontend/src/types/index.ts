export interface User {
  id: string;
  username: string;
  email?: string | null;
  avatar_seed: string;
  is_guest: boolean;
  total_score: number;
  games_played: number;
  created_at: string;
}

export interface PlayerInSession {
  user_id: string;
  username: string;
  avatar_seed: string;
  score: number;
  status: "active" | "disconnected" | "finished";
  is_ready: boolean;
}

export interface SessionState {
  id: string;
  game_type: string;
  status: "waiting" | "in_progress" | "finished";
  room_code: string;
  host_id: string;
  max_players: number;
  settings: Record<string, unknown>;
  players: PlayerInSession[];
  game_state?: Record<string, unknown>;
}

export interface LobbyItem {
  id: string;
  game_type: string;
  status: string;
  host_id: string;
  room_code: string;
  is_public: boolean;
  max_players: number;
  player_count: number;
  created_at: string;
}

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  min_players: number;
  max_players: number;
}

// WebSocket message types
export type WsMessage =
  | { type: "session_state"; payload: SessionState }
  | { type: "player_joined"; payload: { user_id: string; username: string; avatar_seed: string } }
  | { type: "player_left"; payload: { user_id: string } }
  | { type: "player_ready"; payload: { user_id: string } }
  | { type: "game_started"; payload: { game_type: string; total_rounds?: number } }
  | { type: "game_update"; payload: Record<string, unknown> }
  | { type: "round_result"; payload: Record<string, unknown> }
  | { type: "score_update"; payload: { scores: Record<string, number> } }
  | { type: "game_ended"; payload: { rankings: { player_id: string; score: number; rank: number }[]; winner?: string } }
  | { type: "player_eliminated"; payload: { player_id: string } }
  | { type: "pong"; payload: Record<string, never> }
  | { type: "error"; payload: { message: string } };
