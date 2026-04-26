import { useEffect, useState } from "react";
import type { TrustRevealPayload } from "@/lib/gameTypes";
import { useSocket } from "./useSocket";

export function useTrustReveals(): TrustRevealPayload[] {
  const { socket, ready } = useSocket();
  const [reveals, setReveals] = useState<TrustRevealPayload[]>([]);

  useEffect(() => {
    if (!ready) return;
    const off = socket.on("you:trustRevealed", (p: TrustRevealPayload) => {
      setReveals((prev) => (prev.some((r) => r.fromPlayerId === p.fromPlayerId) ? prev : [...prev, p]));
    });
    return off;
  }, [socket, ready]);

  return reveals;
}
