import { useEffect, useState } from "react";
import type { RoomState } from "@/lib/gameTypes";
import { useSocket } from "./useSocket";

export function useRoomState(): {
  room: RoomState | null;
  error: { code: string; message: string } | null;
} {
  const { socket, ready } = useSocket();
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    if (!ready) return;
    const offState = socket.on("room:state", (s: RoomState) => {
      setRoom(s);
      setError(null);
    });
    const offErr = socket.on("room:error", (e: { code: string; message: string }) => {
      setError(e);
    });
    return () => {
      offState();
      offErr();
    };
  }, [socket, ready]);

  return { room, error };
}
