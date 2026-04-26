import { useEffect, useState } from "react";

// Counts down to a server-stamped absolute timestamp. Server is source of truth.
export function usePhaseTimer(phaseEndsAt: number | null): number {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!phaseEndsAt) {
      setRemaining(0);
      return;
    }
    const tick = () => {
      const r = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setRemaining(r);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [phaseEndsAt]);

  return remaining;
}
