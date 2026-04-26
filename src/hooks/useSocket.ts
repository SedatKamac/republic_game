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
    if (name) {
      socketRef.current!.connect(pid, name);
    } else {
      socketRef.current!.connect(pid, "");
    }
    setReady(true);
    return () => {
      // Keep socket alive across route changes; only disconnect on tab close
    };
  }, []);

  return { socket: socketRef.current!, playerId: playerIdRef.current, ready };
}
