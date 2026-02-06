import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getSocket } from '../hooks/useSocket';
import { Avatar } from '../components/Avatar';
import { ChevronLeft, ChevronRight, Play, Users } from 'lucide-react';
import { cn } from '../lib/utils';

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Milo', 'Zoe', 'Jack', 'Luna', 'Leo', 'Mia', 'Max', 'Ava'];

const Home = () => {
  const { nickname, avatar, setNickname, setAvatar } = useGameStore();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const socket = getSocket();

  const handleCreate = () => {
    if (!nickname.trim()) return alert('Please enter a nickname');
    socket.emit('create_room', { nickname, avatar });
  };

  const handleJoin = () => {
    if (!nickname.trim()) return alert('Please enter a nickname');
    if (!roomIdInput.trim()) return alert('Please enter a Room ID');
    socket.emit('join_room', { nickname, avatar, roomId: roomIdInput.toUpperCase() });
  };

  const nextAvatar = () => {
    const idx = AVATAR_SEEDS.indexOf(avatar);
    setAvatar(AVATAR_SEEDS[(idx + 1) % AVATAR_SEEDS.length]);
  };

  const prevAvatar = () => {
    const idx = AVATAR_SEEDS.indexOf(avatar);
    setAvatar(AVATAR_SEEDS[(idx - 1 + AVATAR_SEEDS.length) % AVATAR_SEEDS.length]);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden relative">
      {/* Background texture overlay handled by body CSS, but we can add more atmosphere here if needed */}
      
      <div className="max-w-md w-full bg-paper bg-paper-texture p-8 shadow-2xl border-2 border-dashed border-ink relative transform rotate-1 transition-all duration-300 hover:rotate-0 hover:scale-[1.01]">
        {/* Paper Clip / Pin */}
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-ink-red shadow-md border border-ink z-20 flex items-center justify-center">
             <div className="w-2 h-2 bg-ink/50 rounded-full" />
        </div>

        {/* Top Secret Stamp */}
        <div className="absolute -top-6 -right-6 transform rotate-12 border-4 border-ink-red text-ink-red px-4 py-1 text-2xl font-typewriter font-bold opacity-80 z-10 mix-blend-multiply pointer-events-none">
          CONFIDENTIAL
        </div>

        {/* Header */}
        <div className="text-center mb-8 relative">
          <h1 className="text-4xl font-typewriter font-bold text-ink uppercase tracking-widest border-b-4 border-double border-ink pb-2 inline-block">
            Werewolf<br/>Judge
          </h1>
          <p className="font-hand text-2xl text-ink-red transform -rotate-2 mt-2 absolute -right-4 top-16 opacity-90">
            Case File #1986
          </p>
        </div>

        {/* Agent Identity Section */}
        <div className="mb-8 flex flex-col items-center relative">
          <div className="absolute top-0 left-0 w-full h-full border border-ink/10 pointer-events-none" />
          
          <label className="text-lg font-bold mb-4 font-typewriter bg-ink text-paper-dark px-2 py-1 transform -rotate-1 self-start ml-4 shadow-sm">
            SUBJECT IDENTITY
          </label>
          
          <div className="flex items-center gap-6 mb-6">
            <button onClick={prevAvatar} className="p-2 hover:bg-ink/10 rounded-full transition-colors text-ink">
              <ChevronLeft className="w-8 h-8" />
            </button>
            
            <div className="relative group">
              {/* Photo Corners */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-ink" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-ink" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-ink" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-ink" />
              
              <div className="w-32 h-32 overflow-hidden bg-ink/10 filter grayscale contrast-125 hover:filter-none transition-all duration-500 hover:scale-105 hover:rotate-1 shadow-inner">
                 <Avatar seed={avatar} size={128} className="w-full h-full object-cover" />
              </div>
            </div>

            <button onClick={nextAvatar} className="p-2 hover:bg-ink/10 rounded-full transition-colors text-ink">
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>

          <div className="w-full px-4">
             <input
              type="text"
              placeholder="ENTER CODENAME"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-[#1a1816] border-b-2 border-ink p-3 text-center font-typewriter text-xl text-paper focus:outline-none focus:border-ink-red placeholder:text-gray-600 transition-colors shadow-inner"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 border-b-2 border-ink">
          <button
            onClick={() => setActiveTab('create')}
            className={cn(
              "flex-1 py-3 font-typewriter font-bold transition-all text-lg",
              activeTab === 'create' 
                ? "bg-ink text-paper shadow-md transform -translate-y-1" 
                : "text-ink hover:bg-ink/10"
            )}
          >
            NEW CASE
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={cn(
              "flex-1 py-3 font-typewriter font-bold transition-all text-lg",
              activeTab === 'join' 
                ? "bg-ink text-paper shadow-md transform -translate-y-1" 
                : "text-ink hover:bg-ink/10"
            )}
          >
            JOIN CASE
          </button>
        </div>

        {/* Action Area */}
        <div className="min-h-[120px] space-y-4">
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <p className="text-center text-lg font-hand text-ink-blue italic">
                    {activeTab === 'create' 
                        ? "\"Initiate a new investigation. You will be the Lead Inspector.\"" 
                        : "\"Enter the Case ID to access classified files.\""}
                </p>
                
                {/* Input field is always shown but disabled in create mode */}
                <input
                    type="text"
                    placeholder={activeTab === 'create' ? "AUTO-GENERATED" : "CASE ID (e.g. X7Y9Z)"}
                    value={activeTab === 'create' ? "" : roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                    maxLength={6}
                    disabled={activeTab === 'create'}
                    className={cn(
                        "w-full border-2 border-ink border-dashed p-3 text-center font-typewriter text-2xl tracking-[0.5em] text-ink focus:outline-none uppercase placeholder:tracking-normal placeholder:text-lg transition-colors",
                        activeTab === 'create' 
                            ? "bg-gray-200/50 cursor-not-allowed opacity-50" 
                            : "bg-paper-light/10 focus:border-ink-red"
                    )}
                />

                <button
                    onClick={activeTab === 'create' ? handleCreate : handleJoin}
                    className="w-full bg-ink text-paper-dark py-4 font-typewriter font-bold text-xl hover:bg-ink/80 transition-all hover:scale-[1.02] hover:shadow-lg flex items-center justify-center gap-3 border-2 border-transparent hover:border-ink"
                >
                    {activeTab === 'create' ? (
                        <>
                            <Play className="w-6 h-6" />
                            OPEN FILE
                        </>
                    ) : (
                        <>
                            <Users className="w-6 h-6" />
                            ACCESS FILE
                        </>
                    )}
                </button>
            </div>
        </div>
      </div>
      
      {/* Footer / Copyright style */}
      <div className="mt-8 text-white/20 font-typewriter text-xs text-center">
        CONFIDENTIAL MATERIAL • DO NOT DISTRIBUTE • {new Date().getFullYear()}
      </div>
    </div>
  );
};

export default Home;
