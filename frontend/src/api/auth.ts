import api from "./client";
import type { User } from "../types";

export const guestLogin = (username: string) =>
  api.post<{ access_token: string }>("/auth/guest", { username }).then((r) => r.data);

export const register = (username: string, email: string, password: string) =>
  api.post<{ access_token: string }>("/auth/register", { username, email, password }).then((r) => r.data);

export const login = (email: string, password: string) =>
  api.post<{ access_token: string }>("/auth/login", { email, password }).then((r) => r.data);

export const upgradeAccount = (email: string, password: string) =>
  api.post<{ access_token: string }>("/auth/upgrade", { email, password }).then((r) => r.data);

export const getMe = () => api.get<User>("/auth/me").then((r) => r.data);

export const getHistory = () =>
  api.get<GameHistoryItem[]>("/users/me/history").then((r) => r.data);

export interface GameHistoryItem {
  session_id: string;
  game_type: string;
  ended_at: string;
  score: number;
  rank: number;
  total_players: number;
}
