import { Avatar } from "./Avatar";
import type { PlayerInSession } from "../types";

interface PlayerCardProps {
  player: PlayerInSession;
  isHost?: boolean;
  showScore?: boolean;
}

export function PlayerCard({ player, isHost, showScore }: PlayerCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        player.is_ready ? "border-green-400 bg-green-50" : "border-gray-200 bg-white"
      } ${player.status === "disconnected" ? "opacity-50" : ""}`}
    >
      <Avatar seed={player.avatar_seed} size={40} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-gray-800 truncate">{player.username}</span>
          {isHost && (
            <span className="text-xs bg-brand-500 text-white px-1.5 py-0.5 rounded-full">host</span>
          )}
        </div>
        {showScore && (
          <span className="text-sm text-brand-600 font-medium">{player.score} pts</span>
        )}
      </div>
      {player.is_ready && !showScore && (
        <span className="text-green-500 text-sm font-medium">Ready</span>
      )}
    </div>
  );
}
