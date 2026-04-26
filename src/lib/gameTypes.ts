// CONSENSUS — shared game types
// These mirror the Socket.io event contract documented in chat.
// Server is authoritative; client never derives roles, missions, or vote tallies.

export type Phase =
  | "LOBBY"
  | "ROLE_ASSIGNMENT"
  | "DISCUSSION"
  | "TEAM_SELECTION"
  | "TEAM_VOTING"
  | "SECRET_ACTION"
  | "RESULT_REVEAL"
  | "TRUST_REVEAL"
  | "SPY_HUNT"
  | "WIN_CHECK"
  | "GAME_END";

export type Faction = "LOYALIST" | "TRAITOR";
export type Role = "LOYALIST" | "TRAITOR" | "SPY";
export type MissionResult = "SUCCESS" | "SABOTAGE";
export type SecretAction = "SUPPORT" | "SABOTAGE";
export type TeamVote = "APPROVE" | "REJECT" | "DOUBLE_APPROVE" | "DOUBLE_REJECT";

export interface PublicPlayer {
  id: string;
  name: string;
  seatIndex: number;
  isConnected: boolean;
  doubleApproveUsed?: boolean;
  doubleRejectUsed?: boolean;
  missionHistory: { roundNo: number; result: MissionResult }[];
}

export interface RoomSettings {
  discussionSeconds: number; // 30–300
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
  missions: (MissionResult | null)[]; // length 5
  // Phase-specific public payloads
  lastTeamVote?: { tallies: Record<string, TeamVote>; approved: boolean } | null;
  lastMissionTally?: { supportCount: number; sabotageCount: number } | null;
  lastVoteResult?: { eliminatedPlayerId: string | null; tallies: Record<string, number> } | null;
  votedPlayerIds: string[];
}

export interface MyRolePayload {
  role: Role;
  faction: Faction;
  knownRoles?: Record<string, Role>; // Sent only to Spy
}

// Role distribution table
export const ROLE_DISTRIBUTION: Record<number, { traitors: number; spies: 1 }> = {
  6: { traitors: 2, spies: 1 },
  7: { traitors: 2, spies: 1 },
  8: { traitors: 3, spies: 1 },
  9: { traitors: 3, spies: 1 },
  10: { traitors: 4, spies: 1 },
};

// Team sizes per round [R1, R2, R3, R4, R5]
export const TEAM_SIZES: Record<number, number[]> = {
  6: [2, 3, 3, 2, 2],
  7: [3, 3, 4, 3, 2],
  8: [3, 4, 4, 5, 3],
  9: [3, 4, 5, 5, 4],
  10: [3, 4, 5, 6, 5],
};

export const PHASE_LABEL: Record<Phase, string> = {
  LOBBY: "Lobby",
  ROLE_ASSIGNMENT: "Roles being assigned",
  DISCUSSION: "Discussion",
  TEAM_SELECTION: "Team Selection",
  TEAM_VOTING: "Team Voting",
  SECRET_ACTION: "Secret Action",
  RESULT_REVEAL: "Mission Result",
  TRUST_REVEAL: "Trust Reveal",
  SPY_HUNT: "Spy Hunt (Revenge)",
  WIN_CHECK: "Checking Victory",
  GAME_END: "Game Over",
};

export const MISSIONS_TO_WIN = 3;
export const TOTAL_MISSIONS = 5;
