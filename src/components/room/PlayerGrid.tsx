import { motion } from "framer-motion";
import type { PublicPlayer, Role } from "@/lib/gameTypes";
import { Crown, User2, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerGridProps {
  players: PublicPlayer[];
  presidentId?: string | null;
  selectedIds?: Set<string>;
  highlightIds?: Set<string>;
  onPlayerClick?: (id: string) => void;
  meId?: string;
  // Map of revealed roles (used only at GAME_END or for trust reveals to me)
  revealedRoles?: Record<string, Role>;
  className?: string;
}

export function PlayerGrid({
  players,
  presidentId,
  selectedIds,
  highlightIds,
  onPlayerClick,
  meId,
  revealedRoles,
  className,
}: PlayerGridProps) {
  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3", className)}>
      {players.map((p, i) => {
        const isPresident = p.id === presidentId;
        const isSelected = selectedIds?.has(p.id);
        const isHighlight = highlightIds?.has(p.id);
        const isMe = p.id === meId;
        const role = revealedRoles?.[p.id];
        const dead = !p.isAlive;

        return (
          <motion.button
            key={p.id}
            type="button"
            disabled={!onPlayerClick || dead}
            onClick={() => onPlayerClick?.(p.id)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={onPlayerClick && !dead ? { y: -2 } : undefined}
            className={cn(
              "relative panel p-3 text-left transition-all",
              "flex flex-col gap-2 min-h-[88px]",
              onPlayerClick && !dead && "hover:border-primary/60 cursor-pointer",
              isSelected && "ring-2 ring-primary border-primary bg-surface-2",
              isHighlight && "ring-2 ring-loyalist border-loyalist",
              dead && "opacity-40 grayscale",
              role === "TRAITOR" && "border-traitor/60 bg-traitor/5",
              role === "LOYALIST" && "border-loyalist/60 bg-loyalist/5",
              role === "PRESIDENT" && "border-president/60 bg-president/10",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-mono font-bold",
                  isMe ? "bg-primary text-primary-foreground" : "bg-surface-3 text-foreground",
                )}
              >
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate flex items-center gap-1">
                  {p.name}
                  {isMe && <span className="text-[10px] text-muted-foreground">(you)</span>}
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  {p.isConnected ? (
                    <Wifi className="h-2.5 w-2.5" />
                  ) : (
                    <WifiOff className="h-2.5 w-2.5 text-destructive" />
                  )}
                  Seat {p.seatIndex + 1}
                </div>
              </div>
              {isPresident && (
                <Crown className="h-4 w-4 text-primary shrink-0" aria-label="President" />
              )}
            </div>

            {role && (
              <div
                className={cn(
                  "text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded self-start",
                  role === "TRAITOR" && "bg-traitor/20 text-traitor",
                  role === "LOYALIST" && "bg-loyalist/20 text-loyalist",
                  role === "PRESIDENT" && "bg-president/20 text-president",
                )}
              >
                {role}
              </div>
            )}

            {dead && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-destructive bg-background/80 px-2 py-1 rounded">
                  Eliminated
                </div>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
