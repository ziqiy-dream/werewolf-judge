
import fs from 'fs';
import path from 'path';
import { Room } from '../src/types/index';

const DATA_DIR = path.join(process.cwd(), 'data');
const ROOMS_FILE = path.join(DATA_DIR, 'rooms.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const saveRooms = (rooms: Map<string, Room>) => {
  try {
    // Convert Map to Array of entries for serialization
    const roomsData = Array.from(rooms.entries());
    // We don't save the timerId as it cannot be serialized
    const serializedData = roomsData.map(([id, room]) => {
        const { timerId, ...rest } = room;
        return [id, rest];
    });
    
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(serializedData, null, 2));
  } catch (error) {
    console.error('Failed to save rooms:', error);
  }
};

export const loadRooms = (): Map<string, Room> => {
  try {
    if (!fs.existsSync(ROOMS_FILE)) {
      return new Map();
    }
    const fileContent = fs.readFileSync(ROOMS_FILE, 'utf-8');
    const roomsData = JSON.parse(fileContent);
    return new Map(roomsData);
  } catch (error) {
    console.error('Failed to load rooms:', error);
    return new Map();
  }
};
