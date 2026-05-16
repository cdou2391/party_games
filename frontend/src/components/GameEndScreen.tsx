import { useNavigate } from "react-router-dom";
import { Avatar } from "./Avatar";
import type { PlayerInSession } from "../types";

interface GameEndScreenProps {
  rankings: { player_id: string; score: number; rank: number }[];
  players: PlayerInSession[];
}

const RANK_EMOJIS = ["🥇", "🥈", "🥉"];

export default function GameEndScreen({ rankings, players }: GameEndScreenProps) {
  const navigate = useNavigate();
  const playerMap = Object.fromEntries(players.map((p) => [p.user_id, p]));

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Game Over!</h2>

        <div className="space-y-3 mb-8">
          {rankings.map((r) => {
            const p = playerMap[r.player_id];
            if (!p) return null;
            return (
              <div
                key={r.player_id}
                className={`flex items-center gap-3 p-3 rounded-2xl ${r.rank === 1 ? "bg-yellow-50 border-2 border-yellow-300" : "bg-gray-50"}`}
              >
                <span className="text-2xl w-8">{RANK_EMOJIS[r.rank - 1] ?? `#${r.rank}`}</span>
                <Avatar seed={p.avatar_seed} size={36} />
                <div className="flex-1 text-left">
                  <div className="font-bold text-gray-900">{p.username}</div>
                </div>
                <span className="font-extrabold text-brand-600 text-lg">{r.score} pts</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate("/lobby")}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-lg transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
