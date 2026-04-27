import { create } from 'zustand';

interface SyncState {
  isSidebarCollapsed: boolean;
  connectedSources: string[];
  lastSyncTime: string | null;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addConnectedSource: (source: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSidebarCollapsed: false,
  connectedSources: ["slack", "gmail", "notion"],
  lastSyncTime: "2 mins ago",
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
  addConnectedSource: (source) => set((state) => ({ 
    connectedSources: state.connectedSources.includes(source) 
      ? state.connectedSources 
      : [...state.connectedSources, source] 
  })),
}));
