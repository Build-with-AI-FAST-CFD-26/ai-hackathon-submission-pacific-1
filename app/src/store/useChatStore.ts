import { create } from "zustand";
import type { ChatMessage } from "@/types/sync";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setLoading: (loading: boolean) => void;
  clearMessages: () => void;
}

const initialAssistantMessage: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello, I'm **Sync**. Connect your workspace sources, then ask me about recent conversations, tasks, decisions, or team activity.",
};

export const useChatStore = create<ChatState>((set) => ({
  messages: [initialAssistantMessage],
  isLoading: false,
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  clearMessages: () => set({ messages: [initialAssistantMessage], isLoading: false }),
}));
