import { motion, AnimatePresence } from "framer-motion";
import type { RoomState, TeamVote } from "@/lib/gameTypes";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LastVoteResultsProps {
  room: RoomState;
}

export function LastVoteResults({ room }: LastVoteResultsProps) {
  const lastVote = room.lastTeamVote;
  if (!lastVote) return null;

  return (
    <div className="panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Last Team Vote Results</h3>
        <div className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
          lastVote.approved ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
        )}>
          {lastVote.approved ? "Approved" : "Rejected"}
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {room.players.map(p => {
          const vote = lastVote.tallies[p.id];
          if (!vote) return null;
          const isApprove = vote === "APPROVE" || vote === "DOUBLE_APPROVE";
          const isDouble = vote === "DOUBLE_APPROVE" || vote === "DOUBLE_REJECT";

          return (
            <div key={p.id} className="flex items-center gap-2 p-2 rounded bg-surface-2 border border-border/40">
              <div className={cn(
                "h-6 w-6 rounded flex items-center justify-center shrink-0",
                isApprove ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
              )}>
                {isApprove ? (
                  isDouble ? <ShieldCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />
                ) : (
                  isDouble ? <ShieldAlert className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium truncate">{p.name}</div>
                <div className={cn(
                  "text-[8px] uppercase font-mono",
                  isApprove ? "text-emerald-500/70" : "text-rose-500/70"
                )}>
                  {vote.replace('_', ' ')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
