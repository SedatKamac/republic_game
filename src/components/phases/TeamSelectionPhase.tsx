import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import type { RoomState } from "@/lib/gameTypes";
import { TEAM_SIZE_BY_PLAYERS } from "@/lib/gameTypes";

interface TeamSelectionPhaseProps {
  room: RoomState;
  meId: string;
  onSubmit: (ids: string[]) => void;
}

export function TeamSelectionPhase({ room, meId, onSubmit }: TeamSelectionPhaseProps) {
  const isPresident = room.currentRound?.presidentId === meId;
  const teamSize = TEAM_SIZE_BY_PLAYERS[room.players.length] ?? 3;
  const president = room.players.find((p) => p.id === room.currentRound?.presidentId);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    if (!isPresident) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < teamSize) next.add(id);
      return next;
    });
  };

  const canSubmit = isPresident && selected.size === teamSize;
  const submitted = (room.currentRound?.team.length ?? 0) > 0;

  const aliveSelectable = useMemo(
    () => new Set(room.players.filter((p) => p.isAlive).map((p) => p.id)),
    [room.players],
  );

  return (
    <div className="space-y-6">
      <div className="panel-elevated p-6">
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Mission {room.currentRound?.no}
        </div>
        <h2 className="text-xl sm:text-2xl font-display mt-1">
          {isPresident
            ? `Pick ${teamSize} players for this mission.`
            : `${president?.name ?? "President"} is picking ${teamSize} players…`}
        </h2>
        {isPresident && (
          <p className="text-sm text-muted-foreground mt-2">
            You can include yourself. Choose wisely — saboteurs only need one vote to fail it.
          </p>
        )}
      </div>

      <PlayerGrid
        players={room.players}
        presidentId={room.currentRound?.presidentId}
        selectedIds={selected}
        meId={meId}
        onPlayerClick={isPresident && !submitted ? (id) => aliveSelectable.has(id) && toggle(id) : undefined}
      />

      {isPresident && !submitted && (
        <div className="sticky bottom-4 z-10">
          <Button
            size="lg"
            disabled={!canSubmit}
            onClick={() => onSubmit([...selected])}
            className="w-full h-14 text-base font-display"
          >
            Confirm team ({selected.size}/{teamSize})
          </Button>
        </div>
      )}

      {submitted && (
        <div className="panel p-4 text-center text-sm text-muted-foreground">
          Team locked in. Moving to secret action…
        </div>
      )}
    </div>
  );
}
