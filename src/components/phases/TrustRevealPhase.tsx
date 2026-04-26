import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import type { MyRolePayload, RoomState, TrustRevealPayload } from "@/lib/gameTypes";
import { ShieldCheck, EyeOff } from "lucide-react";

interface TrustRevealPhaseProps {
  room: RoomState;
  meId: string;
  myRole: MyRolePayload | null;
  trustReveals: TrustRevealPayload[];
  onReveal: (targetId: string) => void;
}

export function TrustRevealPhase({
  room, meId, myRole, trustReveals, onReveal,
}: TrustRevealPhaseProps) {
  const isLoyalist = myRole?.faction === "LOYALIST";
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [picking, setPicking] = useState(false);

  const handleClick = (id: string) => {
    if (id === meId || revealedIds.has(id)) return;
    onReveal(id);
    setRevealedIds(new Set([...revealedIds, id]));
    setPicking(false);
  };

  return (
    <div className="space-y-6">
      <div className="panel-elevated p-6 text-center">
        <ShieldCheck className="h-8 w-8 text-loyalist mx-auto mb-2" />
        <h2 className="text-xl sm:text-2xl font-display">Trust Reveal Window</h2>
        <p className="text-sm text-muted-foreground mt-2 text-balance max-w-lg mx-auto">
          {isLoyalist
            ? "Loyalists may secretly reveal their role to ONE other player. Use it to build a trust chain — but the recipient could be a traitor in disguise."
            : "Loyalists are exchanging private signals. You're not part of this."}
        </p>
      </div>

      <AnimatePresence>
        {trustReveals.map((tr) => (
          <motion.div
            key={tr.fromPlayerId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="panel border-loyalist/60 bg-loyalist/10 p-4 flex items-center gap-3"
          >
            <ShieldCheck className="h-5 w-5 text-loyalist shrink-0" />
            <div className="text-sm">
              <span className="font-semibold text-loyalist">{tr.fromName}</span> privately revealed
              to you that they are a <span className="font-mono uppercase">{tr.role}</span>.
              <div className="text-xs text-muted-foreground mt-0.5">Only you can see this.</div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {isLoyalist && (
        <div className="space-y-3">
          {!picking && (
            <Button
              size="lg"
              variant="outline"
              onClick={() => setPicking(true)}
              className="w-full h-14 border-loyalist/60 text-loyalist hover:bg-loyalist/10"
            >
              <ShieldCheck className="h-5 w-5 mr-2" /> Reveal my role to someone
            </Button>
          )}
          {picking && (
            <div className="panel border-loyalist/40 p-4">
              <div className="text-sm font-medium mb-3 text-center">
                Tap the player you trust. This is irreversible.
              </div>
              <PlayerGrid
                players={room.players.filter((p) => p.id !== meId)}
                meId={meId}
                onPlayerClick={handleClick}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPicking(false)}
                className="mt-3 w-full"
              >
                <EyeOff className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </div>
          )}
        </div>
      )}

      {!picking && (
        <PlayerGrid
          players={room.players}
          presidentId={room.currentRound?.presidentId}
          meId={meId}
        />
      )}
    </div>
  );
}
