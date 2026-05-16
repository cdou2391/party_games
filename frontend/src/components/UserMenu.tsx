import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Avatar } from "./Avatar";

export function UserMenu({ light = false }: { light?: boolean }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full transition-colors ${light ? "hover:bg-white/20" : "hover:bg-gray-100"}`}
      >
        <Avatar seed={user.avatar_seed} size={32} />
        <span className={`font-semibold text-sm hidden sm:block ${light ? "text-white" : "text-gray-800"}`}>{user.username}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""} ${light ? "text-white/70" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50">
          <div className="px-4 py-2 border-b border-gray-100 mb-1">
            <p className="font-bold text-gray-900 text-sm">{user.username}</p>
            <p className="text-xs text-gray-400 truncate">{user.is_guest ? "Guest account" : (user.email ?? "")}</p>
          </div>
          <button
            onClick={() => { setOpen(false); navigate("/profile"); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
          >
            <span className="text-base">👤</span> Profile
          </button>
          {user.is_guest && (
            <button
              onClick={() => { setOpen(false); navigate("/profile"); }}
              className="w-full text-left px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 flex items-center gap-2.5 font-medium"
            >
              <span className="text-base">⭐</span> Save progress
            </button>
          )}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5"
            >
              <span className="text-base">🚪</span> Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
