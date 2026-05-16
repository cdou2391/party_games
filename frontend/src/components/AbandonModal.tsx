interface AbandonModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function AbandonModal({ onConfirm, onCancel }: AbandonModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-xs p-6 text-center space-y-4">
        <div className="text-4xl">🚪</div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Abandon game?</h2>
          <p className="text-white/50 text-sm mt-1">Your progress in this round will be lost.</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border-2 border-white/20 text-white/80 font-semibold text-sm hover:bg-white/10 transition-colors"
          >
            Keep playing
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors"
          >
            Abandon
          </button>
        </div>
      </div>
    </div>
  );
}
