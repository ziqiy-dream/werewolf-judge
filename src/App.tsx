import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import Game from './pages/Game';
import ErrorBoundary from './components/ErrorBoundary';
import { useGameStore } from './store/useGameStore';
import { getSocket } from './hooks/useSocket';

const AppContent = () => {
  const { updateRoom, room } = useGameStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const socket = getSocket();

    const onRoomUpdate = (updatedRoom: any) => {
      console.log('App room update:', updatedRoom);
      updateRoom(updatedRoom);
      
      // Auto routing based on state
      if (updatedRoom.gameState.phase === 'waiting' && !location.pathname.startsWith('/room')) {
        navigate(`/room/${updatedRoom.id}`);
      } else if (updatedRoom.gameState.phase !== 'waiting' && updatedRoom.gameState.phase !== 'game_over' && !location.pathname.startsWith('/game')) {
        navigate(`/game/${updatedRoom.id}`);
      }
    };

    const onError = (err: any) => {
        console.error("Socket error", err);
        alert(err.message || "An error occurred");
    }

    socket.on('room_update', onRoomUpdate);
    socket.on('error', onError);

    return () => {
      socket.off('room_update', onRoomUpdate);
      socket.off('error', onError);
    };
  }, [updateRoom, navigate, location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground font-hand">
      <ErrorBoundary>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:roomId" element={<Room />} />
            <Route path="/game/:roomId" element={<Game />} />
        </Routes>
      </ErrorBoundary>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
