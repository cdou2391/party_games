import { useEffect, useState } from "react";

interface TimerProps {
  seconds: number;
  onExpire?: () => void;
}

export function Timer({ seconds, onExpire }: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    setRemaining(seconds);
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [seconds]);

  const pct = (remaining / seconds) * 100;
  const color = remaining <= 5 ? "bg-red-500" : remaining <= 10 ? "bg-yellow-400" : "bg-green-400";

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`font-bold tabular-nums text-lg w-6 text-right ${remaining <= 5 ? "text-red-500 animate-pulse-fast" : "text-gray-700"}`}>
        {remaining}
      </span>
    </div>
  );
}
