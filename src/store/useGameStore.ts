import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ClientRoomState, Player } from '../types';
import { Language } from '../lib/i18n';

interface UserState {
  nickname: string;
  avatar: string;
  language: Language;
  setNickname: (name: string) => void;
  setAvatar: (avatar: string) => void;
  setLanguage: (lang: Language) => void;
}

interface GameStoreState extends UserState {
  room: ClientRoomState | null;
  setRoom: (room: ClientRoomState | null) => void;
  updateRoom: (room: ClientRoomState) => void;
  reset: () => void;
}

export const useGameStore = create<GameStoreState>()(
  persist(
    (set) => ({
      nickname: '',
      avatar: 'avatar1',
      language: 'zh', // Default to Chinese as per context
      room: null,

      setNickname: (nickname) => set({ nickname }),
      setAvatar: (avatar) => set({ avatar }),
      setLanguage: (language) => set({ language }),
      setRoom: (room) => set({ room }),
      updateRoom: (room) => set({ room }),
      reset: () => set({ room: null }),
    }),
    {
      name: 'werewolf-storage',
      partialize: (state) => ({ nickname: state.nickname, avatar: state.avatar, language: state.language }), // Only persist user info
    }
  )
);
