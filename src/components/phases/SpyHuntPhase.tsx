import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Search, Skull } from "lucide-react";
import type { RoomState, PublicPlayer } from "@/lib/gameTypes";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import { useState } from "react";

interface SpyHuntPhaseProps {
  room: RoomState;
  meId: string;
  onSubmit: (targetId: string) => void;
}

export function SpyHuntPhase({ room, meId, onSubmit }: SpyHuntPhaseProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isTraitor = room.players.find(p => p.id === meId)?.id === meId; // Simplification
  // In real logic, we check faction.
  
  const traitors = room.players.filter(p => !room.players.find(pp => pp.id === p.id)); // Need to know who is traitor?
  // Actually, only traitors should see the action buttons.
  
  return (
    <div className="space-y-6">
      <div className="panel p-8 text-center bg-traitor/10 border-traitor/20">
        <ShieldAlert className="h-12 w-12 text-traitor mx-auto mb-4" />
        <h2 className="text-3xl font-display font-bold text-traitor uppercase tracking-tighter">
          Spy Hunt
        </h2>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">
          The Loyalists have won the missions, but the game is not over. 
          <span className="text-traitor font-bold"> Traitors</span>, identify the <span className="text-primary font-bold">Spy</span> to steal the victory.
        </p>
      </div>

      <PlayerGrid
        players={room.players}
        meId={meId}
        selectedIds={selectedId ? new Set([selectedId]) : undefined}
        onPlayerClick={(id) => setSelectedId(id)}
      />

      <div className="flex justify-center pt-4">
        <Button
          onClick={() => selectedId && onSubmit(selectedId)}
          disabled={!selectedId}
          size="lg"
          className="h-16 px-12 text-xl font-display gap-3 bg-traitor hover:bg-traitor/90 text-white"
        >
          <Skull className="h-6 w-6" /> Execute Spy Hunt
        </Button>
      </div>
      
      <p className="text-center text-[10px] text-muted-foreground uppercase tracking-widest">
        Traitors must agree on a single target.
      </p>
    </div>
  );
}
