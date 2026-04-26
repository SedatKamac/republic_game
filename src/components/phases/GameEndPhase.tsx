import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import type { GameEndPayload, RoomState } from "@/lib/gameTypes";
import { Trophy, RotateCcw, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameEndPhaseProps {
  room: RoomState;
  meId: string;
  result: GameEndPayload | null;
  myFaction?: "LOYALIST" | "TRAITOR" | null;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function GameEndPhase({ room, meId, result, myFaction, onPlayAgain, onLeave }: GameEndPhaseProps) {
  if (!result) {
    return (
      <div className="panel p-8 text-center text-muted-foreground">Tallying final results…</div>
    );
  }

  const youWon = myFaction === result.winner;
  const isHost = room.hostId === meId;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 14 }}
        className={cn(
          "panel-elevated p-8 sm:p-12 text-center border-2",
          result.winner === "LOYALIST"
            ? "border-loyalist/60 shadow-glow-loyalist"
            : "border-traitor/60 shadow-glow-traitor",
        )}
      >
        <Trophy
          className={cn(
            "h-16 w-16 mx-auto mb-3",
            result.winner === "LOYALIST" ? "text-loyalist" : "text-traitor",
          )}
        />
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground">
          {youWon ? "Victory" : "Defeat"}
        </div>
        <h1
          className={cn(
            "text-4xl sm:text-6xl font-display font-bold mt-1",
            result.winner === "LOYALIST" ? "text-loyalist" : "text-traitor",
          )}
        >
          {result.winner === "LOYALIST" ? "Loyalists Win" : "Traitors Win"}
        </h1>
        <p className="text-sm text-muted-foreground mt-3 text-balance max-w-md mx-auto">
          {result.winner === "LOYALIST"
            ? "Order is restored. The traitors are exposed."
            : "Consensus has fractured. The traitors went undetected."}
        </p>
      </motion.div>

      <div className="panel p-5">
        <h3 className="font-display text-lg mb-4">All roles revealed</h3>
        <PlayerGrid players={room.players} meId={meId} revealedRoles={result.roles} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {isHost ? (
          <Button size="lg" onClick={onPlayAgain} className="h-14 font-display">
            <RotateCcw className="h-5 w-5 mr-2" /> Play again
          </Button>
        ) : (
          <div className="panel p-4 text-center text-sm text-muted-foreground flex items-center justify-center">
            Waiting for host…
          </div>
        )}
        <Button size="lg" variant="outline" onClick={onLeave} className="h-14 font-display">
          <Home className="h-5 w-5 mr-2" /> Home
        </Button>
      </div>
    </div>
  );
}
