import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import type { MyRolePayload, RoomState, SecretAction } from "@/lib/gameTypes";
import { Check, X, ShieldCheck } from "lucide-react";

interface SecretActionPhaseProps {
  room: RoomState;
  meId: string;
  myRole: MyRolePayload | null;
  onSubmit: (action: SecretAction) => void;
}

export function SecretActionPhase({ room, meId, myRole, onSubmit }: SecretActionPhaseProps) {
  const onTeam = room.currentRound?.team.includes(meId) ?? false;
  const teamSet = new Set(room.currentRound?.team ?? []);
  const canSabotage = myRole?.faction === "TRAITOR";
  const [submitted, setSubmitted] = useState<SecretAction | null>(null);

  const submit = (a: SecretAction) => {
    if (submitted) return;
    setSubmitted(a);
    onSubmit(a);
  };

  return (
    <div className="space-y-6">
      <div className="panel-elevated p-6 text-center">
        <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
          Mission {room.currentRound?.no}
        </div>
        <h2 className="text-xl sm:text-2xl font-display mt-1">
          {onTeam
            ? "Cast your secret action"
            : "The team is voting in secret…"}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto text-balance">
          {onTeam
            ? "Only your action matters. Nobody will see who chose what — only the result."
            : "You're not on this mission. Watch closely."}
        </p>
      </div>

      <PlayerGrid
        players={room.players}
        presidentId={room.currentRound?.presidentId}
        highlightIds={teamSet}
        meId={meId}
      />

      {onTeam && !submitted && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-2 gap-3 sticky bottom-4"
        >
          <Button
            size="lg"
            onClick={() => submit("SUPPORT")}
            className="h-20 text-base font-display bg-loyalist text-background hover:bg-loyalist/90"
          >
            <Check className="h-5 w-5 mr-2" /> Support
          </Button>
          <Button
            size="lg"
            onClick={() => submit("SABOTAGE")}
            disabled={!canSabotage}
            className="h-20 text-base font-display bg-traitor text-background hover:bg-traitor/90 disabled:opacity-30"
            title={!canSabotage ? "Only Traitors can sabotage" : undefined}
          >
            <X className="h-5 w-5 mr-2" /> Sabotage
          </Button>
        </motion.div>
      )}

      {onTeam && submitted && (
        <div className="panel p-4 text-center flex items-center justify-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-loyalist" />
          Action sealed. Waiting for the rest of the team…
        </div>
      )}
    </div>
  );
}
