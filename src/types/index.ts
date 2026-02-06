
export type Role = 'werewolf' | 'villager' | 'seer' | 'witch' | 'hunter' | 'guard';

export interface Player {
  id: string; // Socket ID
  nickname: string;
  avatar: string;
  role?: Role;
  isAlive: boolean;
  isHost: boolean;
  roomId: string;
  deathReason?: 'werewolf' | 'poison' | 'vote' | 'hunter'; // For displaying death cause if needed (usually hidden until day)
}

export type GamePhase = 'waiting' | 'setup' | 'night' | 'day' | 'vote' | 'game_over';
export type NightPhase = 'closing' | 'werewolf' | 'seer' | 'witch' | 'guard' | null;

export interface GameSettings {
  roles: {
    [key in Role]: number;
  };
}

export interface NightAction {
  playerId: string; // Who performed the action
  targetId?: string; // Target of the action
  actionType: 'kill' | 'check' | 'heal' | 'poison' | 'protect' | 'skip';
}

export interface GameState {
  phase: GamePhase;
  nightPhase: NightPhase;
  dayCount: number;
  
  // Timer Management
  phaseStartTime: number;
  phaseDuration: number; // in seconds

  winner: 'werewolf' | 'villager' | null;
  
  // Temporary Night State
  nightActions: NightAction[]; // Raw actions log
  werewolfVotes: Record<string, string>; // VoterID -> TargetID
  currentWolfTarget: string | null; // Calculated target for Witch to see
  
  // Role Specific State (Persisted)
  witchInventory: {
    hasAntidote: boolean;
    hasPoison: boolean;
  };
  guardLastProtect: string | null;
  
  // History
  deadPlayers: { day: number, playerIds: string[] }[];
  
  // Seer check result for the current player (if seer)
  seerResult?: { nickname: string, isWerewolf: boolean, role?: Role } | null;
}

export interface Room {
  id: string;
  players: Player[];
  settings: GameSettings;
  gameState: GameState;
  createdAt: number;
  timerId?: NodeJS.Timeout; // Server-side timer reference (not sent to client)
}

export interface ClientRoomState {
  id: string;
  players: Player[]; // Roles are hidden for others
  settings: GameSettings;
  gameState: Omit<GameState, 'nightActions' | 'werewolfVotes' | 'currentWolfTarget'> & {
    // Expose limited info
    currentWolfTarget?: string | null; // Only exposed to Witch
    myAction?: NightAction; // The action performed by this player in current phase
  };
  myRole?: Role; // Only present for the current player
}
