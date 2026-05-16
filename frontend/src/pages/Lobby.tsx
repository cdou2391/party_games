import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getGames, getLobbies, createLobby, joinByCode } from "../api/lobbies";
import { useAuthStore } from "../store/authStore";
import { UserMenu } from "../components/UserMenu";
import type { GameInfo, LobbyItem } from "../types";

const GAME_ICONS: Record<string, string> = { trivia: "🧠", couple_quiz: "💕" };

const DIFFICULTIES: { value: string; label: string; color: string }[] = [
  { value: "mixed",      label: "🎲 Random",     color: "bg-gray-100 text-gray-700 border-gray-300" },
  { value: "easy",       label: "Easy",           color: "bg-green-50 text-green-700 border-green-300" },
  { value: "medium",     label: "Medium",         color: "bg-yellow-50 text-yellow-700 border-yellow-300" },
  { value: "hard",       label: "Hard",           color: "bg-orange-50 text-orange-700 border-orange-300" },
  { value: "impossible", label: "Impossible",     color: "bg-red-50 text-red-700 border-red-300" },
];

const CATEGORIES = [
  "Random", "Arts & Music", "Culture", "Economy", "Food & Culture",
  "General", "Geography", "History", "Language", "Literature",
  "Math", "Nature", "Obscure Knowledge", "Science", "Sports", "Technology",
];

function TriviaModal({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: (difficulty: string, category: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [difficulty, setDifficulty] = useState("mixed");
  const [category, setCategory] = useState("Random");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🧠</span>
          <div>
            <h2 className="font-extrabold text-gray-900 text-lg">Trivia Settings</h2>
            <p className="text-xs text-gray-400">Choose difficulty and category</p>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Difficulty</div>
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${d.color} ${
                  difficulty === d.value ? "ring-2 ring-offset-1 ring-brand-500 scale-105" : "opacity-70 hover:opacity-100"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Category</div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all ${
                  category === c
                    ? "bg-brand-600 text-white border-brand-600 scale-105"
                    : "bg-gray-50 text-gray-700 border-gray-200 hover:border-brand-300"
                }`}
              >
                {c === "Random" ? "🎲 Random" : c}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(difficulty, category === "Random" ? "mixed" : category)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-sm transition-colors"
          >
            {loading ? "Creating…" : "Create Room"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Lobby() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [lobbies, setLobbies] = useState<LobbyItem[]>([]);
  const [games, setGames] = useState<GameInfo[]>([]);
  const [joinCode, setJoinCode] = useState("");
  const [createForm, setCreateForm] = useState({ game_type: "trivia", is_public: true, max_players: 8 });
  const [showTriviaModal, setShowTriviaModal] = useState(false);
  const [error, setError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) navigate("/");
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const [l, g] = await Promise.all([getLobbies(), getGames()]);
    setLobbies(l);
    setGames(g);
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    try {
      const session = await joinByCode(joinCode.trim().toUpperCase());
      navigate(`/room/${session.id}`);
    } catch {
      setJoinError("Room not found or already started");
    }
  };

  const handleCreateClick = () => {
    setError("");
    if (createForm.game_type === "trivia") {
      setShowTriviaModal(true);
    } else {
      doCreate({});
    }
  };

  const doCreate = async (settings: Record<string, string>) => {
    setLoading(true);
    try {
      const lobby = await createLobby(createForm.game_type, createForm.is_public, createForm.max_players, settings);
      navigate(`/room/${lobby.id}`);
    } catch {
      setError("Failed to create room");
      setShowTriviaModal(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTriviaConfirm = (difficulty: string, category: string) => {
    doCreate({ difficulty, category });
  };

  const handleJoinLobby = async (id: string, code: string) => {
    try {
      await joinByCode(code);
      navigate(`/room/${id}`);
    } catch {
      setError("Could not join room");
    }
  };

  const gameLabel = (type: string) => games.find((g) => g.id === type)?.name ?? type;

  return (
    <div className="min-h-screen bg-gray-100">

      {showTriviaModal && (
        <TriviaModal
          onConfirm={handleTriviaConfirm}
          onCancel={() => setShowTriviaModal(false)}
          loading={loading}
        />
      )}

      {/* Gradient header */}
      <div className="bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 px-6 pt-5 pb-16">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <span className="font-extrabold text-xl text-white">Party Games</span>
          </div>
          <UserMenu light />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-10 pb-12 space-y-4 relative z-10">

        {/* Create room */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">New room</div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={createForm.game_type}
              onChange={(e) => setCreateForm({ ...createForm, game_type: e.target.value })}
              className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-500"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {GAME_ICONS[g.id] ?? "🎮"} {g.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={createForm.is_public}
                onChange={(e) => setCreateForm({ ...createForm, is_public: e.target.checked })}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-sm text-gray-600">Public</span>
            </label>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-600">Max</span>
              <input
                type="number"
                min={2}
                max={8}
                value={createForm.max_players}
                onChange={(e) => setCreateForm({ ...createForm, max_players: +e.target.value })}
                className="w-14 border-2 border-gray-200 rounded-lg px-2 py-2 text-center text-sm focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              onClick={handleCreateClick}
              disabled={loading}
              className="shrink-0 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Create →
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Join by code */}
        <div className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Join with code</div>
          <form onSubmit={handleJoinCode} className="flex gap-3">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 font-mono text-center text-lg uppercase tracking-widest focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={joinCode.length < 6}
              className="shrink-0 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-bold px-6 py-2.5 rounded-xl transition-colors text-sm"
            >
              Join →
            </button>
          </form>
          {joinError && <p className="text-red-500 text-sm mt-2">{joinError}</p>}
        </div>

        {/* Open rooms */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Open Rooms</h3>
            {lobbies.length > 0 && (
              <span className="text-xs text-gray-400">{lobbies.length} room{lobbies.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {lobbies.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-4xl mb-3">🎲</div>
              <p className="text-gray-500 font-medium">No open rooms</p>
              <p className="text-gray-400 text-sm mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {lobbies.map((lobby) => (
                <div key={lobby.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-xl shrink-0">
                    {GAME_ICONS[lobby.game_type] ?? "🎮"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{gameLabel(lobby.game_type)}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex gap-0.5">
                        {Array.from({ length: lobby.max_players }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 rounded-full ${i < lobby.player_count ? "bg-brand-500" : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">{lobby.player_count}/{lobby.max_players}</span>
                      <span className="font-mono text-xs text-gray-300">{lobby.room_code}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinLobby(lobby.id, lobby.room_code)}
                    className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors shrink-0"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
