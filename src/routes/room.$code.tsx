import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useSocket } from "@/hooks/useSocket";
import { useRoomState } from "@/hooks/useRoomState";
import { useMyRole } from "@/hooks/useMyRole";
import { usePhaseTimer } from "@/hooks/usePhaseTimer";
import { useTrustReveals } from "@/hooks/useTrustReveals";
import { setLastRoom } from "@/lib/session";
import { LobbyPhase } from "@/components/phases/LobbyPhase";
import { RoleRevealPhase } from "@/components/phases/RoleRevealPhase";
import { DiscussionPhase } from "@/components/phases/DiscussionPhase";
import { TeamSelectionPhase } from "@/components/phases/TeamSelectionPhase";
import { TeamVotingPhase } from "@/components/phases/TeamVotingPhase";
import { SecretActionPhase } from "@/components/phases/SecretActionPhase";
import { ResultRevealPhase } from "@/components/phases/ResultRevealPhase";
import { TrustRevealPhase } from "@/components/phases/TrustRevealPhase";
import { SpyHuntPhase } from "@/components/phases/SpyHuntPhase";
import { GameEndPhase } from "@/components/phases/GameEndPhase";
import { PhaseHeader } from "@/components/room/PhaseHeader";
import { MissionTracker } from "@/components/room/MissionTracker";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import type { GameEndPayload } from "@/lib/gameTypes";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/room/$code")({
  head: ({ params }) => ({
    meta: [
      { title: `Room ${params.code} — CONSENSUS` },
      { name: "description", content: "Live multiplayer round of CONSENSUS." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { code } = Route.useParams();
  const navigate = useNavigate();
  const { socket, playerId, ready } = useSocket();
  const { room, error } = useRoomState();
  const myRole = useMyRole();
  const trustReveals = useTrustReveals();
  const [gameEnd, setGameEnd] = useState<GameEndPayload | null>(null);
  const remaining = usePhaseTimer(room?.phaseEndsAt ?? null);

  // Auto-rejoin if user lands here cold (e.g. refresh)
  useEffect(() => {
    if (!ready) return;
    // If we're already in this room and our name is set, don't re-join
    if (room && room.code === code) {
      const me = room.players.find(p => p.id === playerId);
      if (me && me.name !== "Player" && me.name !== "") return;
    }
    
    if (!room || (room && room.code !== code)) {
      const name = localStorage.getItem("consensus_name") || "";
      socket.emit("room:join", { code, displayName: name });
    }
  }, [ready, room, code, socket, playerId]);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
      const t = setTimeout(() => navigate({ to: "/" }), 1500);
      return () => clearTimeout(t);
    }
  }, [error, navigate]);

  useEffect(() => {
    const off = socket.on("game:ended", (p: GameEndPayload) => setGameEnd(p));
    return off;
  }, [socket]);

  useEffect(() => {
    if (room?.phase === "LOBBY") setGameEnd(null);
  }, [room?.phase]);

  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Toaster theme="dark" />
        <div className="text-center">
          <Shield className="h-8 w-8 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-muted-foreground">Connecting to room {code}…</p>
        </div>
      </main>
    );
  }

  const phaseSubtitle =
    room.phase === "DISCUSSION"
      ? "Talk freely. Find the patterns."
      : room.phase === "TEAM_SELECTION"
        ? "President is choosing the mission team."
      : room.phase === "TEAM_VOTING"
        ? "Everyone votes to approve or reject the team."
        : room.phase === "SECRET_ACTION"
          ? "Team members are voting in secret."
          : room.phase === "SPY_HUNT"
            ? "Traitors are searching for the Spy!"
            : undefined;

  const leave = () => {
    socket.emit("room:leave");
    setLastRoom(null);
    navigate({ to: "/" });
  };

  return (
    <main className="min-h-screen pb-12">
      <Toaster theme="dark" />
      <header className="px-4 sm:px-6 py-4 border-b border-border/40 sticky top-0 z-20 backdrop-blur-md bg-background/80">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-semibold text-sm leading-tight">CONSENSUS</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                Room <span className="text-primary">{room.code}</span>
              </div>
            </div>
          </div>
          <MissionTracker missions={room.missions} />
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {room.phase !== "LOBBY" && room.phase !== "GAME_END" && (
          <PhaseHeader
            phase={room.phase}
            remaining={remaining}
            roundNo={room.currentRound?.no ?? null}
            subtitle={phaseSubtitle}
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={room.phase}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {room.phase === "LOBBY" && (
              <LobbyPhase
                room={room}
                meId={playerId}
                onStart={() => socket.emit("game:start")}
                onUpdateSettings={(s) => socket.emit("lobby:updateSettings", s)}
                onAddBot={() => socket.emit("lobby:addBot")}
                onRemoveBot={() => socket.emit("lobby:removeBot")}
                onLeave={leave}
              />
            )}
            {room.phase === "ROLE_ASSIGNMENT" && (
              <RoleRevealPhase role={myRole} remaining={remaining} />
            )}
            {room.phase === "DISCUSSION" && (
              <DiscussionPhase 
                room={room} 
                meId={playerId} 
                myRole={myRole} 
                onSkip={() => socket.emit("game:skipPhase")}
              />
            )}
            {room.phase === "TEAM_SELECTION" && (
              <TeamSelectionPhase
                room={room}
                meId={playerId}
                onSubmit={(ids) => socket.emit("team:submit", { playerIds: ids })}
              />
            )}
            {room.phase === "TEAM_VOTING" && (
              <TeamVotingPhase
                room={room}
                meId={playerId}
                onSubmit={(vote) => socket.emit("team:vote", { vote })}
              />
            )}
            {room.phase === "SECRET_ACTION" && (
              <SecretActionPhase
                room={room}
                meId={playerId}
                myRole={myRole}
                onSubmit={(action) => socket.emit("action:submit", { action })}
              />
            )}
            {room.phase === "RESULT_REVEAL" && <ResultRevealPhase room={room} />}
            {room.phase === "TRUST_REVEAL" && (
              <TrustRevealPhase
                room={room}
                meId={playerId}
                myRole={myRole}
                trustReveals={trustReveals}
                onReveal={(targetId) => socket.emit("trust:reveal", { targetPlayerId: targetId })}
              />
            )}
            {room.phase === "SPY_HUNT" && (
              <SpyHuntPhase
                room={room}
                meId={playerId}
                onSubmit={(targetId) => socket.emit("game:spyHunt", { targetPlayerId: targetId })}
              />
            )}
            {room.phase === "WIN_CHECK" && (
              <div className="panel p-8 text-center text-muted-foreground">
                Tallying votes and checking victory…
              </div>
            )}
            {room.phase === "GAME_END" && (
              <GameEndPhase
                room={room}
                meId={playerId}
                result={gameEnd}
                myFaction={myRole?.faction ?? null}
                onPlayAgain={() => socket.emit("game:reset")}
                onLeave={leave}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </main>
  );
}
