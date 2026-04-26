import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoomState, TeamVote, MyRolePayload } from "@/lib/gameTypes";

interface TeamVotingPhaseProps {
  room: RoomState;
  meId: string;
  myRole: MyRolePayload | null;
  onSubmit: (vote: TeamVote) => void;
}

export function TeamVotingPhase({ room, meId, myRole, onSubmit }: TeamVotingPhaseProps) {
  const me = room.players.find((p) => p.id === meId);
  const president = room.players.find((p) => p.id === room.currentRound?.presidentId);
  const team = room.currentRound?.team || [];
  
  const [localSubmitted, setLocalSubmitted] = useState(false);
  const hasVoted = localSubmitted || room.votedPlayerIds.includes(meId);
  
  const teamPlayers = room.players.filter(p => team.includes(p.id));

  const handleVote = (vote: TeamVote) => {
    setLocalSubmitted(true);
    onSubmit(vote);
  };

  return (
    <div className="space-y-6">
      <div className="panel p-6 text-center">
        <h2 className="text-xl font-display font-bold mb-2">Approve this Mission Team?</h2>
        <p className="text-sm text-muted-foreground text-balance">
          <span className="text-primary font-semibold">{president?.name}</span> has proposed this team.
          If rejected, the presidency rotates.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {teamPlayers.map((player) => {
          const knownRole = myRole?.knownRoles?.[player.id];
          return (
            <div key={player.id} className="panel-elevated p-4 flex flex-col items-center gap-2">
              <div className="h-10 w-10 rounded-full bg-surface-3 flex items-center justify-center border border-border relative">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {knownRole && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-3 h-3 rounded-full border border-background",
                    knownRole === "TRAITOR" ? "bg-traitor" : "bg-loyalist"
                  )} />
                )}
              </div>
              <div className="text-center">
                <span className="text-sm font-medium block">{player.name}</span>
                {knownRole && (
                   <span className={cn(
                     "text-[9px] uppercase tracking-tighter font-mono",
                     knownRole === "TRAITOR" ? "text-traitor" : "text-loyalist"
                   )}>
                     {knownRole}
                   </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!hasVoted ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <Button
              onClick={() => handleVote("APPROVE")}
              className="w-full h-16 text-lg gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-600/40 text-emerald-400"
              variant="outline"
            >
              <Check className="h-6 w-6" /> Onay
            </Button>
            {!me?.doubleApproveUsed && (
              <Button
                onClick={() => handleVote("DOUBLE_APPROVE")}
                className="w-full h-12 text-xs uppercase tracking-widest gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                variant="outline"
              >
                <ShieldCheck className="h-4 w-4" /> Double Onay
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={() => handleVote("REJECT")}
              className="w-full h-16 text-lg gap-2 bg-rose-600/20 hover:bg-rose-600/30 border-rose-600/40 text-rose-400"
              variant="outline"
            >
              <X className="h-6 w-6" /> Red
            </Button>
            {!me?.doubleRejectUsed && (
              <Button
                onClick={() => handleVote("DOUBLE_REJECT")}
                className="w-full h-12 text-xs uppercase tracking-widest gap-2 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300"
                variant="outline"
              >
                <ShieldAlert className="h-4 w-4" /> Double Red
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="panel p-8 text-center">
           <p className="text-primary animate-pulse font-medium">Oyunuz kaydedildi. Diğer oyuncular bekleniyor...</p>
        </div>
      )}

      <div className="panel p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {room.players.map(p => (
             <div 
               key={p.id}
               className={`h-2 w-2 rounded-full transition-colors duration-500 ${room.votedPlayerIds.includes(p.id) ? 'bg-primary' : 'bg-surface-3'}`}
               title={p.name}
             />
          ))}
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase tracking-tighter">
          {room.votedPlayerIds.length} / {room.players.length} Players Voted
        </p>
      </div>
    </div>
  );
}

