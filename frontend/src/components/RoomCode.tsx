import { useState } from "react";

interface RoomCodeProps {
  code: string;
}

export function RoomCode({ code }: RoomCodeProps) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-mono font-bold text-xl tracking-widest hover:bg-gray-700 transition-colors"
    >
      {code}
      <span className="text-xs font-sans font-normal text-gray-400">{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}
