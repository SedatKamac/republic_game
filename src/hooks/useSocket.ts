import { useEffect, useRef, useState } from "react";
import { getSocket, type ConsensusSocket } from "@/lib/socket";
import { getOrCreatePlayerId, getDisplayName } from "@/lib/session";

export function useSocket(): { socket: ConsensusSocket; playerId: string; ready: boolean } {
  const [ready, setReady] = useState(false);
  const playerIdRef = useRef("");
  const socketRef = useRef<ConsensusSocket | null>(null);

  if (!socketRef.current) socketRef.current = getSocket();

  useEffect(() => {
    const pid = getOrCreatePlayerId();
    const name = getDisplayName();
    playerIdRef.current = pid;
    socketRef.current!.connect(pid, name || "");
    // Give the WebSocket a moment to connect + authenticate before marking ready
    const checkReady = setInterval(() => {
      if (socketRef.current!.isConnected()) {
        setReady(true);
        clearInterval(checkReady);
      }
    }, 100);
    // Also set ready after a short timeout in case connection is instant
    const timeout = setTimeout(() => {
      setReady(true);
      clearInterval(checkReady);
    }, 3000);
    return () => {
      clearInterval(checkReady);
      clearTimeout(timeout);
      // Keep socket alive across route changes; only disconnect on tab close
    };
  }, []);

  return { socket: socketRef.current!, playerId: playerIdRef.current, ready };
}
