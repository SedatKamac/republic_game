import { motion } from "framer-motion";
import type { MyRolePayload } from "@/lib/gameTypes";
import { Shield, Skull, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleCardProps {
  role: MyRolePayload;
  compact?: boolean;
}

const ROLE_DETAIL: Record<
  MyRolePayload["role"],
  { title: string; tagline: string; Icon: typeof Shield; color: string; glow: string }
> = {
  LOYALIST: {
    title: "Loyalist",
    tagline: "Identify the Traitors. Trust carefully.",
    Icon: Shield,
    color: "text-loyalist border-loyalist/60 bg-loyalist/10",
    glow: "shadow-glow-loyalist",
  },
  TRAITOR: {
    title: "Traitor",
    tagline: "Sabotage missions without getting caught.",
    Icon: Skull,
    color: "text-traitor border-traitor/60 bg-traitor/10",
    glow: "shadow-glow-traitor",
  },
  PRESIDENT: {
    title: "President",
    tagline: "Loyalist with authority. You pick the missions.",
    Icon: Crown,
    color: "text-president border-president/60 bg-president/10",
    glow: "shadow-glow-amber",
  },
};

export function RoleCard({ role, compact }: RoleCardProps) {
  const d = ROLE_DETAIL[role.role];
  const { Icon } = d;

  if (compact) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium",
          d.color,
        )}
      >
        <Icon className="h-4 w-4" />
        <span className="font-display">{d.title}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ rotateY: 90, opacity: 0 }}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className={cn(
        "panel-elevated p-8 sm:p-10 max-w-md text-center border-2",
        d.color,
        d.glow,
      )}
    >
      <Icon className="h-16 w-16 mx-auto mb-4" />
      <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-1">
        Your role
      </div>
      <h2 className={cn("text-4xl sm:text-5xl font-display font-bold mb-3")}>{d.title}</h2>
      <p className="text-sm sm:text-base text-foreground/80 text-balance">{d.tagline}</p>
      <div className="mt-6 pt-6 border-t border-border/50 text-xs text-muted-foreground">
        Faction: <span className="font-mono uppercase tracking-wider">{role.faction}</span>
      </div>
    </motion.div>
  );
}
