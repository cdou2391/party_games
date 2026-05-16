import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { Avatar } from "../../components/Avatar";
import { AbandonModal } from "../../components/AbandonModal";
import type { PlayerInSession } from "../../types";

const ANSWER_STYLES = [
  { bg: "bg-blue-500",   ring: "ring-blue-400",   dim: "bg-blue-900/40   border-blue-700/50",   letter: "bg-blue-500"   },
  { bg: "bg-amber-500",  ring: "ring-amber-400",  dim: "bg-amber-900/40  border-amber-700/50",  letter: "bg-amber-500"  },
  { bg: "bg-fuchsia-500",ring: "ring-fuchsia-400",dim: "bg-fuchsia-900/40 border-fuchsia-700/50",letter: "bg-fuchsia-500"},
  { bg: "bg-emerald-500",ring: "ring-emerald-400",dim: "bg-emerald-900/40 border-emerald-700/50",letter: "bg-emerald-500"},
];

interface TriviaGameProps {
  onAnswer: (value: string) => void;
  players: PlayerInSession[];
  currentUserId: string;
}

function TimerBar({ seconds, roundKey }: { seconds: number; roundKey: string }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const iv = setInterval(() => {
      setRemaining((p) => (p <= 1 ? (clearInterval(iv), 0) : p - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, [roundKey]);

  const pct = (remaining / seconds) * 100;
  const urgent = remaining <= 5;
  const warn = remaining <= 10;
  const barColor = urgent ? "bg-red-500" : warn ? "bg-amber-400" : "bg-emerald-400";

  return (
    <div className="flex items-center gap-3 px-1">
      <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-extrabold tabular-nums text-2xl w-8 text-right leading-none ${
        urgent ? "text-red-400 animate-pulse" : warn ? "text-amber-300" : "text-white"
      }`}>
        {remaining}
      </span>
    </div>
  );
}

function ScoreBar({ players, currentUserId, onExit }: { players: PlayerInSession[]; currentUserId: string; onExit: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 shrink-0">
      <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-hide">
        {players.map((p, i) => (
          <div
            key={p.user_id}
            className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full border transition-all ${
              p.user_id === currentUserId
                ? "bg-brand-600 border-brand-400 text-white"
                : "bg-white/10 border-white/10 text-white/70"
            }`}
          >
            <span className="text-[10px] font-bold opacity-60">#{i + 1}</span>
            <Avatar seed={p.avatar_seed} size={18} />
            <span className="text-xs font-semibold max-w-[56px] truncate">{p.username}</span>
            <span className={`text-xs font-bold ${p.user_id === currentUserId ? "text-white" : "text-brand-300"}`}>
              {p.score}
            </span>
          </div>
        ))}
      </div>
      <button
        onClick={onExit}
        className="shrink-0 ml-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-red-500/30 border border-white/10 hover:border-red-500/50 text-white/60 hover:text-red-400 text-xs font-semibold transition-all"
      >
        ✕ Exit
      </button>
    </div>
  );
}

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex justify-center items-center gap-1.5 py-2 shrink-0">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i < current - 1 ? "w-3 h-2 bg-brand-400 opacity-70" :
            i === current - 1 ? "w-5 h-2.5 bg-white" :
            "w-2 h-2 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

export default function TriviaGame({ onAnswer, players, currentUserId }: TriviaGameProps) {
  const navigate = useNavigate();
  const gamePhase = useGameStore((s) => s.gamePhase);
  const roundResult = useGameStore((s) => s.roundResult);
  const [selected, setSelected] = useState<string | null>(null);
  const [showAbandon, setShowAbandon] = useState(false);
  const lastOptionsRef = useRef<string[]>([]);

  const round = Number(gamePhase.round ?? roundResult?.round ?? 1);
  const totalRounds = Number(gamePhase.total_rounds ?? 10);

  useEffect(() => {
    if (Array.isArray(gamePhase.options) && gamePhase.options.length > 0) {
      lastOptionsRef.current = gamePhase.options as string[];
    }
  }, [gamePhase.options]);

  // Clear selection when a new question arrives
  useEffect(() => {
    setSelected(null);
  }, [gamePhase.question]);

  const sorted = [...players].sort((a, b) => b.score - a.score);

  const handleAnswer = (option: string) => {
    if (selected) return;
    setSelected(option);
    onAnswer(option);
  };

  // ── Round result screen ──────────────────────────────────────────
  if (roundResult) {
    const correct = String(roundResult.correct_answer ?? "");
    const myPts = (roundResult.round_scores as Record<string, number>)?.[currentUserId] ?? 0;
    const opts: string[] = (roundResult.options as string[]) ?? lastOptionsRef.current;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1e0a3c] to-gray-900 flex flex-col">
        {showAbandon && <AbandonModal onConfirm={() => navigate("/lobby")} onCancel={() => setShowAbandon(false)} />}
        <ScoreBar players={sorted} currentUserId={currentUserId} onExit={() => setShowAbandon(true)} />
        <ProgressDots total={totalRounds} current={round} />

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg space-y-4">

            {/* Feedback header */}
            <div className="text-center pb-2">
              <div className="text-5xl mb-2">{myPts > 0 ? "🎉" : "😬"}</div>
              <p className="text-3xl font-extrabold text-white">
                {myPts > 0 ? `+${myPts} pts!` : "Missed it!"}
              </p>
              <p className="text-white/40 text-sm mt-1">Next question coming up…</p>
            </div>

            {/* Answer reveal */}
            {opts.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {opts.map((opt, i) => {
                  const isCorrect = opt === correct;
                  const wasChosen = opt === selected;
                  const style = ANSWER_STYLES[i % ANSWER_STYLES.length];
                  return (
                    <div
                      key={i}
                      className={`rounded-2xl p-3 border-2 flex items-center gap-2.5 ${
                        isCorrect
                          ? "bg-emerald-500/20 border-emerald-400"
                          : wasChosen
                          ? "bg-red-500/20 border-red-500"
                          : "bg-white/5 border-white/10 opacity-50"
                      }`}
                    >
                      <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 text-white ${
                        isCorrect ? "bg-emerald-500" : wasChosen ? "bg-red-500" : style.letter + " opacity-40"
                      }`}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className={`text-sm font-semibold leading-tight ${
                        isCorrect ? "text-emerald-300" : wasChosen ? "text-red-300" : "text-white/40"
                      }`}>
                        {opt}
                      </span>
                      {isCorrect && <span className="ml-auto text-emerald-400 text-lg">✓</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading / between rounds ─────────────────────────────────────
  if (!gamePhase.question) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1e0a3c] to-gray-900 flex flex-col">
        {showAbandon && <AbandonModal onConfirm={() => navigate("/lobby")} onCancel={() => setShowAbandon(false)} />}
        <div className="flex justify-end px-4 pt-3">
          <button onClick={() => setShowAbandon(true)} className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-red-500/30 border border-white/10 text-white/60 hover:text-red-400 text-xs font-semibold transition-all">
            ✕ Exit
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-white/60 text-lg font-semibold animate-pulse">Get ready…</p>
        </div>
      </div>
    );
  }

  // ── Active question ──────────────────────────────────────────────
  const question = String(gamePhase.question);
  const options = (gamePhase.options as string[]) ?? [];
  const timeLimit = Number(gamePhase.time_limit ?? 20);
  const roundKey = `${round}-${question}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-[#1e0a3c] to-gray-900 flex flex-col">
      {showAbandon && <AbandonModal onConfirm={() => navigate("/lobby")} onCancel={() => setShowAbandon(false)} />}
      <ScoreBar players={sorted} currentUserId={currentUserId} onExit={() => setShowAbandon(true)} />
      <ProgressDots total={totalRounds} current={round} />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4">

          {/* Timer */}
          <TimerBar seconds={timeLimit} roundKey={roundKey} />

          {/* Question card */}
          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-3xl px-5 py-6 sm:px-7">
            <p className="text-brand-300 text-xs font-bold uppercase tracking-widest mb-3">
              Question {round} / {totalRounds}
            </p>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
              {question}
            </h2>
          </div>

          {/* Answer buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {options.map((option, i) => {
              const style = ANSWER_STYLES[i % ANSWER_STYLES.length];
              const isSelected = selected === option;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(option)}
                  disabled={!!selected}
                  className={`relative rounded-2xl p-3 sm:p-4 text-left transition-all duration-150 active:scale-95 border-2 ${
                    isSelected
                      ? `${style.bg} border-transparent ring-4 ${style.ring} ring-offset-0 scale-[0.97]`
                      : selected
                      ? `${style.dim} cursor-default opacity-60`
                      : `${style.dim} hover:opacity-90 hover:border-white/30`
                  }`}
                >
                  <span className={`inline-flex w-7 h-7 rounded-xl items-center justify-center text-xs font-bold text-white mb-2 ${style.letter}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-white leading-tight">
                    {option}
                  </p>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
