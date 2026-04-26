// CONSENSUS — shared game types
// These mirror the Socket.io event contract documented in chat.
// Server is authoritative; client never derives roles, missions, or vote tallies.

export type Phase =
  | "LOBBY"
  | "ROLE_ASSIGNMENT"
  | "DISCUSSION"
  | "TEAM_SELECTION"
  | "SECRET_ACTION"
  | "RESULT_REVEAL"
  | "TRUST_REVEAL"
  | "VOTING"
  | "WIN_CHECK"
  | "GAME_END";

export type Faction = "LOYALIST" | "TRAITOR";
export type Role = "LOYALIST" | "TRAITOR" | "PRESIDENT";
export type MissionResult = "SUCCESS" | "SABOTAGE";
export type SecretAction = "SUPPORT" | "SABOTAGE";

export interface PublicPlayer {
  id: string;
  name: string;
  seatIndex: number;
  isAlive: boolean;
  isConnected: boolean;
}

export interface RoomSettings {
  discussionSeconds: number; // 60–120
}

export interface CurrentRound {
  no: number;
  presidentId: string;
  team: string[];
  missionResult: MissionResult | null;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: Phase;
  phaseEndsAt: number | null; // epoch ms
  settings: RoomSettings;
  players: PublicPlayer[];
  currentRound: CurrentRound | null;
  missions: (MissionResult | null)[]; // length 5, best-of-5
  // Phase-specific public payloads (revealed only when phase >= reveal)
  lastMissionTally?: { supportCount: number; sabotageCount: number } | null;
  lastVoteResult?: { eliminatedPlayerId: string | null; tallies: Record<string, number> } | null;
}

export interface MyRolePayload {
  role: Role;
  faction: Faction;
}

export interface TrustRevealPayload {
  fromPlayerId: string;
  fromName: string;
  role: Role;
}

export interface GameEndPayload {
  winner: Faction;
  roles: Record<string, Role>;
}

// Role distribution table — server uses this; client mirrors for UI hints only
export const ROLE_DISTRIBUTION: Record<number, { traitors: number; loyalists: number }> = {
  6: { traitors: 1, loyalists: 5 },
  7: { traitors: 2, loyalists: 5 },
  8: { traitors: 2, loyalists: 6 },
  9: { traitors: 3, loyalists: 6 },
  10: { traitors: 3, loyalists: 7 },
};

export const PHASE_LABEL: Record<Phase, string> = {
  LOBBY: "Lobby",
  ROLE_ASSIGNMENT: "Roles being assigned",
  DISCUSSION: "Discussion",
  TEAM_SELECTION: "Team Selection",
  SECRET_ACTION: "Secret Action",
  RESULT_REVEAL: "Mission Result",
  TRUST_REVEAL: "Trust Reveal",
  VOTING: "Elimination Vote",
  WIN_CHECK: "Checking Victory",
  GAME_END: "Game Over",
};

export const TEAM_SIZE_BY_PLAYERS: Record<number, number> = {
  6: 2, 7: 3, 8: 3, 9: 3, 10: 3,
};

export const MISSIONS_TO_WIN = 3;
export const TOTAL_MISSIONS = 5;
