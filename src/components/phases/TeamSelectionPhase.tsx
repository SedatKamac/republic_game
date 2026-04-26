import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import { TEAM_SIZES } from "@/lib/gameTypes";

interface TeamSelectionPhaseProps {
  room: RoomState;
  meId: string;
  onSubmit: (ids: string[]) => void;
}

export function TeamSelectionPhase({ room, meId, onSubmit }: TeamSelectionPhaseProps) {
  const isPresident = room.currentRound?.presidentId === meId;
  const roundNo = room.currentRound?.no || 1;
  const teamSize = TEAM_SIZES[room.players.length]?.[roundNo - 1] ?? 3;
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

  const selectableIds = useMemo(
    () => new Set(room.players.map((p) => p.id)),
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
        onPlayerClick={isPresident && !submitted ? (id) => selectableIds.has(id) && toggle(id) : undefined}
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
