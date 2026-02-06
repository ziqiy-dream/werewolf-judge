
import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getSocket } from '../hooks/useSocket';
import { Avatar } from '../components/Avatar';
import { Shield, Skull, Moon, Sun, Eye, X, FileText, Volume2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Role, NightAction } from '../types';
import { translations } from '../lib/i18n';

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  werewolf: "Eliminate the villagers without being detected. Work with your pack.",
  villager: "Find the werewolves and vote them out during the day.",
  seer: "Use your sight to reveal the true identity of one player each night.",
  witch: "You have one potion to save a life and one to take it.",
  hunter: "If you die, you can take someone down with you.",
  guard: "Protect one player from a werewolf attack each night."
};

const Game = () => {
  const { room, nickname, language } = useGameStore();
  const socket = getSocket();
  const [showRoleCard, setShowRoleCard] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [actionPerformed, setActionPerformed] = useState(false);
  const [audioTesting, setAudioTesting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSeerModalOpen, setIsSeerModalOpen] = useState(false);
  const [isDayResultOpen, setIsDayResultOpen] = useState(false);
  const t = translations[language];

  if (!room) return null;

  console.log('[Game] Render Start', { roomId: room.id, myRole: room.myRole, language });

  // Add safe fallback for myRole to prevent crash
  // Ensure we have a valid string, even if myRole is undefined/null
  const safeMyRole = room.myRole || 'villager';
  // Also guard against potential role mismatch if backend sends invalid role string
  const roleKey = `role_${safeMyRole}` as keyof typeof t;
  if (!t) {
      console.error('[Game] Translation object missing for language:', language);
      return <div>Error: Language Pack Missing</div>;
  }
  const roleName = t[roleKey] || safeMyRole;
  
  const currentPhase = room.gameState.phase;
  const nightPhase = room.gameState.nightPhase;
  const isHost = room.players.find(p => p.id === socket.id)?.isHost;
  
  const seerResult = room.gameState.seerResult;
  const lastNightDeaths = room.gameState.deadPlayers?.find(d => d.day === room.gameState.dayCount);

  // Debug Logging
  useEffect(() => {
    console.log('[Game] Mounted/Updated', {
      roomId: room.id,
      phase: room.gameState.phase,
      myRole: room.myRole,
      showRoleCard
    });
  }, [room, showRoleCard]);

  // Handle Seer Result Modal Visibility
  useEffect(() => {
    if (seerResult) {
      setIsSeerModalOpen(true);
    } else {
      setIsSeerModalOpen(false);
    }
  }, [seerResult]);

  // Handle Day Result Modal Visibility
  useEffect(() => {
    if (currentPhase === 'day' && lastNightDeaths) {
        setIsDayResultOpen(true);
    } else {
        setIsDayResultOpen(false);
    }
  }, [currentPhase, lastNightDeaths]);

  const closeSeerModal = () => {
    setIsSeerModalOpen(false);
    setActionPerformed(true);
  };
  
  const closeDayResultModal = () => {
      setIsDayResultOpen(false);
  };
  
  // Determine if it's my turn
  const isMyTurn = currentPhase === 'night' && (
      (nightPhase === 'werewolf' && safeMyRole === 'werewolf') ||
      (nightPhase === 'seer' && safeMyRole === 'seer') ||
      (nightPhase === 'witch' && safeMyRole === 'witch') ||
      (nightPhase === 'guard' && safeMyRole === 'guard')
  );

  const canSelect = isMyTurn && !actionPerformed;

  // Timer Logic
  useEffect(() => {
    const updateTimer = () => {
        if (room.gameState.phaseDuration === 0) {
            setTimeLeft(0);
            return;
        }
        const end = room.gameState.phaseStartTime + room.gameState.phaseDuration * 1000;
        const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room.gameState.phaseStartTime, room.gameState.phaseDuration]);

  // Reset local state on phase change
  useEffect(() => {
      setActionPerformed(false);
      setSelectedPlayerId(null);
  }, [room.gameState.phase, room.gameState.nightPhase]);

  // Audio Logic using SpeechSynthesis
  useEffect(() => {
      if (!isHost) return;

      const speak = (text: string) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = language === 'zh' ? 'zh-CN' : 'en-US';
          window.speechSynthesis.speak(utterance);
      };

      if (currentPhase === 'setup') {
          // Manual trigger
      } else if (currentPhase === 'night') {
          if (nightPhase === 'closing') speak(language === 'zh' ? "天黑请闭眼" : "Night falls, close your eyes.");
          else if (nightPhase === 'werewolf') speak(language === 'zh' ? "狼人请睁眼，请选择要击杀的目标" : "Werewolves, open your eyes and choose a target.");
          else if (nightPhase === 'seer') speak(language === 'zh' ? "预言家请睁眼，请选择要查验的目标" : "Seer, open your eyes and check a player.");
          else if (nightPhase === 'witch') speak(language === 'zh' ? "女巫请睁眼，今晚他死了，你要救吗？" : "Witch, open your eyes. This player died, will you save them?");
          else if (nightPhase === 'guard') speak(language === 'zh' ? "守卫请睁眼，请选择要守护的目标" : "Guard, open your eyes and protect someone.");
      } else if (currentPhase === 'day') {
           // Dynamic Day Announcement
           let text = language === 'zh' ? "天亮了，昨晚平安夜" : "Day breaks. Last night was peaceful.";
           if (lastNightDeaths && lastNightDeaths.playerIds.length > 0) {
               const deadNames = lastNightDeaths.playerIds.map(id => room.players.find(p => p.id === id)?.nickname).filter(Boolean).join(", ");
               text = language === 'zh' ? `天亮了，昨晚 ${deadNames} 死亡` : `Day breaks. Last night ${deadNames} died.`;
           }
           speak(text);
      }
  }, [currentPhase, nightPhase, isHost, language, lastNightDeaths]);


  const handleAction = (actionType: NightAction['actionType']) => {
      // safeMyRole is always defined, but we check anyway if logic requires it
      if (!safeMyRole) return;
      
      const action: NightAction = {
          playerId: socket.id,
          targetId: selectedPlayerId || undefined,
          actionType
      };
      
      socket.emit('game_action', { roomId: room.id, action });
      setActionPerformed(true);
  };

  const handleNextPhase = () => {
      socket.emit('next_phase', { roomId: room.id });
  };

  const playAudioTest = () => {
      setAudioTesting(true);
      const text = language === 'zh' ? "语音助手已启动" : "Voice assistant started";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'zh' ? 'zh-CN' : 'en-US';
      utterance.onend = () => setAudioTesting(false);
      window.speechSynthesis.speak(utterance);
  };

  // Seer Result Modal (Moved up logic)
  // const seerResult = room.gameState.seerResult; // Already defined above

  // Witch Logic: Get victim ID
  const witchVictimId = room.gameState.currentWolfTarget;
  const witchVictim = witchVictimId ? room.players.find(p => p.id === witchVictimId) : null;
  // Poison logic: Witch can poison anyone EXCEPT the victim they are saving (or no restriction? Rules vary. Usually can poison anyone).
  // Standard rule: Witch cannot use both potions in same night.
  // Our implementation: If healed, can't poison.
  // But wait, the UI allows clicking both if buttons are enabled.
  // We need to check if 'heal' action was performed in this turn?
  // Actually, handleAction sets actionPerformed=true, so they can only do ONE thing per night.
  // So the disable logic for Poison button should be: disabled={!selectedPlayerId}
  // That seems correct in current code. 
  // Wait, user said "Poison button invalid".
  // Check if selectedPlayerId is set when clicking a player.
  // Player selection sets `selectedPlayerId`.
  // If I click a player, `selectedPlayerId` becomes their ID.
  // Then Poison button `disabled={!selectedPlayerId}` becomes false (enabled).
  // Is there any other condition?
  // Maybe `canSelect` is false?
  // `canSelect = isMyTurn && !actionPerformed`
  
  // Ah, the user might be trying to poison the person who was KILLED by wolves?
  // If so, `selectedPlayerId` needs to be set to that person.
  // But usually Witch poisons ANOTHER person.
  // If Witch wants to poison the victim (why?), they select them.
  
  // Let's look at the UI code for Poison button:
  /*
    <button 
        onClick={() => handleAction('poison')}
        disabled={!selectedPlayerId}
        className="..."
    >
        {t.action_poison}
    </button>
  */
  
  console.log('[Game] Render End', { safeMyRole, roleName, isMyTurn, canSelect, selectedPlayerId });

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden font-typewriter">
      {/* Background handled by body */}

      {/* Seer Result Modal */}
      {seerResult && isSeerModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
             <div className="bg-paper p-8 border-4 border-ink relative max-w-sm w-full text-center shadow-2xl">
                 <h2 className="text-3xl font-bold mb-4 font-typewriter uppercase border-b-2 border-ink pb-2">Identity Verified</h2>
                 <div className="my-6">
                     <p className="text-xl mb-2">Subject: <span className="font-bold">{seerResult.nickname}</span></p>
                     <p className="text-4xl font-bold font-hand transform -rotate-2 mt-4">
                         {seerResult.isWerewolf ? 
                             <span className="text-ink-red border-4 border-ink-red px-4 py-2 inline-block">WEREWOLF</span> : 
                             <div className="flex flex-col items-center">
                                <span className="text-green-800 border-4 border-green-800 px-4 py-2 inline-block">GOOD SIDE</span>
                             </div>
                         }
                     </p>
                 </div>
                 <p className="text-xs text-ink/50 mb-6">CONFIDENTIAL - EYES ONLY</p>
                 <button 
                     onClick={closeSeerModal} 
                     className="w-full bg-ink text-paper py-3 font-bold uppercase"
                 >
                     CLOSE FILE
                 </button>
             </div>
          </div>
      )}

      {/* Day Result Modal */}
      {isDayResultOpen && lastNightDeaths && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-300">
             <div className="bg-paper p-8 border-4 border-ink relative max-w-lg w-full text-center shadow-2xl transform rotate-1">
                 <h2 className="text-3xl font-bold mb-6 font-typewriter uppercase border-b-2 border-ink pb-2">Morning Report</h2>
                 
                 <div className="my-8">
                     {lastNightDeaths.playerIds.length === 0 ? (
                         <div className="text-green-800">
                             <Sun className="w-16 h-16 mx-auto mb-4" />
                             <p className="text-2xl font-bold font-hand">Peaceful Night</p>
                             <p className="text-ink/70 mt-2">No casualties reported.</p>
                         </div>
                     ) : (
                         <div className="text-ink-red">
                             <Skull className="w-16 h-16 mx-auto mb-4" />
                             <p className="text-2xl font-bold font-hand mb-4">Casualties Reported:</p>
                             <div className="flex flex-wrap gap-4 justify-center">
                                 {lastNightDeaths.playerIds.map(id => {
                                     const p = room.players.find(pl => pl.id === id);
                                     return (
                                         <div key={id} className="flex flex-col items-center">
                                             <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-ink-red mb-2 grayscale">
                                                 <Avatar seed={p?.avatar || 'dead'} size={64} />
                                             </div>
                                             <span className="font-bold text-lg">{p?.nickname || 'Unknown'}</span>
                                         </div>
                                     );
                                 })}
                             </div>
                         </div>
                     )}
                 </div>

                 <button 
                     onClick={closeDayResultModal} 
                     className="w-full bg-ink text-paper py-3 font-bold uppercase hover:bg-ink-light transition-colors"
                 >
                     ACKNOWLEDGE
                 </button>
             </div>
          </div>
      )}

      {/* Role Card Modal */}
      {showRoleCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-500">
          <div className="max-w-md w-full relative group perspective-1000">
             {/* Folder Tab */}
             <div className="absolute -top-8 left-0 w-1/3 h-10 bg-[#d6d2c4] rounded-t-lg border-t-2 border-l-2 border-r-2 border-ink transform skew-x-6 origin-bottom-left z-0" />
             
             {/* Main Folder Body */}
             <div className="bg-paper bg-paper-texture p-8 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-ink relative transform rotate-1 transition-transform group-hover:rotate-0 z-10">
                <button 
                  onClick={() => setShowRoleCard(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-ink/10 rounded-full z-20"
                >
                  <X className="w-6 h-6 text-ink" />
                </button>
                
                <div className="absolute top-0 -left-4 border-4 border-ink-red text-ink-red px-6 py-2 text-2xl font-bold opacity-90 transform -rotate-12 mix-blend-multiply mask-image-grunge">
                  TOP SECRET
                </div>

                <div className="mt-12 text-center space-y-8">
                  <div className="w-40 h-40 mx-auto bg-white p-2 shadow-lg transform rotate-2 border border-gray-300">
                    <div className="w-full h-full bg-ink/10 flex items-center justify-center border border-gray-200 overflow-hidden relative">
                      <img 
                        src={`/roles/${safeMyRole}.png`} 
                        alt={safeMyRole}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement?.querySelector('span')?.classList.remove('hidden');
                        }}
                        className="w-full h-full object-cover relative z-10"
                      />
                      <span className="text-6xl capitalize font-bold text-ink opacity-20 hidden absolute">{safeMyRole?.[0]}</span>
                      <div className="absolute inset-0 opacity-10 bg-[url('/noise.png')] mix-blend-overlay"></div>
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-4xl font-bold mb-2 uppercase text-ink tracking-widest border-b-2 border-ink inline-block pb-1">
                      {roleName}
                    </h2>
                    <p className="font-hand text-2xl text-ink-blue mt-4 italic">
                      "{ROLE_DESCRIPTIONS[safeMyRole || 'villager']}"
                    </p>
                  </div>

                  <div className="pt-6 border-t-2 border-dashed border-ink text-xs text-ink/60 flex justify-between items-end font-sans">
                    <span>CASE ID: {room.id}</span>
                    <span>CONFIDENTIALITY LEVEL: MAX</span>
                  </div>
                  
                  <button 
                     onClick={() => setShowRoleCard(false)}
                     className="w-full bg-ink text-paper py-3 font-bold uppercase tracking-widest hover:bg-ink-light transition-colors mt-4"
                  >
                    Acknowledge & Burn
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1a1816] border-b border-ink/30 text-paper p-4 shadow-lg z-10 flex flex-wrap justify-between items-center relative gap-4">
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex flex-col">
            <span className="text-xs text-paper-light uppercase tracking-widest font-bold">Timeline</span>
            <span className="font-typewriter font-bold text-2xl text-paper-light">DAY {room.gameState.dayCount}</span>
          </div>
          
          <div className="h-8 w-px bg-white/20 hidden sm:block" />
          
          <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded border border-white/10">
             {room.gameState.phase === 'night' ? <Moon className="w-5 h-5 text-purple-400" /> : <Sun className="w-5 h-5 text-orange-400" />}
             <span className="uppercase tracking-wider font-bold text-paper-light">
                 {currentPhase === 'setup' ? t.phase_setup : 
                  currentPhase === 'night' ? t[`night_${nightPhase}`] || t.phase_night : 
                  t.phase_day}
             </span>
          </div>

          {/* Timer Display */}
          {timeLeft > 0 && (
             <div className="flex items-center gap-2 text-ink-red animate-pulse font-bold text-xl ml-4">
                 <Clock className="w-5 h-5" />
                 {timeLeft}s
             </div>
          )}
        </div>
        
        <button 
          onClick={() => setShowRoleCard(true)}
          className="flex items-center gap-2 text-sm border border-paper px-4 py-2 rounded hover:bg-paper/10 transition-colors uppercase tracking-wider text-paper-light"
        >
          <FileText className="w-4 h-4" />
          View Dossier
        </button>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-8 overflow-y-auto relative transition-colors duration-1000",
        currentPhase === 'night' ? "bg-transparent" : "bg-[#e6e2d3]"
      )}>
        <div className={cn(
            "absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')]",
            currentPhase === 'night' ? "opacity-10" : "opacity-30 mix-blend-multiply"
        )}></div>

        {/* Witch's Info Panel */}
        {isMyTurn && safeMyRole === 'witch' && (
            <div className="max-w-md mx-auto mb-8 bg-paper-light p-4 shadow-lg border-2 border-purple-800 text-center">
                <h3 className="font-bold text-purple-900 mb-2">DEATH REPORT</h3>
                {witchVictim ? (
                    <div className="text-xl text-ink-red font-hand">
                        <span className="font-bold">{witchVictim.nickname}</span> was attacked tonight!
                    </div>
                ) : (
                    <div className="text-xl text-green-800 font-hand">
                        No one was attacked tonight.
                    </div>
                )}
            </div>
        )}

        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {room.players.map((player) => (
            <div 
              key={player.id} 
              onClick={() => canSelect && setSelectedPlayerId(player.id)}
              className={cn(
                "relative transition-all duration-300 group perspective-500",
                !player.isAlive && "grayscale opacity-70",
                canSelect && "cursor-pointer hover:scale-105",
                selectedPlayerId === player.id && "ring-4 ring-ink-red scale-105"
              )}
            >
              <div className="bg-paper p-2 pb-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.3)] transform rotate-1 group-hover:rotate-0 group-hover:scale-105 group-hover:shadow-2xl transition-all duration-300 border border-ink/20 relative flex flex-col items-center">
                
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 filter drop-shadow-md">
                   <div className="w-3 h-3 rounded-full bg-red-800 border border-black/50" />
                   <div className="w-0.5 h-2 bg-gray-400 mx-auto -mt-0.5" />
                </div>

                <div className="w-full aspect-square mb-2 relative overflow-hidden flex items-center justify-center p-2">
                  <Avatar seed={player.avatar} size={120} className="w-full h-full object-cover filter contrast-125 sepia-[0.3]" />
                  
                  {/* Death Overlay */}
                  {!player.isAlive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                      <span className="border-4 border-red-800 text-red-800 font-bold text-xl px-2 py-1 transform -rotate-45 mix-blend-hard-light bg-paper/20 backdrop-blur-sm">
                        DECEASED
                      </span>
                    </div>
                  )}

                  {/* Role Specific Indicators */}
                  {safeMyRole === 'werewolf' && player.role === 'werewolf' && player.id !== socket.id && (
                      <div className="absolute top-0 right-0 bg-ink-red text-white text-xs px-2 py-1">ALLY</div>
                  )}
                </div>

                <div className="text-center relative w-full px-1">
                  <div className="font-hand text-xl font-bold truncate text-ink transform -rotate-1 group-hover:rotate-0 transition-transform">
                    {player.nickname}
                  </div>
                  
                  {player.id === room.players.find(p => p.nickname === nickname)?.id && (
                     <div className="absolute -bottom-5 left-0 right-0 text-center">
                       <span className="bg-ink text-paper-light text-[10px] px-2 py-0.5 uppercase tracking-widest font-bold inline-block transform -rotate-2">
                         YOU
                       </span>
                     </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer / Control Panel */}
      <footer className="bg-[#1a1816] border-t-4 border-ink p-6 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 rounded-full bg-paper border-4 border-ink flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)] relative overflow-hidden group">
               <div className="absolute inset-0 bg-ink/5 group-hover:bg-transparent transition-colors" />
               <span className="text-2xl font-bold text-ink">{safeMyRole?.[0].toUpperCase()}</span>
             </div>
             
             <div>
               <div className="font-typewriter font-bold text-xl uppercase tracking-widest text-paper-light mb-1">
                 {roleName}
               </div>
               <div className="text-sm font-hand text-ink-red text-xl opacity-90 animate-pulse">
                 {isMyTurn ? "Your turn to act..." : actionPerformed ? t.status_acted : t.status_waiting}
               </div>
             </div>
          </div>
          
          <div className="flex gap-4 items-center flex-wrap">
            {/* Setup Phase */}
            {currentPhase === 'setup' && isHost && (
                <>
                    <button 
                        onClick={playAudioTest}
                        disabled={audioTesting}
                        className="bg-paper text-ink px-6 py-3 font-bold font-typewriter hover:bg-[#d6d2c4] transition-colors rounded-sm shadow-lg flex items-center gap-2"
                    >
                        <Volume2 className="w-5 h-5" />
                        {audioTesting ? t.audio_test_playing : t.audio_test}
                    </button>
                    <button 
                        onClick={handleNextPhase}
                        className="bg-ink-red text-paper px-6 py-3 font-bold font-typewriter hover:bg-red-800 transition-colors rounded-sm shadow-lg uppercase tracking-wider"
                    >
                        {t.start_game_confirm}
                    </button>
                </>
            )}

            {/* Night Actions */}
            {isMyTurn && !actionPerformed && (
                <div className="flex gap-3">
                    {safeMyRole === 'werewolf' && (
                        <button 
                            onClick={() => handleAction('kill')}
                            disabled={!selectedPlayerId}
                            className="bg-ink-red text-paper px-6 py-3 font-bold font-typewriter hover:bg-red-800 transition-colors rounded-sm shadow-lg disabled:opacity-50"
                        >
                            {t.action_kill}
                        </button>
                    )}
                    {safeMyRole === 'seer' && (
                        <button 
                            onClick={() => handleAction('check')}
                            disabled={!selectedPlayerId}
                            className="bg-purple-800 text-paper px-6 py-3 font-bold font-typewriter hover:bg-purple-900 transition-colors rounded-sm shadow-lg disabled:opacity-50"
                        >
                            {t.action_check}
                        </button>
                    )}
                    {safeMyRole === 'witch' && (
                        <>
                            <button 
                                onClick={() => handleAction('heal')}
                                disabled={!witchVictim} // Can only heal if there's a victim (or should always be able to click if they have potion?)
                                className="bg-green-800 text-paper px-6 py-3 font-bold font-typewriter hover:bg-green-900 transition-colors rounded-sm shadow-lg disabled:opacity-50"
                            >
                                {t.action_heal}
                            </button>
                            <button 
                                onClick={() => handleAction('poison')}
                                disabled={!selectedPlayerId}
                                className="bg-purple-800 text-paper px-6 py-3 font-bold font-typewriter hover:bg-purple-900 transition-colors rounded-sm shadow-lg disabled:opacity-50"
                            >
                                {t.action_poison}
                            </button>
                        </>
                    )}
                    {safeMyRole === 'guard' && (
                        <button 
                            onClick={() => handleAction('protect')}
                            disabled={!selectedPlayerId}
                            className="bg-blue-800 text-paper px-6 py-3 font-bold font-typewriter hover:bg-blue-900 transition-colors rounded-sm shadow-lg disabled:opacity-50"
                        >
                            {t.action_protect}
                        </button>
                    )}
                    <button 
                        onClick={() => handleAction('skip')}
                        className="bg-gray-600 text-paper px-6 py-3 font-bold font-typewriter hover:bg-gray-700 transition-colors rounded-sm shadow-lg"
                    >
                        {t.action_skip}
                    </button>
                </div>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Game;
