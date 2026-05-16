import api from "./client";
import type { GameInfo, LobbyItem, SessionState } from "../types";

export const getGames = () => api.get<GameInfo[]>("/games").then((r) => r.data);

export const getLobbies = () => api.get<LobbyItem[]>("/lobbies").then((r) => r.data);

export const createLobby = (game_type: string, is_public: boolean, max_players: number, settings: Record<string, string> = {}) =>
  api.post<LobbyItem>("/lobbies", { game_type, is_public, max_players, settings }).then((r) => r.data);

export const joinByCode = (room_code: string) =>
  api.post<SessionState>("/lobbies/join", { room_code }).then((r) => r.data);

export const getSession = (session_id: string) =>
  api.get<SessionState>(`/lobbies/${session_id}`).then((r) => r.data);
