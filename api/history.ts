
import fs from 'fs';
import path from 'path';
import { Room } from '../src/types/index';

// Use environment variable for data directory if provided, otherwise default to local 'data' folder
const BASE_DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const HISTORY_FILE = path.join(BASE_DATA_DIR, 'gameHistory.json');

// Ensure directory exists
if (!fs.existsSync(BASE_DATA_DIR)) {
  fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
}

interface GameHistoryEntry {
  roomId: string;
  timestamp: string;
  settings: any;
  finalState: any;
  players: any[];
  winner: string | null;
  history: any[]; // deadPlayers history
}

export const saveGameHistory = (room: Room) => {
  try {
    let history: GameHistoryEntry[] = [];
    
    if (fs.existsSync(HISTORY_FILE)) {
      const fileContent = fs.readFileSync(HISTORY_FILE, 'utf-8');
      try {
        history = JSON.parse(fileContent);
      } catch (e) {
        console.error('Failed to parse game history:', e);
        history = [];
      }
    }

    const entry: GameHistoryEntry = {
      roomId: room.id,
      timestamp: new Date().toISOString(),
      settings: room.settings,
      finalState: {
          phase: room.gameState.phase,
          dayCount: room.gameState.dayCount,
      },
      players: room.players.map(p => ({
          nickname: p.nickname,
          role: p.role,
          isAlive: p.isAlive,
          deathReason: p.deathReason
      })),
      winner: room.gameState.winner,
      history: room.gameState.deadPlayers
    };

    history.push(entry);
    
    // Limit history size if needed (e.g. keep last 50 games)
    if (history.length > 50) {
        history = history.slice(-50);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`Game history saved for room ${room.id}`);
  } catch (error) {
    console.error('Error saving game history:', error);
  }
};
