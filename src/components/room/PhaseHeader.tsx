import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/gameTypes";
import { PHASE_LABEL } from "@/lib/gameTypes";
import { Button } from "@/components/ui/button";
import { FastForward } from "lucide-react";

interface PhaseHeaderProps {
  phase: Phase;
  remaining?: number;
  roundNo?: number | null;
  subtitle?: string;
  isHost?: boolean;
  onSkip?: () => void;
}

export function PhaseHeader({ phase, remaining, roundNo, subtitle, isHost, onSkip }: PhaseHeaderProps) {
  const tense = remaining !== undefined && remaining > 0 && remaining <= 10;
  const showSkip = isHost && phase !== "LOBBY" && phase !== "GAME_END";

  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          {roundNo ? `Round ${roundNo}` : "Setup"}
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold text-balance">
          {PHASE_LABEL[phase]}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {showSkip && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            className="h-8 text-[10px] uppercase tracking-widest font-mono gap-2 opacity-60 hover:opacity-100"
          >
            <FastForward className="h-3 w-3" /> Skip
          </Button>
        )}
        
        {remaining !== undefined && (
          <motion.div
            key={phase}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "code-chip text-3xl sm:text-4xl tabular-nums min-w-[100px] text-center",
              tense ? "animate-tense" : "text-primary",
            )}
          >
            {String(Math.floor(Math.max(0, remaining) / 60)).padStart(2, "0")}:
            {String(Math.max(0, remaining) % 60).padStart(2, "0")}
          </motion.div>
        )}
      </div>
    </div>
  );
}
