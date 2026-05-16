import { create } from "zustand";
import type { User } from "../types";

const SESSIONS_KEY = "saved_sessions";
const MAX_SESSIONS = 5;

export interface SavedSession {
  username: string;
  avatar_seed: string;
  token: string;
}

export function getSavedSessions(): SavedSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function persistSession(token: string, user: User) {
  const entry: SavedSession = { username: user.username, avatar_seed: user.avatar_seed, token };
  const rest = getSavedSessions().filter((s) => s.username !== user.username);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify([entry, ...rest].slice(0, MAX_SESSIONS)));
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  isGuest: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: sessionStorage.getItem("token"),
  setAuth: (token, user) => {
    sessionStorage.setItem("token", token);
    persistSession(token, user);
    set({ token, user });
  },
  logout: () => {
    sessionStorage.removeItem("token");
    set({ token: null, user: null });
  },
  isGuest: () => get().user?.is_guest ?? true,
}));
