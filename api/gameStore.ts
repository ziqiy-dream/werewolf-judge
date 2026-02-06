
import { Server } from 'socket.io';
import { Room, Player, Role, GameSettings, GameState, NightPhase, NightAction, ClientRoomState } from '../src/types/index';
import { saveGameHistory } from './history';
import { saveRooms, loadRooms } from './storePersistence';

class GameStore {
  private rooms: Map<string, Room> = new Map();
  private io: Server | null = null;

  constructor() {
    this.rooms = loadRooms();
    console.log(`[GameStore] Loaded ${this.rooms.size} rooms from persistence`);
    // Restart timers for active phases
    this.rooms.forEach(room => {
      const now = Date.now();
      if (room.gameState.phaseDuration > 0 && room.gameState.phaseStartTime > 0) {
        const elapsed = (now - room.gameState.phaseStartTime) / 1000;
        const remaining = room.gameState.phaseDuration - elapsed;
        
        if (remaining > 0) {
          console.log(`[GameStore] Resuming timer for room ${room.id} (${remaining.toFixed(1)}s left)`);
          this.setPhaseTimer(room, remaining);
        } else {
          console.log(`[GameStore] Timer expired for room ${room.id}, advancing phase`);
          this.nextPhase(room.id);
        }
      }
    });
  }

  setIo(io: Server) {
    this.io = io;
  }

  createRoom(roomId: string, host: Player): Room {
    const defaultSettings: GameSettings = {
      roles: {
        werewolf: 1,
        villager: 1,
        seer: 1,
        witch: 1,
        hunter: 1,
        guard: 1,
      },
    };

    const initialGameState: GameState = {
      phase: 'waiting',
      nightPhase: null,
      dayCount: 0,
      phaseStartTime: 0,
      phaseDuration: 0,
      winner: null,
      nightActions: [],
      werewolfVotes: {},
      currentWolfTarget: null,
      witchInventory: { hasAntidote: true, hasPoison: true },
      guardLastProtect: null,
      deadPlayers: [],
      seerResult: null,
    };

    const room: Room = {
      id: roomId,
      players: [host],
      settings: defaultSettings,
      gameState: initialGameState,
      createdAt: Date.now(),
    };

    this.rooms.set(roomId, room);
    saveRooms(this.rooms);
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, player: Player): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.players.push(player);
    saveRooms(this.rooms);
    return room;
  }

  removePlayer(roomId: string, playerId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    room.players = room.players.filter((p) => p.id !== playerId);
    
    if (room.players.length > 0) {
      const hasHost = room.players.some(p => p.isHost);
      if (!hasHost) {
        room.players[0].isHost = true;
      }
    } else {
      this.clearTimer(room);
      this.rooms.delete(roomId);
      saveRooms(this.rooms);
      return undefined;
    }

    saveRooms(this.rooms);
    return room;
  }

  updateSettings(roomId: string, settings: GameSettings): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.settings = settings;
    saveRooms(this.rooms);
    return room;
  }

  startGame(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const roles: Role[] = [];
    Object.entries(room.settings.roles).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) {
        roles.push(role as Role);
      }
    });

    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    room.players.forEach((player, index) => {
      player.role = roles[index] || 'villager';
      player.isAlive = true;
      player.deathReason = undefined;
    });

    // Reset Game State
    room.gameState = {
      ...room.gameState,
      phase: 'setup',
      dayCount: 0,
      nightPhase: null,
      phaseStartTime: Date.now(),
      phaseDuration: 0, // Manual advance for Setup
      nightActions: [],
      werewolfVotes: {},
      currentWolfTarget: null,
      witchInventory: { hasAntidote: true, hasPoison: true },
      guardLastProtect: null,
      deadPlayers: [],
      seerResult: null,
      winner: null
    };
    
    saveRooms(this.rooms);
    return room;
  }

  // --- Phase Management ---

  private setPhaseTimer(room: Room, durationSeconds: number) {
    this.clearTimer(room);
    room.gameState.phaseStartTime = Date.now();
    room.gameState.phaseDuration = durationSeconds;

    if (durationSeconds > 0) {
      room.timerId = setTimeout(() => {
        this.nextPhase(room.id);
      }, durationSeconds * 1000);
    }
  }

  private clearTimer(room: Room) {
    if (room.timerId) {
      clearTimeout(room.timerId);
      room.timerId = undefined;
    }
  }

  nextPhase(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    const { phase, nightPhase } = room.gameState;

    // Transition Logic
    if (phase === 'setup') {
      // Setup -> Night (Closing)
      room.gameState.phase = 'night';
      room.gameState.dayCount = 1;
      room.gameState.nightPhase = 'closing';
      this.setPhaseTimer(room, 5);
    } 
    else if (phase === 'night') {
      if (nightPhase === 'closing') {
        // Closing -> Werewolf
        room.gameState.nightPhase = 'werewolf';
        room.gameState.werewolfVotes = {}; // Reset votes
        this.setPhaseTimer(room, 20);
      } 
      else if (nightPhase === 'werewolf') {
        // Calculate Werewolf Target
        this.calculateWerewolfTarget(room);
        
        // Werewolf -> Seer (or skip)
        if (room.settings.roles.seer > 0) {
          room.gameState.nightPhase = 'seer';
          room.gameState.seerResult = null;
          this.setPhaseTimer(room, 15);
        } else {
          this.transitionToWitch(room);
        }
      } 
      else if (nightPhase === 'seer') {
        // Seer -> Witch (or skip)
        this.transitionToWitch(room);
      } 
      else if (nightPhase === 'witch') {
        // Witch -> Guard (or skip)
        this.transitionToGuard(room);
      } 
      else if (nightPhase === 'guard') {
        // Guard -> Night Resolution -> Day
        this.resolveNight(room);
      }
    } 
    else if (phase === 'day') {
      // Day Announce -> Waiting/Voting (Not fully spec'd yet, just waiting for now)
      // Requirement: "Wait for host to click continue"
      // If we are in "Announce" (implied by just entering day), stay here until manual action?
      // Or move to 'vote' phase?
      // For now, stay in 'day' until manual next.
    }

    this.broadcastUpdate(room);
    saveRooms(this.rooms);
    return room;
  }

  private transitionToWitch(room: Room) {
    if (room.settings.roles.witch > 0) {
      room.gameState.nightPhase = 'witch';
      this.setPhaseTimer(room, 20);
    } else {
      this.transitionToGuard(room);
    }
  }

  private transitionToGuard(room: Room) {
    if (room.settings.roles.guard > 0) {
      room.gameState.nightPhase = 'guard';
      this.setPhaseTimer(room, 15);
    } else {
      this.resolveNight(room);
    }
  }

  // --- Logic Helpers ---

  handleWerewolfVote(roomId: string, playerId: string, targetId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.gameState.werewolfVotes[playerId] = targetId;
    saveRooms(this.rooms);
    this.broadcastUpdate(room);
  }

  private calculateWerewolfTarget(room: Room) {
    const votes = Object.values(room.gameState.werewolfVotes);
    if (votes.length === 0) {
      room.gameState.currentWolfTarget = null;
      return;
    }

    const counts: Record<string, number> = {};
    votes.forEach(id => counts[id] = (counts[id] || 0) + 1);
    
    let maxVotes = 0;
    let target = null;
    Object.entries(counts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        target = id;
      } else if (count === maxVotes) {
        // Tie-breaker? Random or No Kill?
        // Usually, if tie, no kill or re-vote.
        // For simplicity: First one reached max keeps it (arbitrary tie break).
        // Or if strict: target = null (Peace).
        // Let's keep the first one for now.
      }
    });
    
    room.gameState.currentWolfTarget = target || null;
  }

  handleAction(roomId: string, action: NightAction) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Validate phase
    const { phase, nightPhase } = room.gameState;
    if (phase !== 'night') return;

    // Role Validation
    const player = room.players.find(p => p.id === action.playerId);
    if (!player || !player.isAlive) return;

    // Logic per action type
    if (action.actionType === 'kill' && player.role === 'werewolf' && nightPhase === 'werewolf') {
      if (action.targetId) {
        this.handleWerewolfVote(roomId, action.playerId, action.targetId);
      }
    }
    else if (action.actionType === 'check' && player.role === 'seer' && nightPhase === 'seer') {
        if (action.targetId) {
            const target = room.players.find(p => p.id === action.targetId);
            if (target) {
                // Return full role information for Seer
                room.gameState.seerResult = { 
                    nickname: target.nickname, 
                    isWerewolf: target.role === 'werewolf',
                    role: target.role // Add specific role
                };
                // Also record the action
                room.gameState.nightActions.push(action);
                saveRooms(this.rooms);
                this.broadcastUpdate(room);
            }
        }
    }
    else if (action.actionType === 'heal' && player.role === 'witch' && nightPhase === 'witch') {
        if (room.gameState.witchInventory.hasAntidote && room.gameState.currentWolfTarget) {
            room.gameState.witchInventory.hasAntidote = false;
            room.gameState.nightActions.push(action);
            saveRooms(this.rooms);
            this.broadcastUpdate(room);
        }
    }
    else if (action.actionType === 'poison' && player.role === 'witch' && nightPhase === 'witch') {
        if (room.gameState.witchInventory.hasPoison && action.targetId) {
            room.gameState.witchInventory.hasPoison = false;
            room.gameState.nightActions.push(action);
            saveRooms(this.rooms);
            this.broadcastUpdate(room);
        }
    }
    else if (action.actionType === 'protect' && player.role === 'guard' && nightPhase === 'guard') {
        if (action.targetId && action.targetId !== room.gameState.guardLastProtect) {
            room.gameState.guardLastProtect = action.targetId;
            room.gameState.nightActions.push(action);
            saveRooms(this.rooms);
            this.broadcastUpdate(room);
        }
    }
    else if (action.actionType === 'skip') {
        // Just record skip
        room.gameState.nightActions.push(action);
        if (player.role === 'guard' && nightPhase === 'guard') {
             room.gameState.guardLastProtect = null; // Reset last protect if skipped? Or keep previous? Rule: "Cannot protect SAME person". If skip, next night can protect anyone.
        }
        saveRooms(this.rooms);
        this.broadcastUpdate(room);
    }
  }

  private resolveNight(room: Room) {
    let deadIds: string[] = [];
    const { currentWolfTarget, nightActions } = room.gameState;

    // 1. Werewolf Kill
    if (currentWolfTarget) {
        let isDead = true;
        
        // Guard Protect
        const protectAction = nightActions.find(a => a.actionType === 'protect');
        if (protectAction?.targetId === currentWolfTarget) {
            isDead = false;
        }

        // Witch Heal
        const healAction = nightActions.find(a => a.actionType === 'heal');
        if (healAction) {
            // Heal targets the currentWolfTarget implicitly (in UI) or explicitly
            // Our logic: Heal always saves the wolf target
            if (isDead) isDead = false; // Saved
            else isDead = true; // Guard + Heal = Dead
        }

        if (isDead) {
            deadIds.push(currentWolfTarget);
            const p = room.players.find(p => p.id === currentWolfTarget);
            if (p) p.deathReason = 'werewolf';
        }
    }

    // 2. Witch Poison
    const poisonAction = nightActions.find(a => a.actionType === 'poison');
    if (poisonAction?.targetId) {
        deadIds.push(poisonAction.targetId);
        const p = room.players.find(p => p.id === poisonAction.targetId);
        if (p) p.deathReason = 'poison';
    }

    // Apply Deaths
    deadIds = [...new Set(deadIds)];
    deadIds.forEach(id => {
        const p = room.players.find(p => p.id === id);
        if (p) p.isAlive = false;
    });

    // Record History
    room.gameState.deadPlayers.push({
        day: room.gameState.dayCount,
        playerIds: deadIds
    });

    // Save History
    saveGameHistory(room);

    // Transition to Day
    room.gameState.phase = 'day';
    room.gameState.nightPhase = null;
    this.setPhaseTimer(room, 10); // Announce phase duration
    
    // Cleanup for next night
    room.gameState.nightActions = [];
    room.gameState.seerResult = null;
    room.gameState.currentWolfTarget = null;
    room.gameState.werewolfVotes = {};
    
    saveRooms(this.rooms);
  }

  // --- Utils ---
  
  private broadcastUpdate(room: Room) {
    if (!this.io) return;
    
    room.players.forEach(p => {
      this.io?.to(p.id).emit('room_update', this.sanitizeRoom(room, p.id));
    });
  }

  sanitizeRoom(room: Room, playerId: string): ClientRoomState {
    const players = room.players.map(p => {
      if (p.id === playerId) return p;
      // Hide role and death reason for others (until revealed?)
      // Actually death reason should be visible when they are dead?
      // Requirement: "Show death card". So if isAlive=false, maybe show?
      // For now, hide role.
      const { role, ...rest } = p;
      return rest as Player;
    });

    const myPlayer = room.players.find(p => p.id === playerId);

    // Sanitize GameState
    const { nightActions, werewolfVotes, currentWolfTarget, seerResult, ...safeGameState } = room.gameState;
    
    const clientState: ClientRoomState = {
        id: room.id,
        players,
        settings: room.settings,
        gameState: safeGameState,
        myRole: myPlayer?.role,
    };

    // Role-specific data exposure
    if (myPlayer?.role === 'witch') {
        clientState.gameState.currentWolfTarget = currentWolfTarget;
    }

    if (myPlayer?.role === 'seer') {
        clientState.gameState.seerResult = seerResult;
    }
    
    // Add my actions
    // ...

    return clientState;
  }

  deleteRoom(roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
        this.clearTimer(room);
        this.rooms.delete(roomId);
    }
  }
}

export const gameStore = new GameStore();
