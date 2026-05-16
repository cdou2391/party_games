import { Avatar } from "./Avatar";
import type { PlayerInSession } from "../types";

interface ScoreBoardProps {
  players: PlayerInSession[];
  currentUserId?: string;
}

export function ScoreBoard({ players, currentUserId }: ScoreBoardProps) {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl shadow-lg p-4 w-64">
      <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wide">Scores</h3>
      <div className="space-y-2">
        {sorted.map((p, i) => (
          <div
            key={p.user_id}
            className={`flex items-center gap-2 p-2 rounded-lg ${
              p.user_id === currentUserId ? "bg-brand-50 border border-brand-200" : ""
            }`}
          >
            <span className="text-xs font-bold text-gray-400 w-4">#{i + 1}</span>
            <Avatar seed={p.avatar_seed} size={28} />
            <span className="flex-1 text-sm font-medium text-gray-700 truncate">{p.username}</span>
            <span className="text-sm font-bold text-brand-600">{p.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
