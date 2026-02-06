import React, { useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getSocket } from '../hooks/useSocket';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/Avatar';
import { Copy, Users, Play, Settings, Shield, User, Moon, Zap, Crosshair, LogOut, Trash2, Languages } from 'lucide-react';
import { Role } from '../types';
import { translations } from '../lib/i18n';

const Room = () => {
  const { room, nickname, language, setLanguage, reset } = useGameStore();
  const socket = getSocket();
  const navigate = useNavigate();
  const { roomId } = useParams();
  const t = translations[language];

  useEffect(() => {
    if (!room) {
      navigate('/');
    }

    if (room && room.gameState.phase !== 'waiting') {
        console.log('[Room] Phase changed to', room.gameState.phase, ', navigating to game');
        navigate(`/game/${room.id}`);
    }

    const onRoomDisbanded = () => {
      alert(language === 'zh' ? '房间已解散' : 'Room disbanded');
      reset();
      navigate('/');
    };
    
    const onRoomLeft = () => {
      reset();
      navigate('/');
    };

    socket.on('room_disbanded', onRoomDisbanded);
    socket.on('room_left', onRoomLeft);

    return () => {
      socket.off('room_disbanded', onRoomDisbanded);
      socket.off('room_left', onRoomLeft);
    };
  }, [room, navigate, reset, language, socket]);

  if (!room) return null;

  const myPlayer = room.players.find(p => p.id === socket.id);
  const amIHost = myPlayer?.isHost;

  const handleCopyId = () => {
    navigator.clipboard.writeText(room.id);
  };

  const handleLeaveRoom = () => {
    if (confirm(t.confirmLeave)) {
      socket.emit('leave_room', { roomId: room.id });
    }
  };

  const handleDisbandRoom = () => {
    if (confirm(t.confirmDisband)) {
      socket.emit('disband_room', { roomId: room.id });
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const updateRoleCount = (role: Role, delta: number) => {
    if (!amIHost) return;
    const currentCount = room.settings.roles[role] || 0;
    const newCount = Math.max(0, currentCount + delta);
    
    const newSettings = {
      ...room.settings,
      roles: {
        ...room.settings.roles,
        [role]: newCount,
      },
    };
    
    socket.emit('update_settings', { roomId: room.id, settings: newSettings });
  };

  const handleStartGame = () => {
    if (!amIHost) return;
    const totalRoles = Object.values(room.settings.roles).reduce((a, b) => a + b, 0);
    if (totalRoles !== room.players.length) {
      alert(`Role count (${totalRoles}) must match player count (${room.players.length})!`);
      return;
    }
    if (room.settings.roles.werewolf < 1) {
      alert('Must have at least 1 Werewolf!');
      return;
    }
    console.log('[Room] Host clicked Start Game');
    socket.emit('start_game', { roomId: room.id });
  };

  const ROLE_ICONS: Record<Role, React.ReactNode> = {
    werewolf: <Moon className="w-5 h-5 text-ink-red" />,
    villager: <User className="w-5 h-5" />,
    seer: <Users className="w-5 h-5 text-purple-800" />,
    witch: <Zap className="w-5 h-5 text-purple-800" />,
    hunter: <Crosshair className="w-5 h-5 text-orange-800" />,
    guard: <Shield className="w-5 h-5 text-blue-800" />,
  };

  const totalRoles = Object.values(room.settings.roles).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-transparent p-4 font-typewriter">
      {/* Top Navigation Bar */}
      <div className="max-w-6xl mx-auto flex justify-end gap-3 mb-4">
         <button 
           onClick={toggleLanguage}
           className="flex items-center gap-2 px-3 py-2 bg-paper-light border border-ink/50 rounded hover:bg-ink/10 transition-colors shadow-sm text-ink"
           title="Switch Language"
         >
           <Languages className="w-4 h-4" />
           <span className="font-bold">{language.toUpperCase()}</span>
         </button>

         <button 
           onClick={handleLeaveRoom}
           className="flex items-center gap-2 px-3 py-2 bg-paper-light border border-ink/50 rounded hover:bg-red-900/30 transition-colors shadow-sm text-ink-red"
           title={t.leaveRoom}
         >
           <LogOut className="w-4 h-4" />
           <span className="hidden sm:inline font-bold">{t.leaveRoom}</span>
         </button>

         {amIHost && (
           <button 
             onClick={handleDisbandRoom}
             className="flex items-center gap-2 px-3 py-2 bg-ink-red text-paper border border-ink rounded hover:bg-red-900 transition-colors shadow-sm"
             title={t.disbandRoom}
           >
             <Trash2 className="w-4 h-4" />
             <span className="hidden sm:inline font-bold">{t.disbandRoom}</span>
           </button>
         )}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Left Column: Room Info & Players (Evidence Board) */}
        <div className="md:col-span-7 lg:col-span-8 space-y-6">
          
          {/* Room Header Card */}
          <div className="bg-paper bg-paper-texture p-6 shadow-xl border-2 border-dashed border-ink relative transform -rotate-1">
             <div className="absolute -top-3 left-4 bg-ink text-paper px-2 py-1 text-sm font-bold shadow-sm transform rotate-1">{t.roomTitle}</div>
             <div className="flex items-center justify-between mt-2">
               <span className="text-5xl font-bold tracking-[0.2em] text-ink border-b-4 border-double border-ink pb-2 uppercase">{room.id}</span>
               <button onClick={handleCopyId} className="group flex items-center gap-2 p-2 hover:bg-ink/10 rounded transition-colors">
                 <span className="text-sm font-hand opacity-0 group-hover:opacity-100 transition-opacity text-ink-blue">{t.copyId}</span>
                 <Copy className="w-6 h-6 text-ink" />
               </button>
             </div>
          </div>

          {/* Suspects Board */}
          <div className="bg-paper bg-paper-texture p-8 shadow-xl border-2 border-ink relative">
            {/* Tape decorations */}
            <div className="absolute -top-3 left-1/3 w-24 h-6 bg-yellow-100/80 rotate-2 shadow-sm border-l border-r border-white/50" />
            <div className="absolute -bottom-3 right-1/3 w-24 h-6 bg-yellow-100/80 -rotate-2 shadow-sm border-l border-r border-white/50" />

            <h3 className="text-2xl font-bold mb-6 flex items-center gap-3 border-b-2 border-ink pb-2 text-ink uppercase tracking-wider">
              <Users className="w-6 h-6" />
              {t.suspectsBoard} ({room.players.length})
            </h3>
            
            <div className="flex flex-col gap-4">
              {room.players.map((player) => (
                <div key={player.id} className="relative group w-full">
                  {/* Polaroid Style Card - Horizontal Layout */}
                  <div className="bg-paper-light p-2 shadow-md transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-ink/20 flex items-center gap-3">
                    
                    {/* Pin */}
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-3 h-3 rounded-full bg-ink-red shadow-md border border-ink-dark" />
                    </div>

                    {/* Photo */}
                    <div className="w-12 h-12 shrink-0 bg-black/30 overflow-hidden filter grayscale contrast-125 group-hover:filter-none transition-all duration-500 border border-ink/30">
                      <Avatar seed={player.avatar} size={48} className="w-full h-full object-cover" />
                    </div>
                    
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="font-hand text-xl font-bold text-ink truncate text-left">{player.nickname}</div>
                      {player.id === socket.id && (
                         <div className="text-[10px] text-ink/60 font-bold uppercase tracking-wider text-left leading-none">YOU</div>
                      )}
                    </div>

                    {/* Host Badge - Stamped look */}
                    {player.isHost && (
                      <div className="border border-ink-red text-ink-red text-[10px] font-bold px-1.5 py-0.5 transform -rotate-12 opacity-80 mix-blend-multiply bg-transparent shrink-0">
                        {t.handler}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Settings (Clipboard Style) */}
        <div className="md:col-span-5 lg:col-span-4 space-y-6">
          <div className="bg-paper p-6 rounded-sm shadow-2xl border-t-8 border-ink/50 relative min-h-[500px]">
             {/* Clipboard Clip */}
             <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-32 h-10 bg-gradient-to-b from-gray-800 to-gray-900 rounded-t-lg shadow-lg border-2 border-gray-700 flex justify-center items-center">
                <div className="w-20 h-4 bg-black/50 rounded-full" />
             </div>

             <h3 className="text-xl font-bold mb-6 mt-4 flex items-center gap-2 border-b-2 border-ink/30 pb-2 text-ink uppercase">
              <Settings className="w-5 h-5" />
              角色参数
            </h3>
            
            <div className="space-y-4 font-hand text-lg">
              {(Object.keys(room.settings.roles) as Role[]).map((role) => (
                <div key={role} className="flex items-center justify-between p-2 border-b border-ink/10 hover:bg-ink/5 transition-colors">
                  <div className="flex items-center gap-3 capitalize text-ink">
                    {ROLE_ICONS[role]}
                    <span className="font-bold">{t[`role_${role}`] || role}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {amIHost && (
                      <button 
                        onClick={() => updateRoleCount(role, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-ink/10 hover:bg-ink/20 rounded-full font-bold text-ink transition-colors"
                      >
                        -
                      </button>
                    )}
                    <span className="w-8 text-center font-typewriter font-bold text-xl text-ink">{room.settings.roles[role]}</span>
                    {amIHost && (
                      <button 
                        onClick={() => updateRoleCount(role, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-ink/10 hover:bg-ink/20 rounded-full font-bold text-ink transition-colors"
                      >
                        +
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t-2 border-ink border-dashed flex justify-between items-center">
              <span className="font-bold font-typewriter uppercase text-sm">{t.personnelCount}:</span>
              <span className={`font-typewriter text-2xl font-bold ${totalRoles === room.players.length ? "text-green-800" : "text-ink-red"}`}>
                {totalRoles} / {room.players.length}
              </span>
            </div>

            {amIHost && (
              <div className="mt-8 relative">
                {/* Signature Line */}
                <div className="absolute bottom-16 left-0 w-full border-b border-ink/30" />
                <p className="font-hand text-xs text-ink/50 mb-2">{t.authorize}</p>
                
                <button
                  onClick={handleStartGame}
                  disabled={totalRoles !== room.players.length}
                  className="w-full bg-ink text-paper py-3 font-bold text-xl hover:bg-ink-light transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest clip-path-polygon"
                >
                  <Play className="w-5 h-5" />
                  {t.execute}
                </button>
              </div>
            )}
            
            {!amIHost && (
              <div className="mt-8 text-center">
                <div className="inline-block border-4 border-ink px-4 py-2 font-typewriter font-bold text-ink uppercase transform -rotate-6 opacity-70">
                  {t.awaitingOrders}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Room;
