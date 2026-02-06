import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/useGameStore';
import { useNavigate } from 'react-router-dom';

// In dev, use proxy or direct URL. Since we set up proxy:
const SOCKET_URL = '/'; 

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { setRoom, updateRoom } = useGameStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        path: '/socket.io',
        transports: ['websocket'], // Prefer websocket
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Connected to socket server');
      });

      socket.on('room_update', (room) => {
        console.log('Room update:', room);
        updateRoom(room);
        
        // Navigation logic could be here or in components based on room state
        if (room.gameState.phase === 'waiting') {
           // Ensure we are on room page? Handled by component logic mostly.
        }
      });

      socket.on('error', (err) => {
        console.error('Socket error:', err);
        alert(err.message);
      });
    }

    return () => {
      // Don't disconnect on unmount to keep connection alive across pages?
      // For SPA, usually fine to keep one connection at App level or context.
      // But if we put this in App, it persists.
      // If we put it in hook used by pages, it might reconnect.
      // Better to have a singleton socket instance.
    };
  }, [setRoom, updateRoom]);

  return socketRef.current;
};

// Singleton pattern for socket might be better to avoid re-connections
let socket: Socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
    });
  }
  return socket;
};
