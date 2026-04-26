// CONSENSUS — Socket abstraction.
//
// This file exposes a tiny event-emitter API that mirrors the Socket.io contract.
// In dev/preview we use an in-memory MockSocket that simulates the full game loop
// with bot players. To wire up your real server, set VITE_SOCKET_URL and replace
// `createMockSocket` with a thin Socket.io client wrapper that emits the same
// events documented in the contract.

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
  TrustRevealPayload,
} from "./gameTypes";
import { ROLE_DISTRIBUTION, TEAM_SIZE_BY_PLAYERS, TOTAL_MISSIONS, MISSIONS_TO_WIN } from "./gameTypes";

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
  // Hidden server state — never sent to clients except via private channel
  rolesByPlayerId: Record<string, Role>;
  factionByPlayerId: Record<string, Faction>;
  currentRound: CurrentRound | null;
  missions: (MissionResult | null)[];
  secretActions: Record<string, SecretAction>; // playerId -> action this round
  votes: Record<string, string>; // voterId -> targetId
  trustReveals: Set<string>; // "fromId->toId" dedupe per round
  presidentRotationIndex: number;
  lastMissionTally: { supportCount: number; sabotageCount: number } | null;
  lastVoteResult: { eliminatedPlayerId: string | null; tallies: Record<string, number> } | null;
  loyalistWins: number;
  traitorWins: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const ROOMS = new Map<string, MockRoom>();

const BOT_NAMES = [
  "Vega", "Kai", "Nova", "Zara", "Orion", "Lyra",
  "Echo", "Mira", "Jax", "Iris", "Knox", "Pax",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  // crypto-grade if available
  const buf = new Uint32Array(a.length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 0xffffffff);
  }
  for (let i = a.length - 1; i > 0; i--) {
    const j = buf[i] % (i + 1);
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

function makeBots(count: number, hostId: string): PublicPlayer[] {
  const names = shuffle(BOT_NAMES).slice(0, count);
  return names.map((name, i) => ({
    id: `bot_${i}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    seatIndex: i + 1, // host is seat 0
    isAlive: true,
    isConnected: true,
  }));
}

function publicRoomState(room: MockRoom): RoomState {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    settings: room.settings,
    players: room.players.map((p) => ({ ...p })),
    currentRound: room.currentRound ? { ...room.currentRound, team: [...room.currentRound.team] } : null,
    missions: [...room.missions],
    lastMissionTally: room.lastMissionTally,
    lastVoteResult: room.lastVoteResult,
  };
}

class MockSocket implements ConsensusSocket {
  private listeners = new Map<string, Set<Listener>>();
  private playerId = "";
  private displayName = "";
  private roomCode: string | null = null;
  private connected = false;

  connect(playerId: string, displayName: string) {
    this.playerId = playerId;
    this.displayName = displayName;
    this.connected = true;
  }

  disconnect() {
    this.connected = false;
    this.listeners.clear();
  }

  isConnected() {
    return this.connected;
  }

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  private fire(event: string, payload?: any) {
    this.listeners.get(event)?.forEach((fn) => fn(payload));
  }

  emit(event: string, payload?: any) {
    // Simulate network latency
    setTimeout(() => this.handle(event, payload), 30);
  }

  // ---------- Server-side handlers ----------

  private handle(event: string, payload: any) {
    switch (event) {
      case "room:create": return this.handleCreate(payload);
      case "room:join": return this.handleJoin(payload);
      case "room:leave": return this.handleLeave();
      case "lobby:updateSettings": return this.handleSettings(payload);
      case "lobby:addBot": return this.handleAddBot();
      case "lobby:removeBot": return this.handleRemoveBot();
      case "game:start": return this.handleStart();
      case "team:submit": return this.handleTeamSubmit(payload);
      case "action:submit": return this.handleActionSubmit(payload);
      case "trust:reveal": return this.handleTrustReveal(payload);
      case "vote:submit": return this.handleVoteSubmit(payload);
      case "game:reset": return this.handleReset();
    }
  }

  private get room(): MockRoom | null {
    return this.roomCode ? ROOMS.get(this.roomCode) ?? null : null;
  }

  private broadcast(room: MockRoom, event: string, payload?: any) {
    // In a real server this targets the room channel; here we just notify the local socket.
    this.fire(event, payload);
    if (event === "room:state" || event === "phase:changed") {
      // also push fresh state when phase changes
    }
  }

  private pushState() {
    if (this.room) this.fire("room:state", publicRoomState(this.room));
  }

  private handleCreate(payload: { displayName: string; settings?: Partial<RoomSettings> }) {
    const code = generateRoomCode();
    const me: PublicPlayer = {
      id: this.playerId,
      name: payload.displayName || "Host",
      seatIndex: 0,
      isAlive: true,
      isConnected: true,
    };
    const room: MockRoom = {
      code,
      hostId: this.playerId,
      phase: "LOBBY",
      phaseEndsAt: null,
      settings: { discussionSeconds: payload.settings?.discussionSeconds ?? 90 },
      players: [me],
      rolesByPlayerId: {},
      factionByPlayerId: {},
      currentRound: null,
      missions: Array(TOTAL_MISSIONS).fill(null),
      secretActions: {},
      votes: {},
      trustReveals: new Set(),
      presidentRotationIndex: 0,
      lastMissionTally: null,
      lastVoteResult: null,
      loyalistWins: 0,
      traitorWins: 0,
      timer: null,
    };
    ROOMS.set(code, room);
    this.roomCode = code;
    this.pushState();
  }

  private handleJoin(payload: { code: string; displayName: string }) {
    const code = payload.code.toUpperCase().trim();
    const room = ROOMS.get(code);
    if (!room) {
      this.fire("room:error", { code: "ROOM_NOT_FOUND", message: "No room with that code." });
      return;
    }
    if (room.phase !== "LOBBY") {
      this.fire("room:error", { code: "GAME_IN_PROGRESS", message: "Game already started." });
      return;
    }
    if (room.players.length >= 10) {
      this.fire("room:error", { code: "ROOM_FULL", message: "Room is full (10 max)." });
      return;
    }
    const existingPlayer = room.players.find((p) => p.id === this.playerId);
    if (existingPlayer) {
      // Just update name if it's currently a placeholder
      if (payload.displayName && (existingPlayer.name === "Player" || existingPlayer.name === "Host" || existingPlayer.name === "")) {
        existingPlayer.name = payload.displayName;
      }
    } else {
      room.players.push({
        id: this.playerId,
        name: payload.displayName || "Player",
        seatIndex: room.players.length,
        isAlive: true,
        isConnected: true,
      });
    }
    this.roomCode = code;
    this.pushState();
  }

  private handleLeave() {
    const room = this.room;
    if (!room) return;
    room.players = room.players.filter((p) => p.id !== this.playerId);
    if (room.players.length === 0) ROOMS.delete(room.code);
    this.roomCode = null;
  }

  private handleSettings(payload: { discussionSeconds: number }) {
    const room = this.room;
    if (!room || room.hostId !== this.playerId) return;
    const s = Math.max(60, Math.min(120, Math.round(payload.discussionSeconds)));
    room.settings.discussionSeconds = s;
    this.pushState();
  }

  private handleAddBot() {
    const room = this.room;
    if (!room || room.hostId !== this.playerId || room.phase !== "LOBBY") return;
    if (room.players.length >= 10) return;
    const [bot] = makeBots(1, room.hostId);
    bot.seatIndex = room.players.length;
    room.players.push(bot);
    this.pushState();
  }

  private handleRemoveBot() {
    const room = this.room;
    if (!room || room.hostId !== this.playerId || room.phase !== "LOBBY") return;
    const lastBotIdx = [...room.players].reverse().findIndex((p) => p.id.startsWith("bot_"));
    if (lastBotIdx === -1) return;
    const idx = room.players.length - 1 - lastBotIdx;
    room.players.splice(idx, 1);
    room.players.forEach((p, i) => (p.seatIndex = i));
    this.pushState();
  }

  private handleStart() {
    const room = this.room;
    if (!room || room.hostId !== this.playerId) return;
    if (room.players.length < 6 || room.players.length > 10) {
      this.fire("room:error", { code: "BAD_PLAYER_COUNT", message: "Need 6–10 players." });
      return;
    }
    this.assignRoles(room);
    this.transition(room, "ROLE_ASSIGNMENT", 6000, () => this.startRound(room));
  }

  private assignRoles(room: MockRoom) {
    const dist = ROLE_DISTRIBUTION[room.players.length];
    const ids = shuffle(room.players.map((p) => p.id));
    const traitorIds = new Set(ids.slice(0, dist.traitors));
    // President is rotational, picked from loyalists each round; for ROLE label we pick first non-traitor
    const presidentId = ids.find((id) => !traitorIds.has(id))!;
    room.presidentRotationIndex = room.players.findIndex((p) => p.id === presidentId);

    room.players.forEach((p) => {
      if (traitorIds.has(p.id)) {
        room.rolesByPlayerId[p.id] = "TRAITOR";
        room.factionByPlayerId[p.id] = "TRAITOR";
      } else {
        room.rolesByPlayerId[p.id] = p.id === presidentId ? "PRESIDENT" : "LOYALIST";
        room.factionByPlayerId[p.id] = "LOYALIST";
      }
    });

    // Send PRIVATE role only to this socket's player
    const myRole = room.rolesByPlayerId[this.playerId];
    const myFaction = room.factionByPlayerId[this.playerId];
    if (myRole) {
      const payload: MyRolePayload = { role: myRole, faction: myFaction };
      this.fire("you:role", payload);
    }
  }

  private startRound(room: MockRoom) {
    const alive = room.players.filter((p) => p.isAlive);
    // Rotate president among alive players
    let president = room.players[room.presidentRotationIndex % room.players.length];
    while (!president.isAlive) {
      room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
      president = room.players[room.presidentRotationIndex];
    }

    const roundNo = (room.currentRound?.no ?? 0) + 1;
    room.currentRound = {
      no: roundNo,
      presidentId: president.id,
      team: [],
      missionResult: null,
    };
    room.secretActions = {};
    room.votes = {};
    room.trustReveals = new Set();
    room.lastMissionTally = null;
    room.lastVoteResult = null;

    this.transition(room, "DISCUSSION", room.settings.discussionSeconds * 1000, () => {
      this.transition(room, "TEAM_SELECTION", 30_000, () => this.autoPickTeamIfNeeded(room));
    });

    // Notify private "you are on team" later when team is selected
  }

  private autoPickTeamIfNeeded(room: MockRoom) {
    if (!room.currentRound) return;
    if (room.currentRound.team.length === 0) {
      // President didn't pick — pick random alive players including president
      const teamSize = TEAM_SIZE_BY_PLAYERS[room.players.length] ?? 3;
      const aliveIds = room.players.filter((p) => p.isAlive).map((p) => p.id);
      const picked = shuffle(aliveIds).slice(0, teamSize);
      if (!picked.includes(room.currentRound.presidentId)) {
        picked[0] = room.currentRound.presidentId;
      }
      room.currentRound.team = picked;
    }
    this.beginSecretAction(room);
  }

  private handleTeamSubmit(payload: { playerIds: string[] }) {
    const room = this.room;
    if (!room || !room.currentRound) return;
    if (room.phase !== "TEAM_SELECTION") return;
    if (room.currentRound.presidentId !== this.playerId) return;
    const teamSize = TEAM_SIZE_BY_PLAYERS[room.players.length] ?? 3;
    if (payload.playerIds.length !== teamSize) return;
    const allAlive = payload.playerIds.every((id) => room.players.find((p) => p.id === id)?.isAlive);
    if (!allAlive) return;
    room.currentRound.team = payload.playerIds;
    if (room.timer) clearTimeout(room.timer);
    this.beginSecretAction(room);
  }

  private beginSecretAction(room: MockRoom) {
    // Notify each team member privately (in mock, only "me" matters)
    if (this.room?.currentRound?.team.includes(this.playerId)) {
      this.fire("you:youAreOnTeam", { roundNo: room.currentRound!.no });
    }
    this.transition(room, "SECRET_ACTION", 25_000, () => this.resolveMission(room));

    // Bots auto-submit
    setTimeout(() => this.autoSubmitBotActions(room), 1500 + Math.random() * 4000);
  }

  private autoSubmitBotActions(room: MockRoom) {
    if (!room.currentRound || room.phase !== "SECRET_ACTION") return;
    for (const pid of room.currentRound.team) {
      if (pid === this.playerId) continue;
      if (room.secretActions[pid]) continue;
      const isTraitor = room.factionByPlayerId[pid] === "TRAITOR";
      // Traitors sabotage ~70% of the time, loyalists always support
      const action: SecretAction = isTraitor && Math.random() < 0.7 ? "SABOTAGE" : "SUPPORT";
      room.secretActions[pid] = action;
    }
    if (this.allTeamActed(room)) {
      if (room.timer) clearTimeout(room.timer);
      this.resolveMission(room);
    }
  }

  private allTeamActed(room: MockRoom): boolean {
    if (!room.currentRound) return false;
    return room.currentRound.team.every((id) => room.secretActions[id]);
  }

  private handleActionSubmit(payload: { action: SecretAction }) {
    const room = this.room;
    if (!room || !room.currentRound) return;
    if (room.phase !== "SECRET_ACTION") return;
    if (!room.currentRound.team.includes(this.playerId)) return;
    if (room.secretActions[this.playerId]) return; // dedupe
    // Loyalists cannot sabotage — server-side guard
    if (room.factionByPlayerId[this.playerId] === "LOYALIST" && payload.action === "SABOTAGE") {
      room.secretActions[this.playerId] = "SUPPORT";
    } else {
      room.secretActions[this.playerId] = payload.action;
    }
    if (this.allTeamActed(room)) {
      if (room.timer) clearTimeout(room.timer);
      this.resolveMission(room);
    }
  }

  private resolveMission(room: MockRoom) {
    if (!room.currentRound) return;
    let support = 0;
    let sabotage = 0;
    for (const id of room.currentRound.team) {
      const a = room.secretActions[id] ?? "SUPPORT";
      if (a === "SUPPORT") support++;
      else sabotage++;
    }
    const result: MissionResult = sabotage >= 1 ? "SABOTAGE" : "SUCCESS";
    room.currentRound.missionResult = result;
    room.lastMissionTally = { supportCount: support, sabotageCount: sabotage };
    const slot = room.missions.findIndex((m) => m === null);
    if (slot >= 0) room.missions[slot] = result;
    if (result === "SUCCESS") room.loyalistWins++;
    else room.traitorWins++;

    this.fire("mission:result", { result, supportCount: support, sabotageCount: sabotage });

    this.transition(room, "RESULT_REVEAL", 5000, () => {
      // Trust Reveal phase only after a SUCCESS, otherwise skip
      if (result === "SUCCESS") {
        this.transition(room, "TRUST_REVEAL", 15_000, () => this.beginVoting(room));
      } else {
        this.beginVoting(room);
      }
    });
  }

  private handleTrustReveal(payload: { targetPlayerId: string }) {
    const room = this.room;
    if (!room) return;
    if (room.phase !== "TRUST_REVEAL") return;
    if (room.factionByPlayerId[this.playerId] !== "LOYALIST") return;
    const target = room.players.find((p) => p.id === payload.targetPlayerId);
    if (!target || !target.isAlive) return;
    const key = `${this.playerId}->${target.id}`;
    if (room.trustReveals.has(key)) return;
    room.trustReveals.add(key);
    // In a real server, this is a private emit to target ONLY.
    // In mock, only fire if target is the local player.
    if (target.id === this.playerId) {
      const me = room.players.find((p) => p.id === this.playerId)!;
      const tp: TrustRevealPayload = {
        fromPlayerId: this.playerId,
        fromName: me.name,
        role: room.rolesByPlayerId[this.playerId],
      };
      this.fire("you:trustRevealed", tp);
    }
  }

  private beginVoting(room: MockRoom) {
    room.votes = {};
    this.transition(room, "VOTING", 25_000, () => this.resolveVoting(room));
    setTimeout(() => this.autoSubmitBotVotes(room), 2000 + Math.random() * 5000);
  }

  private autoSubmitBotVotes(room: MockRoom) {
    if (room.phase !== "VOTING") return;
    const aliveIds = room.players.filter((p) => p.isAlive).map((p) => p.id);
    for (const pid of aliveIds) {
      if (pid === this.playerId) continue;
      if (room.votes[pid]) continue;
      // Bots vote: traitors vote for loyalists, loyalists vote randomly among non-self
      const candidates = aliveIds.filter((id) => id !== pid);
      const isTraitor = room.factionByPlayerId[pid] === "TRAITOR";
      const pool = isTraitor
        ? candidates.filter((id) => room.factionByPlayerId[id] === "LOYALIST")
        : candidates;
      room.votes[pid] = rand(pool.length ? pool : candidates);
    }
    if (this.allAliveVoted(room)) {
      if (room.timer) clearTimeout(room.timer);
      this.resolveVoting(room);
    }
  }

  private allAliveVoted(room: MockRoom) {
    return room.players.filter((p) => p.isAlive).every((p) => room.votes[p.id]);
  }

  private handleVoteSubmit(payload: { targetPlayerId: string }) {
    const room = this.room;
    if (!room) return;
    if (room.phase !== "VOTING") return;
    const me = room.players.find((p) => p.id === this.playerId);
    if (!me?.isAlive) return;
    if (room.votes[this.playerId]) return;
    const target = room.players.find((p) => p.id === payload.targetPlayerId);
    if (!target?.isAlive) return;
    room.votes[this.playerId] = target.id;
    if (this.allAliveVoted(room)) {
      if (room.timer) clearTimeout(room.timer);
      this.resolveVoting(room);
    }
  }

  private resolveVoting(room: MockRoom) {
    const tallies: Record<string, number> = {};
    for (const target of Object.values(room.votes)) {
      tallies[target] = (tallies[target] ?? 0) + 1;
    }
    let max = 0;
    let eliminated: string | null = null;
    let tie = false;
    for (const [id, count] of Object.entries(tallies)) {
      if (count > max) { max = count; eliminated = id; tie = false; }
      else if (count === max) { tie = true; }
    }
    if (tie) eliminated = null; // no elimination on tie
    if (eliminated) {
      const p = room.players.find((pp) => pp.id === eliminated);
      if (p) p.isAlive = false;
    }
    room.lastVoteResult = { eliminatedPlayerId: eliminated, tallies };
    this.fire("vote:result", room.lastVoteResult);

    this.transition(room, "WIN_CHECK", 4000, () => this.checkWin(room));
  }

  private checkWin(room: MockRoom) {
    const aliveTraitors = room.players.filter(
      (p) => p.isAlive && room.factionByPlayerId[p.id] === "TRAITOR",
    ).length;

    let winner: Faction | null = null;
    if (aliveTraitors === 0) winner = "LOYALIST";
    else if (room.loyalistWins >= MISSIONS_TO_WIN) winner = "LOYALIST";
    else if (room.traitorWins >= MISSIONS_TO_WIN) winner = "TRAITOR";
    else if (room.missions.every((m) => m !== null)) {
      winner = room.loyalistWins > room.traitorWins ? "LOYALIST" : "TRAITOR";
    }

    if (winner) {
      const payload: GameEndPayload = { winner, roles: { ...room.rolesByPlayerId } };
      this.transition(room, "GAME_END", 60_000, () => {});
      this.fire("game:ended", payload);
      return;
    }

    // Rotate president, next round
    do {
      room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
    } while (!room.players[room.presidentRotationIndex].isAlive);

    this.startRound(room);
  }

  private handleReset() {
    const room = this.room;
    if (!room || room.hostId !== this.playerId) return;
    room.phase = "LOBBY";
    room.phaseEndsAt = null;
    room.rolesByPlayerId = {};
    room.factionByPlayerId = {};
    room.currentRound = null;
    room.missions = Array(TOTAL_MISSIONS).fill(null);
    room.secretActions = {};
    room.votes = {};
    room.trustReveals = new Set();
    room.lastMissionTally = null;
    room.lastVoteResult = null;
    room.loyalistWins = 0;
    room.traitorWins = 0;
    room.players.forEach((p) => (p.isAlive = true));
    if (room.timer) { clearTimeout(room.timer); room.timer = null; }
    this.pushState();
  }

  private transition(
    room: MockRoom,
    phase: Phase,
    durationMs: number,
    onEnd: () => void,
  ) {
    if (room.timer) clearTimeout(room.timer);
    room.phase = phase;
    room.phaseEndsAt = Date.now() + durationMs;
    this.fire("phase:changed", { phase, phaseEndsAt: room.phaseEndsAt });
    this.pushState();
    room.timer = setTimeout(() => {
      room.timer = null;
      onEnd();
    }, durationMs);
  }
}

// ---------- Singleton ----------

let socket: ConsensusSocket | null = null;

export function getSocket(): ConsensusSocket {
  if (!socket) {
    // To use a real server instead, replace this with a Socket.io adapter
    // that targets `import.meta.env.VITE_SOCKET_URL` and emits the same events.
    socket = new MockSocket();
  }
  return socket;
}
