import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import type { RoomState } from "@/lib/gameTypes";
import { Vote } from "lucide-react";

interface VotingPhaseProps {
  room: RoomState;
  meId: string;
  onVote: (targetId: string) => void;
}

export function VotingPhase({ room, meId, onVote }: VotingPhaseProps) {
  const me = room.players.find((p) => p.id === meId);
  const canVote = me?.isAlive ?? false;
  const [target, setTarget] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!target || submitted) return;
    onVote(target);
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div className="panel-elevated p-6 text-center">
        <Vote className="h-8 w-8 text-primary mx-auto mb-2" />
        <h2 className="text-xl sm:text-2xl font-display">Eliminate one player</h2>
        <p className="text-sm text-muted-foreground mt-2 text-balance max-w-lg mx-auto">
          Votes are anonymous. The most-voted player is removed from the game. Ties = nobody is eliminated.
        </p>
      </div>

      <PlayerGrid
        players={room.players}
        presidentId={room.currentRound?.presidentId}
        selectedIds={target ? new Set([target]) : undefined}
        meId={meId}
        onPlayerClick={canVote && !submitted ? (id) => id !== meId && setTarget(id) : undefined}
      />

      {canVote && !submitted && (
        <Button
          size="lg"
          disabled={!target}
          onClick={submit}
          className="w-full h-14 text-base font-display sticky bottom-4"
        >
          {target
            ? `Cast vote against ${room.players.find((p) => p.id === target)?.name}`
            : "Select a player"}
        </Button>
      )}

      {submitted && (
        <div className="panel p-4 text-center text-sm text-muted-foreground">
          Vote sealed. Waiting for the rest…
        </div>
      )}

      {!canVote && (
        <div className="panel p-4 text-center text-sm text-muted-foreground">
          You've been eliminated. You can still watch the game play out.
        </div>
      )}
    </div>
  );
}
