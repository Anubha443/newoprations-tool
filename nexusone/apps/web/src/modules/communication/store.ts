import { create } from 'zustand';
import { PresenceMap } from './types';

interface CommState {
  activeChannelId?: number;
  activeTopic?: string;
  drafts: Record<string, string>;
  presence: PresenceMap;
  notificationsOpen: boolean;
  setActiveChannel: (id?: number) => void;
  setActiveTopic: (topic?: string) => void;
  setDraft: (key: string, value: string) => void;
  setPresence: (p: PresenceMap) => void;
  setNotificationsOpen: (v: boolean) => void;
}

export const useCommStore = create<CommState>((set) => ({
  drafts: {}, presence: {}, notificationsOpen: false,
  setActiveChannel: (id) => set({ activeChannelId: id }),
  setActiveTopic: (topic) => set({ activeTopic: topic }),
  setDraft: (key, value) => set((s) => ({ drafts: { ...s.drafts, [key]: value } })),
  setPresence: (presence) => set({ presence }),
  setNotificationsOpen: (notificationsOpen) => set({ notificationsOpen }),
}));
