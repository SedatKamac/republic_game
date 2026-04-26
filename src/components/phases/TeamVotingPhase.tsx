import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ShieldAlert, ShieldCheck } from "lucide-react";
import type { RoomState, PublicPlayer, TeamVote } from "@/lib/gameTypes";

interface TeamVotingPhaseProps {
  room: RoomState;
  meId: string;
  onSubmit: (vote: TeamVote) => void;
}

export function TeamVotingPhase({ room, meId, onSubmit }: TeamVotingPhaseProps) {
  const me = room.players.find((p) => p.id === meId);
  const president = room.players.find((p) => p.id === room.currentRound?.presidentId);
  const team = room.currentRound?.team || [];
  
  const hasVoted = !!room.lastTeamVote?.tallies?.[meId]; // This might be tricky if we want to show mid-phase
  // In mock, we don't have partial results in RoomState, so we rely on local state or check the result payload
  // For simplicity, let's assume if it's TEAM_VOTING phase and we haven't sent our emit, we can vote.
  
  const teamPlayers = room.players.filter(p => team.includes(p.id));

  return (
    <div className="space-y-6">
      <div className="panel p-6 text-center">
        <h2 className="text-xl font-display font-bold mb-2">Approve this Mission Team?</h2>
        <p className="text-sm text-muted-foreground">
          <span className="text-primary font-semibold">{president?.name}</span> has proposed this team.
          If rejected, the presidency rotates.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {teamPlayers.map((player) => (
          <div key={player.id} className="panel-elevated p-4 flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-surface-3 flex items-center justify-center border border-border">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm font-medium">{player.name}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-3">
          <Button
            onClick={() => onSubmit("APPROVE")}
            className="w-full h-16 text-lg gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-600/40 text-emerald-400"
            variant="outline"
          >
            <Check className="h-6 w-6" /> Approve
          </Button>
          {!me?.doubleApproveUsed && (
            <Button
              onClick={() => onSubmit("DOUBLE_APPROVE")}
              className="w-full h-12 text-xs uppercase tracking-widest gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
              variant="outline"
            >
              <ShieldCheck className="h-4 w-4" /> Double Approve
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => onSubmit("REJECT")}
            className="w-full h-16 text-lg gap-2 bg-rose-600/20 hover:bg-rose-600/30 border-rose-600/40 text-rose-400"
            variant="outline"
          >
            <X className="h-6 w-6" /> Reject
          </Button>
          {!me?.doubleRejectUsed && (
            <Button
              onClick={() => onSubmit("DOUBLE_REJECT")}
              className="w-full h-12 text-xs uppercase tracking-widest gap-2 bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300"
              variant="outline"
            >
              <ShieldAlert className="h-4 w-4" /> Double Reject
            </Button>
          )}
        </div>
      </div>

      <div className="panel p-4">
        <div className="flex flex-wrap gap-2 justify-center">
          {room.players.filter(p => p.isAlive).map(p => (
             <div 
               key={p.id}
               className={`h-2 w-2 rounded-full ${room.lastTeamVote?.tallies[p.id] ? 'bg-primary' : 'bg-surface-3'}`}
               title={p.name}
             />
          ))}
        </div>
        <p className="text-[10px] text-center text-muted-foreground mt-2 uppercase tracking-tighter">
          Waiting for all players to vote...
        </p>
      </div>
    </div>
  );
}
