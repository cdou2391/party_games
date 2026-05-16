import { useEffect, useRef } from "react";
import { useGameStore } from "../store/gameStore";
import { useAuthStore } from "../store/authStore";
import type { WsMessage } from "../types";

export function useGameSocket(sessionId: string | undefined) {
  const token = useAuthStore((s) => s.token);
  const { handleMessage, setWs, ws } = useGameStore();
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!sessionId || !token) return;

    const url = `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws/${sessionId}?token=${token}`;
    const socket = new WebSocket(url);

    socket.onopen = () => {
      setWs(socket);
      pingRef.current = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping", payload: {} }));
        }
      }, 30000);
    };

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    socket.onclose = () => {
      setWs(null);
      if (pingRef.current) clearInterval(pingRef.current);
    };

    return () => {
      socket.close();
      if (pingRef.current) clearInterval(pingRef.current);
    };
  }, [sessionId, token]);

  const sendAction = (action: string, value: unknown) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "game_action", payload: { action, value } }));
    }
  };

  const sendReady = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ready", payload: {} }));
    }
  };

  return { sendAction, sendReady, connected: ws?.readyState === WebSocket.OPEN };
}
