"use client";

import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Brain, User, Copy, ThumbsUp, ThumbsDown, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon } from "@/components/shared/SourceIcon";
import type { Citation } from "@/types/sync";

interface SyncMessageProps {
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
}

export function SyncMessage({ role, content, sources }: SyncMessageProps) {
  const isAssistant = role === "assistant";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-4 px-4 py-8 max-w-4xl mx-auto",
        isAssistant ? "bg-transparent" : "bg-elevated/30 rounded-3xl"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
        isAssistant ? "bg-sync-blue shadow-[0_0_10px_rgba(79,142,247,0.4)]" : "bg-sync-indigo/20 text-sync-indigo"
      )}>
        {isAssistant ? <Brain className="w-5 h-5 text-white" /> : <User className="w-5 h-5" />}
      </div>

      {/* Content */}
      <div className="flex-1 space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-widest text-text-muted font-bold">
            {isAssistant ? "Sync AI" : "You"}
          </span>
          <div className="flex items-center gap-2">
            <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
              <Copy className="w-4 h-4" />
            </button>
            {isAssistant && (
              <>
                <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                  <ThumbsDown className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className={cn(
          "prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-surface prose-pre:border prose-pre:border-border",
          isAssistant ? "text-text-primary" : "text-text-primary font-medium"
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>

        {/* Sources */}
        {isAssistant && sources && sources.length > 0 && (
          <div className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-sync-blue">
              <Link2 className="w-3 h-3" />
              Verified Sources
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sources.map((source, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-xl bg-surface border border-border hover:border-sync-blue/30 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SourceIcon type={source.platform} size="sm" className="p-1 rounded-md" />
                      <span className="text-xs font-bold text-text-primary truncate">{source.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-text-muted uppercase">{source.date}</span>
                  </div>
                  <p className="text-[11px] text-text-secondary line-clamp-2 italic leading-relaxed">
                    "{source.snippet}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
