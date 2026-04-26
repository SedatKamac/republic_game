import { PlayerGrid } from "@/components/room/PlayerGrid";
import { RoleCard } from "@/components/room/RoleCard";
import type { MyRolePayload, RoomState } from "@/lib/gameTypes";

import { FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiscussionPhaseProps {
  room: RoomState;
  meId: string;
  myRole: MyRolePayload | null;
}

export function DiscussionPhase({ room, meId, myRole }: DiscussionPhaseProps) {
  const president = room.players.find((p) => p.id === room.currentRound?.presidentId);

  return (
    <div className="space-y-6">
      <div className="panel-elevated p-6 text-center">
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Open Discussion
        </div>
        <p className="mt-2 text-base sm:text-lg text-balance max-w-2xl mx-auto">
          Talk it out. Accuse, defend, deflect. When the timer ends,{" "}
          <span className="text-primary font-semibold">{president?.name ?? "the President"}</span>{" "}
          will pick the mission team.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_auto] gap-6 items-start">
        <PlayerGrid
          players={room.players}
          presidentId={room.currentRound?.presidentId}
          meId={meId}
        />
        {myRole && (
          <div className="lg:sticky lg:top-6">
            <RoleCard role={myRole} compact />
            <p className="text-[10px] text-muted-foreground mt-2 max-w-[200px]">
              Stay in character.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
