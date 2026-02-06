
import { Server, Socket } from 'socket.io';
import { gameStore } from './gameStore';
import { Player } from '../src/types/index';

const generateRoomId = () => {
  const chars = 'ABCDEF0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const setupSocket = (io: Server) => {
  // Initialize gameStore with io instance for broadcasts
  gameStore.setIo(io);

  io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ nickname, avatar }) => {
      const roomId = generateRoomId();
      const player: Player = {
        id: socket.id,
        nickname,
        avatar,
        isAlive: true,
        isHost: true,
        roomId,
      };

      const room = gameStore.createRoom(roomId, player);
      socket.join(roomId);
      
      socket.emit('room_update', gameStore.sanitizeRoom(room, socket.id));
    });

    socket.on('join_room', ({ nickname, avatar, roomId }) => {
      const room = gameStore.getRoom(roomId);
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.gameState.phase !== 'waiting') {
        socket.emit('error', { message: 'Game already started' });
        return;
      }

      const player: Player = {
        id: socket.id,
        nickname,
        avatar,
        isAlive: true,
        isHost: false,
        roomId,
      };

      gameStore.joinRoom(roomId, player);
      socket.join(roomId);

      // Emit to everyone in room
      io.to(roomId).emit('player_joined');
      
      room.players.forEach(p => {
        io.to(p.id).emit('room_update', gameStore.sanitizeRoom(room, p.id));
      });
    });

    socket.on('update_settings', ({ roomId, settings }) => {
      const room = gameStore.getRoom(roomId);
      if (!room) return;
      
      const player = room.players.find(p => p.id === socket.id);
      if (!player?.isHost) return;

      gameStore.updateSettings(roomId, settings);
      
      room.players.forEach(p => {
        io.to(p.id).emit('room_update', gameStore.sanitizeRoom(room, p.id));
      });
    });

    socket.on('start_game', ({ roomId }) => {
       console.log(`[Socket] Received start_game for room ${roomId} from ${socket.id}`);
       const room = gameStore.getRoom(roomId);
       if (!room) {
         console.log(`[Socket] Room ${roomId} not found`);
         socket.emit('error', { message: 'Room not found. Please return to home and create a new room.' });
         return;
       }
       
       const player = room.players.find(p => p.id === socket.id);
       if (!player?.isHost) {
           console.log(`[Socket] Player ${socket.id} is not host`);
           return;
       }

       const totalRoles = Object.values(room.settings.roles).reduce((a, b) => a + b, 0);
       if (totalRoles !== room.players.length) {
         console.log(`[Socket] Role mismatch: ${totalRoles} vs ${room.players.length}`);
         socket.emit('error', { message: `Player count (${room.players.length}) does not match Role count (${totalRoles})` });
         return;
       }

       gameStore.startGame(roomId);
       
       console.log(`[Socket] Game started for room ${roomId}, phase: ${room.gameState.phase}`);

       // Initial broadcast is needed here because startGame doesn't auto-broadcast
       room.players.forEach(p => {
        io.to(p.id).emit('room_update', gameStore.sanitizeRoom(room, p.id));
      });
    });

    socket.on('game_action', ({ roomId, action }) => {
       gameStore.handleAction(roomId, action);
    });

    socket.on('next_phase', ({ roomId }) => {
       const room = gameStore.getRoom(roomId);
       if (!room) return;
       
       const player = room.players.find(p => p.id === socket.id);
       if (!player?.isHost) return;

       gameStore.nextPhase(roomId);
    });

    socket.on('leave_room', ({ roomId }) => {
      const room = gameStore.removePlayer(roomId, socket.id);
      socket.leave(roomId);
      socket.emit('room_left');

      if (room) {
        room.players.forEach(p => {
          io.to(p.id).emit('room_update', gameStore.sanitizeRoom(room, p.id));
        });
      }
    });

    socket.on('disband_room', ({ roomId }) => {
      const room = gameStore.getRoom(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player?.isHost) return;

      io.to(roomId).emit('room_disbanded');
      gameStore.deleteRoom(roomId);
      io.in(roomId).socketsLeave(roomId);
    });

    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms];
      rooms.forEach(roomId => {
        if (roomId === socket.id) return;

        const room = gameStore.removePlayer(roomId, socket.id);
        if (room) {
          room.players.forEach(p => {
            io.to(p.id).emit('room_update', gameStore.sanitizeRoom(room, p.id));
          });
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
};
