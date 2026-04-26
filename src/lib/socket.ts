// CONSENSUS — Socket abstraction.
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
import { ROLE_DISTRIBUTION, TEAM_SIZES, TOTAL_MISSIONS, MISSIONS_TO_WIN } from "./gameTypes";

type Listener = (payload: any) => void;

export interface ConsensusSocket {
  connect(playerId: string, displayName: string): void;
  disconnect(): void;
  on(event: string, fn: Listener): () => void;
  emit(event: string, payload?: any): void;
  isConnected(): boolean;
}

// ---------- Mock implementation ----------

interface MockRoom {
  code: string;
  hostId: string;
  phase: Phase;
  phaseEndsAt: number | null;
  settings: RoomSettings;
  players: PublicPlayer[];
  rolesByPlayerId: Record<string, Role>;
  factionByPlayerId: Record<string, Faction>;
  currentRound: CurrentRound | null;
  missions: (MissionResult | null)[];
  secretActions: Record<string, SecretAction>;
  teamVotes: Record<string, TeamVote>;
  trustReveals: Set<string>;
  presidentRotationIndex: number;
  lastTeamVote: { tallies: Record<string, TeamVote>; approved: boolean } | null;
  lastMissionTally: { supportCount: number; sabotageCount: number } | null;
  loyalistWins: number;
  traitorWins: number;
  timer: ReturnType<typeof setTimeout> | null;
  onTimerEnd: (() => void) | null;
}

function isBrowser() {
  return typeof window !== "undefined";
}

const ROOMS = new Map<string, MockRoom>();
const ROOMS_KEY = "consensus_mock_rooms";
const SYNC_CHANNEL = isBrowser() ? new BroadcastChannel("consensus_sync") : null;

if (SYNC_CHANNEL) {
  SYNC_CHANNEL.onmessage = (e) => {
    if (e.data === "sync") loadRooms();
  };
}

function saveRooms() {
  if (!isBrowser()) return;
  const roomsObj = Object.fromEntries(
    Array.from(ROOMS.entries()).map(([code, room]) => [
      code,
      { ...room, trustReveals: Array.from(room.trustReveals), timer: null, onTimerEnd: null }
    ])
  );
  localStorage.setItem(ROOMS_KEY, JSON.stringify(roomsObj));
  SYNC_CHANNEL?.postMessage("sync");
}

function loadRooms() {
  if (!isBrowser()) return;
  const stored = localStorage.getItem(ROOMS_KEY);
  if (stored) {
    try {
      const roomsObj = JSON.parse(stored);
      ROOMS.clear(); // Clear to ensure full sync
      Object.entries(roomsObj).forEach(([code, room]: [string, any]) => {
        ROOMS.set(code, { ...room, trustReveals: new Set(room.trustReveals), timer: null, onTimerEnd: null });
      });
    } catch (e) {}
  }
}

const BOT_NAMES = ["Vega", "Kai", "Nova", "Zara", "Orion", "Lyra", "Echo", "Mira", "Jax", "Iris"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return ROOMS.has(code) ? generateRoomCode() : code;
}

function publicRoomState(room: MockRoom): RoomState {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    settings: room.settings,
    players: room.players.map(p => ({ ...p })),
    currentRound: room.currentRound ? { ...room.currentRound, team: [...room.currentRound.team] } : null,
    missions: [...room.missions],
    lastTeamVote: room.lastTeamVote,
    lastMissionTally: room.lastMissionTally,
    votedPlayerIds: room.phase === "TEAM_VOTING" ? Object.keys(room.teamVotes) : 
                    room.phase === "SECRET_ACTION" ? Object.keys(room.secretActions) : 
                    room.phase === "SPY_HUNT" ? [] : [], // Add more if needed
  };
}

class MockSocket implements ConsensusSocket {
  private listeners = new Map<string, Set<Listener>>();
  private playerId = "";
  private displayName = "";
  private roomCode: string | null = null;
  private connected = false;
  private phaseLock: string | null = null;

  connect(playerId: string, displayName: string) {
    this.playerId = playerId;
    this.displayName = displayName;
    this.connected = true;
  }
  disconnect() { this.connected = false; this.listeners.clear(); }
  isConnected() { return this.connected; }
  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }
  private fire(event: string, payload?: any) {
    // console.log(`[Socket] Fire ${event}`, payload);
    this.listeners.get(event)?.forEach(fn => fn(payload));
  }
  emit(event: string, payload?: any) {
    setTimeout(() => this.handle(event, payload), 30);
  }

  private handle(event: string, payload: any) {
    const room = this.room;
    switch (event) {
      case "room:create": return this.handleCreate(payload);
      case "room:join": return this.handleJoin(payload);
      case "room:leave": return this.handleLeave();
      case "lobby:updateSettings": return this.handleSettings(payload);
      case "lobby:addBot": return this.handleAddBot();
      case "lobby:removeBot": return this.handleRemoveBot();
      case "game:start": return this.handleStart();
      case "team:submit": return this.handleTeamSubmit(payload);
      case "team:vote": return this.handleTeamVoteSubmit(payload);
      case "action:submit": return this.handleActionSubmit(payload);
      case "game:reset": return this.handleReset();
      case "game:skipPhase": return this.handleSkipPhase();
      case "game:spyHunt": return this.handleSpyHuntSubmit(payload);
    }
  }

  private get room(): MockRoom | null {
    return this.roomCode ? ROOMS.get(this.roomCode) ?? null : null;
  }

  private pushState() {
    if (this.room) {
      const state = publicRoomState(this.room);
      setTimeout(() => this.fire("room:state", state), 0);
    }
  }

  private transition(room: MockRoom, phase: Phase, durationMs: number, onEnd: () => void) {
    if (room.timer) clearTimeout(room.timer);
    room.phase = phase;
    room.phaseEndsAt = Date.now() + durationMs;
    room.onTimerEnd = onEnd;
    this.phaseLock = null;
    this.pushState();
    room.timer = setTimeout(() => { room.timer = null; onEnd(); }, durationMs);
  }

  private handleCreate(payload: { displayName: string }) {
    const code = generateRoomCode();
    const room: MockRoom = {
      code, hostId: this.playerId, phase: "LOBBY", phaseEndsAt: null,
      settings: { discussionSeconds: 90 },
      players: [{ id: this.playerId, name: payload.displayName || "Host", seatIndex: 0, isConnected: true, missionHistory: [] }],
      rolesByPlayerId: {}, factionByPlayerId: {}, currentRound: null,
      missions: Array(TOTAL_MISSIONS).fill(null), secretActions: {}, teamVotes: {}, trustReveals: new Set(),
      presidentRotationIndex: 0, lastTeamVote: null, lastMissionTally: null,
      loyalistWins: 0, traitorWins: 0, timer: null, onTimerEnd: null,
    };
    ROOMS.set(code, room);
    saveRooms();
    this.roomCode = code;
    this.pushState();
  }

  private handleJoin(payload: { code: string; displayName: string }) {
    const code = payload.code.toUpperCase().trim();
    loadRooms(); // Ensure we have latest rooms from other tabs
    const room = ROOMS.get(code);
    if (!room) {
      this.fire("room:error", { code: "NOT_FOUND", message: "Oda bulunamadı. Lütfen kodu kontrol edin." });
      return;
    }

    const existingPlayer = room.players.find(p => p.id === this.playerId);
    if (existingPlayer) {
      existingPlayer.isConnected = true;
      this.roomCode = code;
      this.pushState();
      return;
    }

    if (room.phase !== "LOBBY") {
      this.fire("room:error", { code: "IN_PROGRESS", message: "Oyun zaten başladı. Yeni oyuncu katılamaz." });
      return;
    }
    
    if (room.players.length >= 10) {
      this.fire("room:error", { code: "FULL", message: "Oda dolu (Maksimum 10 oyuncu)." });
      return;
    }

    room.players.push({ id: this.playerId, name: payload.displayName || "Player", seatIndex: room.players.length, isConnected: true, missionHistory: [] });
    saveRooms();
    this.roomCode = code;
    this.pushState();
  }

  private handleLeave() {
    const room = this.room;
    if (room) {
      room.players = room.players.filter(p => p.id !== this.playerId);
      if (room.players.length === 0) ROOMS.delete(room.code);
    }
    this.roomCode = null;
    this.pushState();
  }

  private handleSettings(payload: { discussionSeconds: number }) {
    const room = this.room;
    if (room && room.hostId === this.playerId) {
      room.settings.discussionSeconds = payload.discussionSeconds;
      this.pushState();
    }
  }

  private handleAddBot() {
    const room = this.room;
    if (room && room.hostId === this.playerId && room.players.length < 10) {
      const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
      room.players.push({ id: `bot_${Math.random()}`, name, seatIndex: room.players.length, isConnected: true, missionHistory: [] });
      this.pushState();
    }
  }

  private handleRemoveBot() {
    const room = this.room;
    if (room && room.hostId === this.playerId) {
      const idx = room.players.findIndex(p => p.id.startsWith("bot_"));
      if (idx !== -1) room.players.splice(idx, 1);
      this.pushState();
    }
  }

  private handleStart() {
    const room = this.room;
    if (!room || room.hostId !== this.playerId || room.players.length < 6) return;
    this.assignRoles(room);
    this.pushState();
    setTimeout(() => this.transition(room, "ROLE_ASSIGNMENT", 12000, () => this.startRound(room)), 100);
  }

  private assignRoles(room: MockRoom) {
    const dist = ROLE_DISTRIBUTION[room.players.length];
    const ids = shuffle(room.players.map(p => p.id));
    const traitorIds = new Set(ids.slice(0, dist.traitors));
    const spyId = ids.slice(dist.traitors, dist.traitors + dist.spies)[0];
    room.presidentRotationIndex = Math.floor(Math.random() * room.players.length);
    room.players.forEach(p => {
      const isSpy = p.id === spyId;
      const isTraitor = traitorIds.has(p.id);
      room.rolesByPlayerId[p.id] = isSpy ? "SPY" : isTraitor ? "TRAITOR" : "LOYALIST";
      room.factionByPlayerId[p.id] = isTraitor ? "TRAITOR" : "LOYALIST";
      if (p.id === this.playerId) {
        this.fire("you:role", { role: room.rolesByPlayerId[p.id], faction: room.factionByPlayerId[p.id], knownRoles: isSpy ? { ...room.rolesByPlayerId } : undefined });
      }
    });
  }

  private startRound(room: MockRoom) {
    room.currentRound = { no: (room.currentRound?.no || 0) + 1, presidentId: room.players[room.presidentRotationIndex].id, team: [], missionResult: null };
    room.secretActions = {}; room.teamVotes = {};
    this.transition(room, "DISCUSSION", room.settings.discussionSeconds * 1000, () => this.beginTeamSelection(room));
  }

  private beginTeamSelection(room: MockRoom) {
    if (!room || room.phase === "TEAM_SELECTION") return;
    this.transition(room, "TEAM_SELECTION", 60000, () => this.autoPickTeamIfNeeded(room));
  }

  private autoPickTeamIfNeeded(room: MockRoom) {
    if (room.phase !== "DISCUSSION") return;
    const teamSize = TEAM_SIZES[room.players.length][room.currentRound!.no - 1];
    room.currentRound!.team = shuffle(room.players.map(p => p.id)).slice(0, teamSize);
    this.beginTeamVoting(room);
  }

  private handleTeamSubmit(payload: { playerIds: string[] }) {
    const room = this.room;
    if (!room || (room.phase !== "TEAM_SELECTION" && room.phase !== "DISCUSSION")) return;
    if (room.currentRound?.presidentId !== this.playerId) return;
    
    room.currentRound!.team = payload.playerIds;
    this.beginTeamVoting(room);
  }

  private beginTeamVoting(room: MockRoom) {
    this.transition(room, "TEAM_VOTING", 30000, () => this.resolveTeamVote(room));
    setTimeout(() => this.autoSubmitBotTeamVotes(room), 2000);
  }

  private autoSubmitBotTeamVotes(room: MockRoom) {
    if (room.phase !== "TEAM_VOTING") return;
    room.players.forEach(p => { if (p.id !== this.playerId) room.teamVotes[p.id] = Math.random() > 0.4 ? "APPROVE" : "REJECT"; });
    if (Object.keys(room.teamVotes).length === room.players.length) this.resolveTeamVote(room);
  }

  private handleTeamVoteSubmit(payload: { vote: TeamVote }) {
    const room = this.room;
    if (room?.phase === "TEAM_VOTING") {
      room.teamVotes[this.playerId] = payload.vote;
      this.pushState();
      if (Object.keys(room.teamVotes).length === room.players.length) this.resolveTeamVote(room);
    }
  }

  private resolveTeamVote(room: MockRoom) {
    if (this.phaseLock === "TEAM_VOTING") return;
    this.phaseLock = "TEAM_VOTING";
    let approves = 0, rejects = 0;
    Object.values(room.teamVotes).forEach(v => {
      if (v === "APPROVE" || v === "DOUBLE_APPROVE") approves += (v === "APPROVE" ? 1 : 2);
      else rejects += (v === "REJECT" ? 1 : 2);
    });
    const approved = approves > rejects;
    room.lastTeamVote = { tallies: { ...room.teamVotes }, approved };
    if (approved) {
      this.transition(room, "SECRET_ACTION", 30000, () => this.resolveMission(room));
      setTimeout(() => this.autoSubmitBotActions(room), 2000);
    } else {
      room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
      this.transition(room, "TEAM_SELECTION", 4000, () => {
        if (room.players[room.presidentRotationIndex].id.startsWith("bot_")) this.autoPickTeamIfNeeded(room);
      });
    }
  }

  private autoSubmitBotActions(room: MockRoom) {
    if (room.phase !== "SECRET_ACTION") return;
    room.currentRound!.team.forEach(pid => {
      if (pid !== this.playerId) room.secretActions[pid] = (room.factionByPlayerId[pid] === "TRAITOR" && Math.random() > 0.5) ? "SABOTAGE" : "SUPPORT";
    });
    if (Object.keys(room.secretActions).length === room.currentRound!.team.length) this.resolveMission(room);
  }

  private handleActionSubmit(payload: { action: SecretAction }) {
    const room = this.room;
    if (room?.phase === "SECRET_ACTION") {
      room.secretActions[this.playerId] = payload.action;
      this.pushState();
      if (Object.keys(room.secretActions).length === room.currentRound!.team.length) this.resolveMission(room);
    }
  }

  private resolveMission(room: MockRoom) {
    if (this.phaseLock === "SECRET_ACTION") return;
    this.phaseLock = "SECRET_ACTION";
    const actions = Object.values(room.secretActions);
    const sabotages = actions.filter(a => a === "SABOTAGE").length;
    const success = sabotages === 0;
    if (success) room.loyalistWins++; else room.traitorWins++;
    room.missions[room.currentRound!.no - 1] = success ? "SUCCESS" : "SABOTAGE";
    room.lastMissionTally = { supportCount: actions.length - sabotages, sabotageCount: sabotages };
    room.currentRound!.team.forEach(pid => {
      const p = room.players.find(pp => pp.id === pid);
      if (p) p.missionHistory.push({ roundNo: room.currentRound!.no, result: success ? "SUCCESS" : "SABOTAGE" });
    });
    this.transition(room, "RESULT_REVEAL", 5000, () => this.checkWin(room));
  }

  private checkWin(room: MockRoom) {
    let winner: Faction | null = null;
    if (room.traitorWins >= MISSIONS_TO_WIN) winner = "TRAITOR";
    else if (room.loyalistWins >= MISSIONS_TO_WIN) {
      this.transition(room, "SPY_HUNT", 60000, () => {
        this.transition(room, "GAME_END", 0, () => {});
        this.fire("game:ended", { winner: "LOYALIST", roles: { ...room.rolesByPlayerId } });
      });
      return;
    } else if (room.missions.every(m => m !== null)) {
      winner = room.loyalistWins > room.traitorWins ? "LOYALIST" : "TRAITOR";
    }

    if (winner) {
      this.transition(room, "GAME_END", 0, () => {});
      this.fire("game:ended", { winner, roles: { ...room.rolesByPlayerId } });
    } else {
      room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
      this.startRound(room);
    }
  }

  private handleReset() {
    const room = this.room;
    if (room && room.hostId === this.playerId) {
      room.phase = "LOBBY"; room.loyalistWins = 0; room.traitorWins = 0;
      room.missions = Array(TOTAL_MISSIONS).fill(null);
      room.players.forEach(p => p.missionHistory = []);
      this.pushState();
    }
  }

  private handleSkipPhase() {
    const room = this.room;
    if (room && room.hostId === this.playerId && room.timer && room.onTimerEnd) {
      clearTimeout(room.timer); room.timer = null;
      const cb = room.onTimerEnd; room.onTimerEnd = null;
      cb();
    }
  }

  private handleSpyHuntSubmit(payload: { targetPlayerId: string }) {
    const room = this.room;
    if (room?.phase === "SPY_HUNT") {
      const winner: Faction = room.rolesByPlayerId[payload.targetPlayerId] === "SPY" ? "TRAITOR" : "LOYALIST";
      this.transition(room, "GAME_END", 0, () => {});
      this.fire("game:ended", { winner, roles: { ...room.rolesByPlayerId } });
    }
  }
}

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
    loadRooms();
    socket = new MockSocket();
  }
  return socket;
}
