import { motion } from "framer-motion";
import type { MissionResult } from "@/lib/gameTypes";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface MissionTrackerProps {
  missions: (MissionResult | null)[];
}

export function MissionTracker({ missions }: MissionTrackerProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground hidden sm:block">
        Missions
      </div>
      <div className="flex items-center gap-2">
        {missions.map((m, i) => (
          <motion.div
            key={i}
            initial={false}
            animate={{
              scale: m ? [0.6, 1.15, 1] : 1,
            }}
            transition={{ duration: 0.5 }}
            className={cn(
              "h-8 w-8 sm:h-10 sm:w-10 rounded-full border-2 flex items-center justify-center",
              m === "SUCCESS" && "bg-loyalist/20 border-loyalist text-loyalist",
              m === "SABOTAGE" && "bg-traitor/20 border-traitor text-traitor",
              !m && "border-border bg-surface-1 text-muted-foreground",
            )}
          >
            {m === "SUCCESS" && <Check className="h-4 w-4" />}
            {m === "SABOTAGE" && <X className="h-4 w-4" />}
            {!m && <span className="text-xs font-mono">{i + 1}</span>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
