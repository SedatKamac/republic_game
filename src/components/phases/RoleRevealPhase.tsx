import { motion } from "framer-motion";
import { RoleCard } from "@/components/room/RoleCard";
import type { MyRolePayload } from "@/lib/gameTypes";

interface RoleRevealPhaseProps {
  role: MyRolePayload | null;
  remaining: number;
}

export function RoleRevealPhase({ role, remaining }: RoleRevealPhaseProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-2">
          Round 1 begins in {remaining}s
        </div>
        <h1 className="text-3xl font-display font-semibold">Look closely. Trust no one.</h1>
      </motion.div>

      {role ? (
        <RoleCard role={role} />
      ) : (
        <div className="panel-elevated p-10 max-w-md text-center text-muted-foreground">
          Receiving your secret role…
        </div>
      )}

      <p className="text-xs text-muted-foreground max-w-sm text-center text-balance">
        Your role is private. Don't show this screen to other players.
      </p>
    </div>
  );
}
