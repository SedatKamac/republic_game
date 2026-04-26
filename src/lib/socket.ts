// CONSENSUS — Socket abstraction.
// Connects to the real WebSocket server (game-server.mjs).
import type {
  CurrentRound,
  Faction,
  GameEndPayload,
  MissionResult,
  MyRolePayload,
  Phase,
  PublicPlayer,
  Role,
  RoomSettings,
  RoomState,
  SecretAction,
  TeamVote,
  TrustRevealPayload,
} from "./gameTypes";

type Listener = (payload: any) => void;

export interface ConsensusSocket {
  connect(playerId: string, displayName: string): void;
  disconnect(): void;
  on(event: string, fn: Listener): () => void;
  emit(event: string, payload?: any): void;
  isConnected(): boolean;
}

function isBrowser() {
  return typeof window !== "undefined";
}

// ── Real WebSocket client ────────────────────────────────────────────
class RealSocket implements ConsensusSocket {
  private listeners = new Map<string, Set<Listener>>();
  private ws: WebSocket | null = null;
  private playerId = "";
  private displayName = "";
  private connected = false;
  private pendingQueue: Array<{ event: string; payload: any }> = [];
  private authenticated = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(playerId: string, displayName: string) {
    this.playerId = playerId;
    this.displayName = displayName;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // Already connected or connecting — if already authenticated, just update name
      if (this.authenticated) return;
      return;
    }

    this.doConnect();
  }

  private doConnect() {
    if (!isBrowser()) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws`;
    console.log(`[Socket] Connecting to ${url}`);

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[Socket] Connected");
      this.connected = true;
      this.authenticated = false;

      // Authenticate
      this.wsSend("auth", { playerId: this.playerId, displayName: this.displayName });
    };

    this.ws.onmessage = (e) => {
      let msg: { event: string; payload: any };
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.event === "auth:ok") {
        console.log("[Socket] Authenticated as", msg.payload.playerId);
        this.authenticated = true;
        // Flush pending queue
        for (const queued of this.pendingQueue) {
          this.wsSend(queued.event, queued.payload);
        }
        this.pendingQueue = [];
        return;
      }

      this.fire(msg.event, msg.payload);
    };

    this.ws.onclose = () => {
      console.log("[Socket] Disconnected");
      this.connected = false;
      this.authenticated = false;
      // Auto-reconnect after 2 seconds
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      this.reconnectTimer = setTimeout(() => {
        if (this.playerId) this.doConnect();
      }, 2000);
    };

    this.ws.onerror = (err) => {
      console.error("[Socket] Error:", err);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.connected = false;
    this.authenticated = false;
    this.ws?.close();
    this.ws = null;
  }

  isConnected() {
    return this.connected && this.authenticated;
  }

  on(event: string, fn: Listener): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  emit(event: string, payload?: any) {
    if (this.authenticated && this.ws?.readyState === WebSocket.OPEN) {
      this.wsSend(event, payload);
    } else {
      // Queue until connected
      this.pendingQueue.push({ event, payload: payload ?? {} });
    }
  }

  private wsSend(event: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload: payload ?? {} }));
    }
  }

  private fire(event: string, payload?: any) {
    this.listeners.get(event)?.forEach(fn => fn(payload));
  }
}

// ── Export singleton ─────────────────────────────────────────────────
let socket: ConsensusSocket | null = null;
export function getSocket(): ConsensusSocket {
  if (!isBrowser()) {
    return {
      connect: () => {},
      disconnect: () => {},
      on: () => () => {},
      emit: () => {},
      isConnected: () => false,
    };
  }
  if (!socket) {
    socket = new RealSocket();
  }
  return socket;
}
