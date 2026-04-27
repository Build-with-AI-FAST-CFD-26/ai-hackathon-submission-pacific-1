"use client";

import { useEffect, useRef } from "react";
import { Brain, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { SyncInput } from "./SyncInput";
import { SyncMessage } from "./SyncMessage";
import { useChatStore } from "@/store/useChatStore";
import type { ChatMessage } from "@/types/sync";

export function SyncChat() {
  const { messages, isLoading, addMessage, setLoading } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (content: string) => {
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: trimmedContent,
    };

    addMessage(userMessage);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedContent }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { message: ChatMessage };
      addMessage(payload.message);
    } catch (error) {
      console.error(error);
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I hit a backend issue while searching the workspace. The API foundation is in place, but I need the server or credentials fixed before I can answer reliably.",
      });
      toast.error("Sync could not answer that yet.", {
        description: "The backend route is reachable, but the request did not complete cleanly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-sync-blue/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-sync-blue" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">Ask Sync</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-elevated border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-status-resolved" />
            <span className="text-[10px] font-mono text-text-secondary uppercase">
              Backend Search Ready
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden relative">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto custom-scrollbar pt-4 pb-[18rem] md:pb-[15rem]"
          style={{ scrollPaddingBottom: "15rem" }}
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <SyncMessage
                key={message.id}
                role={message.role}
                content={message.content}
                sources={message.sources}
              />
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 px-4 py-8 max-w-4xl mx-auto"
            >
              <div className="w-8 h-8 rounded-lg bg-sync-blue flex items-center justify-center shrink-0 animate-pulse">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <div className="w-1.5 h-1.5 bg-sync-blue rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-sync-blue rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-sync-blue rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}

          <div aria-hidden className="h-24" />
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-background via-background/85 to-transparent pointer-events-none z-10" />
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20">
        <SyncInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
}
