import { useEffect, useState } from "react";
import type { MyRolePayload } from "@/lib/gameTypes";
import { useSocket } from "./useSocket";

// Subscribes to PRIVATE role channel. Role data must never appear in room:state.
export function useMyRole(): MyRolePayload | null {
  const { socket, ready } = useSocket();
  const [role, setRole] = useState<MyRolePayload | null>(null);

  useEffect(() => {
    if (!ready) return;
    const off = socket.on("you:role", (p: MyRolePayload) => setRole(p));
    return off;
  }, [socket, ready]);

  return role;
}
