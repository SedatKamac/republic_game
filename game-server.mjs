// CONSENSUS — Server-side game engine (runs inside server.mjs)
// This file exports an `attachGameServer(server)` function that upgrades
// an existing HTTP server with WebSocket support.

import { WebSocketServer } from 'ws';

// ── Constants ────────────────────────────────────────────────────────
const TOTAL_MISSIONS = 5;
const MISSIONS_TO_WIN = 3;

const ROLE_DISTRIBUTION = {
  6:  { traitors: 2, spies: 1 },
  7:  { traitors: 2, spies: 1 },
  8:  { traitors: 3, spies: 1 },
  9:  { traitors: 3, spies: 1 },
  10: { traitors: 4, spies: 1 },
};

const TEAM_SIZES = {
  6:  [2, 3, 4, 3, 4],
  7:  [2, 3, 3, 4, 4],
  8:  [3, 4, 4, 5, 5],
  9:  [3, 4, 4, 5, 5],
  10: [3, 4, 4, 5, 5],
};

// ── Helpers ──────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateRoomCode(rooms) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(code) ? generateRoomCode(rooms) : code;
}

const BOT_NAMES = ['Vega', 'Kai', 'Nova', 'Zara', 'Orion', 'Lyra', 'Echo', 'Mira', 'Jax', 'Iris'];

// ── Room / Player state ──────────────────────────────────────────────
/** @type {Map<string, object>} code → room */
const ROOMS = new Map();
/** @type {Map<object, {playerId:string, ws:object, roomCode:string|null}>} ws → client info */
const CLIENTS = new Map();

function publicRoomState(room) {
  return {
    code: room.code,
    hostId: room.hostId,
    phase: room.phase,
    phaseEndsAt: room.phaseEndsAt,
    settings: room.settings,
    players: room.players.map(p => ({ ...p })),
    currentRound: room.currentRound
      ? { ...room.currentRound, team: [...room.currentRound.team] }
      : null,
    missions: [...room.missions],
    lastTeamVote: room.lastTeamVote,
    lastMissionTally: room.lastMissionTally,
    votedPlayerIds:
      room.phase === 'TEAM_VOTING' ? Object.keys(room.teamVotes) :
      room.phase === 'SECRET_ACTION' ? Object.keys(room.secretActions) : [],
  };
}

function broadcastRoom(room) {
  const state = publicRoomState(room);
  for (const [ws, client] of CLIENTS.entries()) {
    if (client.roomCode === room.code && ws.readyState === 1) {
      send(ws, 'room:state', state);
    }
  }
}

function send(ws, event, payload) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ event, payload }));
  }
}

function sendToPlayer(room, playerId, event, payload) {
  for (const [ws, client] of CLIENTS.entries()) {
    if (client.roomCode === room.code && client.playerId === playerId && ws.readyState === 1) {
      send(ws, event, payload);
    }
  }
}

// ── Room lifecycle ───────────────────────────────────────────────────
function transition(room, phase, durationMs, onEnd) {
  if (room.timer) clearTimeout(room.timer);
  room.phase = phase;
  room.phaseEndsAt = Date.now() + durationMs;
  room.onTimerEnd = onEnd;
  room.phaseLock = null;
  broadcastRoom(room);
  if (durationMs > 0) {
    room.timer = setTimeout(() => { room.timer = null; onEnd(); }, durationMs);
  }
}

function assignRoles(room) {
  const dist = ROLE_DISTRIBUTION[room.players.length];
  if (!dist) return;
  const ids = shuffle(room.players.map(p => p.id));
  const traitorIds = new Set(ids.slice(0, dist.traitors));
  const spyId = ids[dist.traitors]; // first after traitors
  room.presidentRotationIndex = Math.floor(Math.random() * room.players.length);
  room.players.forEach(p => {
    const isSpy = p.id === spyId;
    const isTraitor = traitorIds.has(p.id);
    room.rolesByPlayerId[p.id] = isSpy ? 'SPY' : isTraitor ? 'TRAITOR' : 'LOYALIST';
    room.factionByPlayerId[p.id] = isTraitor ? 'TRAITOR' : 'LOYALIST';
    // Send each player their own private role info
    sendToPlayer(room, p.id, 'you:role', {
      role: room.rolesByPlayerId[p.id],
      faction: room.factionByPlayerId[p.id],
      knownRoles: isSpy ? { ...room.rolesByPlayerId } : undefined,
    });
  });
}

function startRound(room) {
  room.currentRound = {
    no: (room.currentRound?.no || 0) + 1,
    presidentId: room.players[room.presidentRotationIndex].id,
    team: [],
    missionResult: null,
  };
  room.secretActions = {};
  room.teamVotes = {};
  transition(room, 'DISCUSSION', room.settings.discussionSeconds * 1000, () => beginTeamSelection(room));
}

function beginTeamSelection(room) {
  if (!room || room.phase === 'TEAM_SELECTION') return;
  transition(room, 'TEAM_SELECTION', 60000, () => autoPickTeam(room));
}

function autoPickTeam(room) {
  if (room.phase !== 'TEAM_SELECTION') return;
  const teamSize = TEAM_SIZES[room.players.length]?.[room.currentRound.no - 1] ?? 3;
  room.currentRound.team = shuffle(room.players.map(p => p.id)).slice(0, teamSize);
  beginTeamVoting(room);
}

function beginTeamVoting(room) {
  transition(room, 'TEAM_VOTING', 30000, () => resolveTeamVote(room));
  // Auto-vote for bots
  setTimeout(() => {
    if (room.phase !== 'TEAM_VOTING') return;
    room.players.forEach(p => {
      if (p.id.startsWith('bot_') && !room.teamVotes[p.id]) {
        room.teamVotes[p.id] = Math.random() > 0.4 ? 'APPROVE' : 'REJECT';
      }
    });
    broadcastRoom(room);
    if (Object.keys(room.teamVotes).length === room.players.length) resolveTeamVote(room);
  }, 2000);
}

function resolveTeamVote(room) {
  if (room.phaseLock === 'TEAM_VOTING') return;
  room.phaseLock = 'TEAM_VOTING';
  let approves = 0, rejects = 0;
  Object.values(room.teamVotes).forEach(v => {
    if (v === 'APPROVE' || v === 'DOUBLE_APPROVE') approves += v === 'APPROVE' ? 1 : 2;
    else rejects += v === 'REJECT' ? 1 : 2;
  });
  const approved = approves > rejects;
  room.lastTeamVote = { tallies: { ...room.teamVotes }, approved };
  room.teamVotes = {}; // Clear votes for next time

  if (approved) {
    transition(room, 'SECRET_ACTION', 30000, () => resolveMission(room));
    // Bot auto-actions
    setTimeout(() => {
      if (room.phase !== 'SECRET_ACTION') return;
      room.currentRound.team.forEach(pid => {
        if (pid.startsWith('bot_') && !room.secretActions[pid]) {
          room.secretActions[pid] = (room.factionByPlayerId[pid] === 'TRAITOR' && Math.random() > 0.5) ? 'SABOTAGE' : 'SUPPORT';
        }
      });
      broadcastRoom(room);
      if (Object.keys(room.secretActions).length === room.currentRound.team.length) resolveMission(room);
    }, 2000);
  } else {
    room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
    room.currentRound.team = [];
    transition(room, 'TEAM_SELECTION', 4000, () => {
      if (room.players[room.presidentRotationIndex].id.startsWith('bot_')) autoPickTeam(room);
    });
  }
}

function resolveMission(room) {
  if (room.phaseLock === 'SECRET_ACTION') return;
  room.phaseLock = 'SECRET_ACTION';
  const actions = Object.values(room.secretActions);
  const sabotages = actions.filter(a => a === 'SABOTAGE').length;
  const success = sabotages === 0;
  if (success) room.loyalistWins++; else room.traitorWins++;
  room.currentRound.missionResult = success ? 'SUCCESS' : 'SABOTAGE';
  room.missions[room.currentRound.no - 1] = success ? 'SUCCESS' : 'SABOTAGE';
  room.lastMissionTally = { supportCount: actions.length - sabotages, sabotageCount: sabotages };
  room.currentRound.team.forEach(pid => {
    const p = room.players.find(pp => pp.id === pid);
    if (p) p.missionHistory.push({ roundNo: room.currentRound.no, result: success ? 'SUCCESS' : 'SABOTAGE' });
  });
  transition(room, 'RESULT_REVEAL', 5000, () => checkWin(room));
}

function checkWin(room) {
  let winner = null;
  if (room.traitorWins >= MISSIONS_TO_WIN) {
    winner = 'TRAITOR';
  } else if (room.loyalistWins >= MISSIONS_TO_WIN) {
    transition(room, 'SPY_HUNT', 60000, () => {
      transition(room, 'GAME_END', 0, () => {});
      broadcastToRoom(room, 'game:ended', { winner: 'LOYALIST', roles: { ...room.rolesByPlayerId } });
    });
    return;
  } else if (room.missions.every(m => m !== null)) {
    winner = room.loyalistWins > room.traitorWins ? 'LOYALIST' : 'TRAITOR';
  }
  if (winner) {
    transition(room, 'GAME_END', 0, () => {});
    broadcastToRoom(room, 'game:ended', { winner, roles: { ...room.rolesByPlayerId } });
  } else {
    room.presidentRotationIndex = (room.presidentRotationIndex + 1) % room.players.length;
    startRound(room);
  }
}

function broadcastToRoom(room, event, payload) {
  for (const [ws, client] of CLIENTS.entries()) {
    if (client.roomCode === room.code && ws.readyState === 1) {
      send(ws, event, payload);
    }
  }
}

// ── Event handlers ───────────────────────────────────────────────────
function handleCreate(ws, client, payload) {
  const code = generateRoomCode(ROOMS);
  const room = {
    code,
    hostId: client.playerId,
    phase: 'LOBBY',
    phaseEndsAt: null,
    settings: { discussionSeconds: payload?.settings?.discussionSeconds || 90 },
    players: [{ id: client.playerId, name: payload.displayName || 'Host', seatIndex: 0, isConnected: true, missionHistory: [] }],
    rolesByPlayerId: {},
    factionByPlayerId: {},
    currentRound: null,
    missions: Array(TOTAL_MISSIONS).fill(null),
    secretActions: {},
    teamVotes: {},
    trustReveals: new Set(),
    presidentRotationIndex: 0,
    lastTeamVote: null,
    lastMissionTally: null,
    loyalistWins: 0,
    traitorWins: 0,
    timer: null,
    onTimerEnd: null,
    phaseLock: null,
  };
  ROOMS.set(code, room);
  client.roomCode = code;
  console.log(`[Game] Room ${code} created by ${client.playerId}`);
  broadcastRoom(room);
}

function handleJoin(ws, client, payload) {
  const code = (payload.code || '').toUpperCase().trim();
  const room = ROOMS.get(code);
  if (!room) {
    send(ws, 'room:error', { code: 'NOT_FOUND', message: 'Oda bulunamadı. Lütfen kodu kontrol edin.' });
    return;
  }
  // Rejoin
  const existing = room.players.find(p => p.id === client.playerId);
  if (existing) {
    existing.isConnected = true;
    client.roomCode = code;
    broadcastRoom(room);
    // Re-send role if game is running
    if (room.rolesByPlayerId[client.playerId]) {
      const role = room.rolesByPlayerId[client.playerId];
      const faction = room.factionByPlayerId[client.playerId];
      send(ws, 'you:role', { role, faction, knownRoles: role === 'SPY' ? { ...room.rolesByPlayerId } : undefined });
    }
    return;
  }
  if (room.phase !== 'LOBBY') {
    send(ws, 'room:error', { code: 'IN_PROGRESS', message: 'Oyun zaten başladı. Yeni oyuncu katılamaz.' });
    return;
  }
  if (room.players.length >= 10) {
    send(ws, 'room:error', { code: 'FULL', message: 'Oda dolu (Maksimum 10 oyuncu).' });
    return;
  }
  room.players.push({ id: client.playerId, name: payload.displayName || 'Player', seatIndex: room.players.length, isConnected: true, missionHistory: [] });
  client.roomCode = code;
  console.log(`[Game] ${client.playerId} joined room ${code}`);
  broadcastRoom(room);
}

function handleLeave(ws, client) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room) {
    room.players = room.players.filter(p => p.id !== client.playerId);
    if (room.players.length === 0) {
      if (room.timer) clearTimeout(room.timer);
      ROOMS.delete(room.code);
      console.log(`[Game] Room ${room.code} deleted (empty)`);
    } else {
      broadcastRoom(room);
    }
  }
  client.roomCode = null;
}

function handleSettings(ws, client, payload) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room && room.hostId === client.playerId) {
    room.settings.discussionSeconds = payload.discussionSeconds || 90;
    broadcastRoom(room);
  }
}

function handleAddBot(ws, client) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room && room.hostId === client.playerId && room.players.length < 10) {
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    room.players.push({ id: `bot_${Math.random().toString(36).slice(2, 8)}`, name, seatIndex: room.players.length, isConnected: true, missionHistory: [] });
    broadcastRoom(room);
  }
}

function handleRemoveBot(ws, client) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room && room.hostId === client.playerId) {
    const idx = room.players.findIndex(p => p.id.startsWith('bot_'));
    if (idx !== -1) { room.players.splice(idx, 1); broadcastRoom(room); }
  }
}

function handleStart(ws, client) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (!room || room.hostId !== client.playerId || room.players.length < 6) return;
  assignRoles(room);
  broadcastRoom(room);
  setTimeout(() => transition(room, 'ROLE_ASSIGNMENT', 12000, () => startRound(room)), 100);
}

function handleTeamSubmit(ws, client, payload) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (!room || (room.phase !== 'TEAM_SELECTION' && room.phase !== 'DISCUSSION')) return;
  if (room.currentRound?.presidentId !== client.playerId) return;
  room.currentRound.team = payload.playerIds;
  beginTeamVoting(room);
}

function handleTeamVote(ws, client, payload) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room?.phase === 'TEAM_VOTING') {
    room.teamVotes[client.playerId] = payload.vote;
    broadcastRoom(room);
    if (Object.keys(room.teamVotes).length === room.players.length) resolveTeamVote(room);
  }
}

function handleActionSubmit(ws, client, payload) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room?.phase === 'SECRET_ACTION') {
    room.secretActions[client.playerId] = payload.action;
    broadcastRoom(room);
    if (Object.keys(room.secretActions).length === room.currentRound.team.length) resolveMission(room);
  }
}

function handleReset(ws, client) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room && room.hostId === client.playerId) {
    if (room.timer) clearTimeout(room.timer);
    room.phase = 'LOBBY';
    room.loyalistWins = 0;
    room.traitorWins = 0;
    room.missions = Array(TOTAL_MISSIONS).fill(null);
    room.rolesByPlayerId = {};
    room.factionByPlayerId = {};
    room.currentRound = null;
    room.lastTeamVote = null;
    room.lastMissionTally = null;
    room.players.forEach(p => (p.missionHistory = []));
    broadcastRoom(room);
  }
}

function handleSkipPhase(ws, client) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room && room.hostId === client.playerId && room.timer && room.onTimerEnd) {
    clearTimeout(room.timer);
    room.timer = null;
    const cb = room.onTimerEnd;
    room.onTimerEnd = null;
    cb();
  }
}

function handleSpyHunt(ws, client, payload) {
  const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
  if (room?.phase === 'SPY_HUNT') {
    const winner = room.rolesByPlayerId[payload.targetPlayerId] === 'SPY' ? 'TRAITOR' : 'LOYALIST';
    transition(room, 'GAME_END', 0, () => {});
    broadcastToRoom(room, 'game:ended', { winner, roles: { ...room.rolesByPlayerId } });
  }
}

// ── Main export ──────────────────────────────────────────────────────
export function attachGameServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  console.log('[Game] WebSocket server attached on /ws');

  wss.on('connection', (ws) => {
    const client = { playerId: null, roomCode: null };
    CLIENTS.set(ws, client);

    ws.on('message', (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch { return; }
      const { event, payload } = msg;

      // First message must identify the player
      if (event === 'auth') {
        client.playerId = payload.playerId;
        client.displayName = payload.displayName;
        send(ws, 'auth:ok', { playerId: client.playerId });
        return;
      }

      if (!client.playerId) {
        send(ws, 'room:error', { code: 'AUTH', message: 'Not authenticated' });
        return;
      }

      switch (event) {
        case 'room:create': return handleCreate(ws, client, payload);
        case 'room:join': return handleJoin(ws, client, payload);
        case 'room:leave': return handleLeave(ws, client);
        case 'lobby:updateSettings': return handleSettings(ws, client, payload);
        case 'lobby:addBot': return handleAddBot(ws, client);
        case 'lobby:removeBot': return handleRemoveBot(ws, client);
        case 'game:start': return handleStart(ws, client);
        case 'team:submit': return handleTeamSubmit(ws, client, payload);
        case 'team:vote': return handleTeamVote(ws, client, payload);
        case 'action:submit': return handleActionSubmit(ws, client, payload);
        case 'game:reset': return handleReset(ws, client);
        case 'game:skipPhase': return handleSkipPhase(ws, client);
        case 'game:spyHunt': return handleSpyHunt(ws, client, payload);
      }
    });

    ws.on('close', () => {
      const room = client.roomCode ? ROOMS.get(client.roomCode) : null;
      if (room) {
        const player = room.players.find(p => p.id === client.playerId);
        if (player) player.isConnected = false;
        broadcastRoom(room);
      }
      CLIENTS.delete(ws);
    });
  });

  return wss;
}
