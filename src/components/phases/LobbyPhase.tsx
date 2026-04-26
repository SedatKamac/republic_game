import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { PlayerGrid } from "@/components/room/PlayerGrid";
import type { RoomState } from "@/lib/gameTypes";
import { ROLE_DISTRIBUTION } from "@/lib/gameTypes";
import { Copy, UserPlus, UserMinus, Play, Bot } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface LobbyPhaseProps {
  room: RoomState;
  meId: string;
  onStart: () => void;
  onUpdateSettings: (s: { discussionSeconds: number }) => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onLeave: () => void;
}

export function LobbyPhase({
  room, meId, onStart, onUpdateSettings, onAddBot, onRemoveBot, onLeave,
}: LobbyPhaseProps) {
  const isHost = room.hostId === meId;
  const count = room.players.length;
  const canStart = isHost && count >= 6 && count <= 10;
  const dist = ROLE_DISTRIBUTION[count];
  const [secs, setSecs] = useState(room.settings.discussionSeconds);

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    toast.success("Room code copied");
  };

  return (
    <div className="space-y-6">
      <div className="panel-elevated p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.25em] text-muted-foreground">
            Room Code
          </div>
          <button
            onClick={copyCode}
            className="code-chip text-4xl sm:text-5xl text-primary mt-1 hover:opacity-80 transition flex items-center gap-3"
          >
            {room.code}
            <Copy className="h-5 w-5 text-muted-foreground" />
          </button>
          <div className="text-xs text-muted-foreground mt-2">
            Share with friends — they enter this code on the home page.
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-display font-semibold tabular-nums">
            {count}<span className="text-muted-foreground text-lg">/10</span>
          </div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
            {count < 6 ? `Need ${6 - count} more` : "Ready"}
          </div>
          {dist && (
            <div className="text-xs text-muted-foreground mt-2">
              {dist.traitors} traitor{dist.traitors > 1 ? "s" : ""} · {dist.loyalists} loyalist{dist.loyalists > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">Players</h3>
          {isHost && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onAddBot} disabled={count >= 10}>
                <Bot className="h-4 w-4 mr-1" /> Add bot
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onRemoveBot}
                disabled={!room.players.some((p) => p.id.startsWith("bot_"))}
              >
                <UserMinus className="h-4 w-4 mr-1" /> Remove bot
              </Button>
            </div>
          )}
        </div>
        <PlayerGrid players={room.players} meId={meId} />
      </div>

      {isHost && (
        <div className="panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Discussion length</h3>
            <span className="code-chip text-primary text-lg">{secs}s</span>
          </div>
          <Slider
            min={60}
            max={120}
            step={5}
            value={[secs]}
            onValueChange={(v) => setSecs(v[0])}
            onValueCommit={(v) => onUpdateSettings({ discussionSeconds: v[0] })}
          />
          <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
            <span>60s — fast</span>
            <span>90s — balanced</span>
            <span>120s — deep</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {isHost ? (
          <Button
            size="lg"
            onClick={onStart}
            disabled={!canStart}
            className="flex-1 h-14 text-base font-display"
          >
            <Play className="h-5 w-5 mr-2" /> Start Game
          </Button>
        ) : (
          <div className="flex-1 panel p-4 text-center text-sm text-muted-foreground">
            Waiting for the host to start…
          </div>
        )}
        <Button size="lg" variant="ghost" onClick={onLeave} className="h-14">
          Leave room
        </Button>
      </div>
    </div>
  );
}
