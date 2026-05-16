import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getMe } from "./api/auth";
import { useAuthStore } from "./store/authStore";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import Room from "./pages/Room";
import Game from "./pages/Game";
import Profile from "./pages/Profile";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

function AppSplash() {
  const [exit, setExit] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setExit(true), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {!exit && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-br from-[#1e0a3c] via-brand-900 to-purple-800"
          initial={{ y: "100%" }}
          animate={{ y: "0%", transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }}
          exit={{ y: "-100%", transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}
        >
          <div className="text-6xl mb-4 animate-bounce">🎮</div>
          <p className="text-white font-extrabold text-2xl tracking-wide">Party Games</p>
          <p className="text-white/40 text-sm mt-2">Get ready…</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AppLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-purple-500 flex flex-col items-center justify-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-white/20" />
        <div className="absolute inset-0 rounded-full border-4 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        <div className="absolute inset-3 rounded-full border-4 border-b-white/50 border-t-transparent border-r-transparent border-l-transparent animate-spin [animation-duration:600ms] [animation-direction:reverse]" />
      </div>
      <div className="text-center">
        <p className="text-white font-extrabold text-2xl tracking-wide">Party Games</p>
        <p className="text-white/40 text-sm mt-1">Loading…</p>
      </div>
    </div>
  );
}

export default function App() {
  const { token, user, setAuth, logout } = useAuthStore();
  const [booting, setBooting] = useState(!!token && !user);

  useEffect(() => {
    if (!token || user) return;
    getMe()
      .then((me) => setAuth(token, me))
      .catch(() => logout())
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <AppLoading />;

  return (
    <BrowserRouter>
      <AppSplash />
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/login"   element={<Login />} />
        <Route path="/lobby"   element={<RequireAuth><Lobby /></RequireAuth>} />
        <Route path="/room/:sessionId" element={<RequireAuth><Room /></RequireAuth>} />
        <Route path="/game/:sessionId" element={<RequireAuth><Game /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
