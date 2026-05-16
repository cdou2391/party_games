import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { upgradeAccount, getMe, getHistory, type GameHistoryItem } from "../api/auth";
import { Avatar } from "../components/Avatar";

const GAME_LABELS: Record<string, string> = { trivia: "Trivia", word_chain: "Word Chain" };
const GAME_ICONS: Record<string, string> = { trivia: "🧠", word_chain: "🔤" };
const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function RankBadge({ rank, total }: { rank: number; total: number }) {
  const medal = RANK_MEDALS[rank - 1];
  const isTop3 = rank <= 3;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
      rank === 1 ? "bg-yellow-100 text-yellow-700" :
      rank === 2 ? "bg-gray-100 text-gray-600" :
      rank === 3 ? "bg-orange-100 text-orange-700" :
      "bg-gray-100 text-gray-500"
    }`}>
      {medal ?? `#${rank}`} {isTop3 ? "" : `of ${total}`}
      {isTop3 && <span className="text-gray-400 font-normal">/ {total}</span>}
    </span>
  );
}

export default function Profile() {
  const { user, setAuth, logout } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    getHistory()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, []);

  if (!user) return null;

  const wins = history.filter((h) => h.rank === 1).length;
  const bestScore = history.length > 0 ? Math.max(...history.map((h) => h.score)) : 0;

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { access_token } = await upgradeAccount(email, password);
      sessionStorage.setItem("token", access_token);
      const me = await getMe();
      setAuth(access_token, me);
      setSuccess("Account saved! You can now log in with email + password.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Failed to upgrade account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">

      {/* Hero banner */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 pt-12 pb-20 px-6 relative">
        <button
          onClick={() => navigate("/lobby")}
          className="absolute top-4 left-4 text-white/70 hover:text-white text-sm flex items-center gap-1 transition-colors"
        >
          ← Lobby
        </button>
        <div className="max-w-lg mx-auto text-center">
          <div className="relative inline-block mb-3">
            <Avatar seed={user.avatar_seed} size={88} className="ring-4 ring-white/30" />
            {user.is_guest && (
              <span className="absolute -bottom-1 -right-1 bg-amber-400 text-amber-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                Guest
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white">{user.username}</h1>
          {!user.is_guest && (
            <p className="text-white/60 text-sm mt-1">{user.email}</p>
          )}
        </div>
      </div>

      {/* Stats row — overlaps the banner */}
      <div className="max-w-lg mx-auto px-4 -mt-10 mb-6 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg grid grid-cols-3 divide-x divide-gray-100">
          {[
            { label: "Total Score", value: user.total_score },
            { label: "Games", value: user.games_played },
            { label: "Wins", value: wins },
          ].map(({ label, value }) => (
            <div key={label} className="py-4 text-center">
              <div className="text-2xl font-extrabold text-brand-600">{value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-12 space-y-4">

        {/* Best score callout (only if they've played) */}
        {history.length > 0 && (
          <div className="bg-gradient-to-r from-brand-600 to-purple-500 rounded-2xl p-4 flex items-center gap-4">
            <div className="text-4xl">⭐</div>
            <div>
              <div className="text-white/80 text-xs font-semibold uppercase tracking-wide">Best game score</div>
              <div className="text-white text-2xl font-extrabold">{bestScore} pts</div>
            </div>
          </div>
        )}

        {/* Guest upgrade CTA */}
        {user.is_guest && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
            <button
              onClick={() => setShowUpgrade((s) => !s)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left"
            >
              <span className="text-2xl">🔒</span>
              <div className="flex-1">
                <div className="font-bold text-gray-900 text-sm">Save your progress</div>
                <div className="text-xs text-gray-400">Create an account — keep your score forever</div>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showUpgrade ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showUpgrade && (
              <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                <form onSubmit={handleUpgrade} className="space-y-3">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500"
                  />
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  {success && <p className="text-green-600 text-sm">{success}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    {loading ? "Saving…" : "Create Account"}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* Game history */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Game History</h3>
            {history.length > 0 && (
              <span className="text-xs text-gray-400">{history.length} game{history.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {historyLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading…</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🎮</div>
              <p className="text-gray-500 font-medium">No games yet</p>
              <p className="text-gray-400 text-sm mt-1">Play a game to see your history here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((item) => (
                <div key={item.session_id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center text-lg shrink-0">
                    {GAME_ICONS[item.game_type] ?? "🎮"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">
                      {GAME_LABELS[item.game_type] ?? item.game_type}
                    </div>
                    <div className="text-xs text-gray-400">{formatDate(item.ended_at)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-bold text-brand-600">{item.score} pts</span>
                    <RankBadge rank={item.rank} total={item.total_players} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Log out */}
        <button
          onClick={() => { logout(); navigate("/"); }}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm text-gray-400 hover:text-red-500 transition-colors"
        >
          <span>🚪</span> Log out
        </button>
      </div>
    </div>
  );
}
