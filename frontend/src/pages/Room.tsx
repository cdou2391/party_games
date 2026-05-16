import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import { useGameSocket } from "../hooks/useGameSocket";
import { PlayerCard } from "../components/PlayerCard";
import { RoomCode } from "../components/RoomCode";
import { Avatar } from "../components/Avatar";

export default function Room() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { session, reset } = useGameStore();
  const { sendReady, connected } = useGameSocket(sessionId);
  const [readying, setReadying] = useState(false);

  useEffect(() => {
    if (!user) navigate("/");
    return () => reset();
  }, []);

  useEffect(() => {
    if (session?.status === "in_progress") {
      navigate(`/game/${sessionId}`);
    }
  }, [session?.status]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 flex flex-col items-center justify-center gap-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-b-white/50 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:600ms] [animation-direction:reverse]" />
        </div>
        <div className="text-center">
          <p className="text-white font-extrabold text-2xl tracking-wide">Loading room…</p>
          <p className="text-white/40 text-sm mt-1">Hang tight while we set things up</p>
        </div>
      </div>
    );
  }

  const myPlayer = session.players.find((p) => p.user_id === user?.id);
  const allReady = session.players.length > 0 && session.players.every((p) => p.is_ready);
  const gameLabels: Record<string, string> = { trivia: "Trivia", couple_quiz: "How Well Do You Know the Couple?" };

  if (myPlayer?.is_ready) {
    const readyCount = session.players.filter((p) => p.is_ready).length;
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 flex flex-col items-center justify-center gap-8 p-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full border-4 border-b-white/50 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:600ms] [animation-direction:reverse]" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🎮</div>
        </div>

        <div className="text-center">
          <p className="text-white font-extrabold text-3xl tracking-wide">
            {allReady ? "Starting soon…" : "Waiting for players…"}
          </p>
          <p className="text-white/50 text-sm mt-2">
            {readyCount} / {session.players.length} ready
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-sm">
          {session.players.map((p) => (
            <div key={p.user_id} className="flex flex-col items-center gap-1.5">
              <div className={`relative rounded-full p-0.5 ${p.is_ready ? "ring-2 ring-green-400" : "ring-2 ring-white/20"}`}>
                <Avatar seed={p.avatar_seed} size={48} />
                <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-brand-800 ${p.is_ready ? "bg-green-400" : "bg-white/30"}`} />
              </div>
              <span className="text-white/80 text-xs font-semibold max-w-[56px] truncate text-center">{p.username}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/lobby")}
          className="mt-2 px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white text-sm font-semibold transition-all"
        >
          ← Leave room
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 p-6">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate("/lobby")} className="text-white/70 hover:text-white text-sm mb-6">
          ← Back to Lobby
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">
                {gameLabels[session.game_type] ?? session.game_type}
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {session.players.length}/{session.max_players} players
                <span className={`ml-2 inline-block w-2 h-2 rounded-full ${connected ? "bg-green-400" : "bg-gray-300"}`} />
              </p>
            </div>
            <RoomCode code={session.room_code} />
          </div>

          <div className="space-y-2 mb-6">
            {session.players.map((p) => (
              <PlayerCard key={p.user_id} player={p} isHost={p.user_id === session.host_id} />
            ))}
          </div>

          <button
            onClick={() => { setReadying(true); sendReady(); }}
            disabled={readying}
            className={`w-full text-white font-bold py-3 rounded-xl text-lg transition-all flex items-center justify-center gap-2 ${
              readying ? "bg-green-400 scale-95" : "bg-green-500 hover:bg-green-600 active:scale-95"
            }`}
          >
            {readying ? (
              <>
                <span className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Getting ready…
              </>
            ) : "Ready!"}
          </button>
        </div>
      </div>
    </div>
  );
}
