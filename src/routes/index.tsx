import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useSocket } from "@/hooks/useSocket";
import { useRoomState } from "@/hooks/useRoomState";
import { setDisplayName, getDisplayName, setLastRoom } from "@/lib/session";
import { Skull, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CONSENSUS — A social deduction game" },
      {
        name: "description",
        content:
          "6–10 player real-time social deduction. Loyalists hunt traitors. Traitors sabotage in secret. Bluff, deduce, vote.",
      },
      { property: "og:title", content: "CONSENSUS — A social deduction game" },
      {
        property: "og:description",
        content:
          "Real-time hidden-role multiplayer. Identify the traitors before consensus falls.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { socket, playerId, ready } = useSocket();
  const { room, error } = useRoomState();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    setName(getDisplayName());
  }, []);

  useEffect(() => {
    if (room) {
      setLastRoom(room.code);
      navigate({ to: "/room/$code", params: { code: room.code } });
    }
  }, [room, navigate]);

  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Pick a display name first.");
    setDisplayName(trimmed);
    socket.connect(playerId, trimmed); // ensure name updated
    socket.emit("room:create", { displayName: trimmed, settings: { discussionSeconds: 90 } });
  };

  const join = () => {
    const trimmed = name.trim();
    if (!trimmed) return toast.error("Pick a display name first.");
    if (code.trim().length < 4) return toast.error("Enter a valid room code.");
    setDisplayName(trimmed);
    socket.connect(playerId, trimmed);
    socket.emit("room:join", { code: code.trim().toUpperCase(), displayName: trimmed });
  };

  return (
    <main className="min-h-screen flex flex-col">
      <Toaster theme="dark" />
      <header className="px-6 py-6 flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary/20 border border-primary/40 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">CONSENSUS</span>
        </div>
        <a
          href="#how"
          className="text-xs font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          How it works
        </a>
      </header>

      <section className="flex-1 flex items-center px-6 py-12">
        <div className="max-w-6xl w-full mx-auto grid lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-primary mb-4">
              Real-time · 6–10 players · 15 min
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold tracking-tight text-balance leading-[1.05]">
              Find the traitors
              <br />
              <span className="text-primary">before consensus falls.</span>
            </h1>
            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl text-balance">
              A social deduction game of secret roles, hidden missions, and quiet betrayal.
              Bluff your friends, deduce the saboteurs, and survive five rounds of mistrust.
            </p>

            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-loyalist" />
                Loyalists must succeed
              </div>
              <div className="flex items-center gap-2">
                <Skull className="h-4 w-4 text-traitor" />
                Traitors must sabotage
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="panel-elevated p-6 sm:p-8"
          >
            <div className="space-y-4 mb-8">
              <div className="text-center sm:text-left">
                <h3 className="text-lg font-display font-bold">Identity</h3>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Choose how others see you</p>
              </div>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                placeholder="e.g. Mira"
                className="h-12 text-base bg-surface-1 border-border focus-visible:ring-primary"
              />
            </div>

            <Tabs defaultValue="create">
              <TabsList className="grid grid-cols-2 w-full bg-surface-1 h-11">
                <TabsTrigger value="create" className="font-display">Create room</TabsTrigger>
                <TabsTrigger value="join" className="font-display">Join room</TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="space-y-4 mt-5">
                <p className="text-sm text-muted-foreground">
                  Oda sahibi olursunuz. Oda kodunu 5-9 arkadaşınızla paylaşın ve oyunu başlatın.
                </p>
                <Button
                  onClick={create}
                  disabled={!ready || !name.trim()}
                  size="lg"
                  className="w-full h-14 text-base font-display"
                >
                  Yeni Oda Kur <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                {!name.trim() && (
                  <p className="text-[10px] text-traitor text-center uppercase tracking-widest animate-pulse">
                    Devam etmek için bir isim girmelisiniz
                  </p>
                )}
              </TabsContent>

              <TabsContent value="join" className="space-y-4 mt-5">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-xs font-mono uppercase tracking-widest">
                    Oda Kodu
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                    placeholder="A2B4F"
                    className="h-14 text-2xl code-chip text-center bg-surface-1 border-border focus-visible:ring-primary"
                  />
                </div>
                <Button
                  onClick={join}
                  disabled={!ready || !name.trim() || code.trim().length < 4}
                  size="lg"
                  className="w-full h-14 text-base font-display"
                >
                  Odaya Katıl <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                {(!name.trim() || code.trim().length < 4) && (
                  <p className="text-[10px] text-traitor text-center uppercase tracking-widest animate-pulse">
                    {!name.trim() ? "İsim girmelisiniz" : "Geçerli bir kod girmelisiniz"}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </section>

      <section id="how" className="px-6 py-16 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground mb-3">
            How a game flows
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { n: "01", t: "Discuss", d: "Talk it out. Read tells, plant doubt, and build alliances in five intense rounds." },
              { n: "02", t: "Mission", d: "The President picks a team. Members secretly Support or Sabotage. Deduce roles from the results." },
              { n: "03", t: "Spy Hunt", d: "Loyalists win by success, but Traitors get one final chance to identify the Spy and steal the win." },
            ].map((s) => (
              <div key={s.n} className="panel p-6 border-l-2 border-l-primary/40 bg-primary/5">
                <div className="text-primary font-mono text-sm font-bold tracking-tighter">{s.n}</div>
                <h3 className="font-display text-xl mt-2 font-bold">{s.t}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-muted-foreground border-t border-border/40">
        Best with friends on a voice call. Tab-only, no accounts needed.
      </footer>
    </main>
  );
}
