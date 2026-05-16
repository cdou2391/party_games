import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { guestLogin, getMe } from "../api/auth";
import { useAuthStore, getSavedSessions, type SavedSession } from "../store/authStore";
import { Avatar } from "../components/Avatar";

export default function Home() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null); // stores which name is loading
  const [sessions] = useState<SavedSession[]>(getSavedSessions);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  const joinAs = async (name: string) => {
    setLoading(name);
    setError("");
    try {
      const { access_token } = await guestLogin(name);
      sessionStorage.setItem("token", access_token);
      const user = await getMe();
      setAuth(access_token, user);
      navigate("/lobby");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  // Restore a saved session; fall back to creating a new guest if token expired
  const restoreSession = async (session: SavedSession) => {
    setLoading(session.username);
    setError("");
    sessionStorage.setItem("token", session.token);
    try {
      const user = await getMe();
      setAuth(session.token, user);
      navigate("/lobby");
    } catch {
      // Token expired — create a fresh guest with the same name
      sessionStorage.removeItem("token");
      await joinAs(session.username);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    joinAs(username.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-4">🎮</div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Party Games</h1>
        <p className="text-gray-500 mb-8">Play with friends, no account needed.</p>

        {sessions.length > 0 && (
          <div className="mb-6 text-left">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Previously used on this device
            </p>
            <div className="space-y-2">
              {sessions.map((s) => (
                <button
                  key={s.username}
                  onClick={() => restoreSession(s)}
                  disabled={loading !== null}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-gray-100 hover:border-brand-300 hover:bg-brand-50 transition-all disabled:opacity-50 text-left"
                >
                  <Avatar seed={s.avatar_seed} size={36} />
                  <span className="font-semibold text-gray-800 flex-1">{s.username}</span>
                  {loading === s.username ? (
                    <span className="text-xs text-gray-400">Joining…</span>
                  ) : (
                    <span className="text-xs text-brand-500 font-medium">Play →</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-5 mb-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">or join as someone new</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          </div>
        )}

        <form onSubmit={handleJoin} className="space-y-4">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username…"
            maxLength={32}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-brand-500 transition-colors"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading !== null || !username.trim()}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-lg transition-colors"
          >
            {loading && !sessions.find((s) => s.username === loading) ? "Joining…" : "Join as Guest →"}
          </button>
        </form>

        <div className="mt-6 border-t pt-5">
          <p className="text-sm text-gray-400 mb-3">Already have an account?</p>
          <button
            onClick={() => navigate("/login")}
            className="text-brand-600 font-semibold hover:underline text-sm"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
