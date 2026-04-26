import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Phase } from "@/lib/gameTypes";
import { PHASE_LABEL } from "@/lib/gameTypes";

interface PhaseHeaderProps {
  phase: Phase;
  remaining?: number;
  roundNo?: number | null;
  subtitle?: string;
}

export function PhaseHeader({ phase, remaining, roundNo, subtitle }: PhaseHeaderProps) {
  const tense = remaining !== undefined && remaining > 0 && remaining <= 10;

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
      {remaining !== undefined && remaining > 0 && (
        <motion.div
          key={phase}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "code-chip text-3xl sm:text-4xl tabular-nums",
            tense ? "animate-tense" : "text-primary",
          )}
        >
          {String(Math.floor(remaining / 60)).padStart(2, "0")}:
          {String(remaining % 60).padStart(2, "0")}
        </motion.div>
      )}
    </div>
  );
}
