import { motion } from "framer-motion";
import type { RoomState } from "@/lib/gameTypes";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultRevealPhaseProps {
  room: RoomState;
}

export function ResultRevealPhase({ room }: ResultRevealPhaseProps) {
  const result = room.currentRound?.missionResult;
  const tally = room.lastMissionTally;
  const isSuccess = result === "SUCCESS";

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-6 py-12">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className={cn(
          "h-32 w-32 rounded-full border-4 flex items-center justify-center",
          isSuccess
            ? "border-loyalist bg-loyalist/20 text-loyalist shadow-glow-loyalist"
            : "border-traitor bg-traitor/20 text-traitor shadow-glow-traitor",
        )}
      >
        {isSuccess ? <Check className="h-16 w-16" /> : <X className="h-16 w-16" />}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center"
      >
        <h1
          className={cn(
            "text-4xl sm:text-5xl font-display font-bold",
            isSuccess ? "text-loyalist" : "text-traitor",
          )}
        >
          {isSuccess ? "Mission Success" : "Mission Sabotaged"}
        </h1>
        {tally && (
          <p className="text-sm text-muted-foreground mt-3 font-mono tracking-wide">
            {tally.supportCount} support · {tally.sabotageCount} sabotage
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-2 text-balance max-w-md">
          {isSuccess
            ? "Loyalists secure another win. Traitors may use the next phase to deepen their cover."
            : "A traitor was on this team. Time to find them."}
        </p>
      </motion.div>
    </div>
  );
}
