import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import { useGameSocket } from "../hooks/useGameSocket";
import TriviaGame from "../games/trivia/TriviaGame";
import CoupleQuizGame from "../games/couple_quiz/CoupleQuizGame";
import GameEndScreen from "../components/GameEndScreen";

export default function Game() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { session, gameEnded, reset } = useGameStore();
  const { sendAction } = useGameSocket(sessionId);

  useEffect(() => {
    if (!user) navigate("/");
    return () => reset();
  }, []);

  if (!session) {
    return <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1e0a3c] to-gray-900" />;
  }

  if (gameEnded) {
    return <GameEndScreen rankings={gameEnded.rankings} players={session.players} />;
  }

  if (session.status === "finished") {
    const rankings = [...session.players]
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ player_id: p.user_id, score: p.score, rank: i + 1 }));
    return <GameEndScreen rankings={rankings} players={session.players} />;
  }

  if (session.game_type === "trivia") {
    return (
      <TriviaGame
        onAnswer={(value) => sendAction("answer", value)}
        players={session.players}
        currentUserId={user?.id ?? ""}
      />
    );
  }

  if (session.game_type === "couple_quiz") {
    return (
      <CoupleQuizGame
        onAnswer={(value) => sendAction("answer", value)}
        players={session.players}
        currentUserId={user?.id ?? ""}
      />
    );
  }

  return null;
}
