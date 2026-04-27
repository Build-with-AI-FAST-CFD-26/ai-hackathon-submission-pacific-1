"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Filter, Search, ExternalLink, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SourceIcon } from "@/components/shared/SourceIcon";
import { formatRelativeTime } from "@/lib/format";
import type { MemoryItem } from "@/types/sync";

export function SyncMemory() {
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let isDisposed = false;

    const loadMemoryFeed = async () => {
      try {
        const response = await fetch("/api/memory", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Memory request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as { items: MemoryItem[] };
        if (!isDisposed) {
          setMemoryItems(payload.items);
        }
      } catch (error) {
        console.error("Failed to load memory feed", error);
      }
    };

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === "visible") {
        loadMemoryFeed().catch((error) => console.error("Failed to refresh memory feed", error));
      }
    };

    loadMemoryFeed().catch((error) => console.error("Failed to load memory feed", error));
    const refreshInterval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadMemoryFeed().catch((error) => console.error("Failed to refresh memory feed", error));
      }
    }, 30000);

    window.addEventListener("focus", handleVisibilityRefresh);
    document.addEventListener("visibilitychange", handleVisibilityRefresh);

    return () => {
      isDisposed = true;
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", handleVisibilityRefresh);
      document.removeEventListener("visibilitychange", handleVisibilityRefresh);
    };
  }, []);

  const filteredMemory = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return memoryItems;
    }

    return memoryItems.filter((item) =>
      [item.title, item.content, item.author, item.sourceLabel, item.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [memoryItems, search]);

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-sync-blue" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">
            Memory Feed
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search history..."
              className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-sync-blue/50 transition-colors w-64"
            />
          </div>
          <button className="p-2 bg-surface border border-border rounded-lg text-text-secondary hover:text-text-primary transition-colors">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-[0.2em] text-text-muted pb-2">
            <div className="flex-1 h-px bg-border" />
            Indexed Memory
            <div className="flex-1 h-px bg-border" />
          </div>

          {filteredMemory.length > 0 ? (
            filteredMemory.map((item, idx) => (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                key={item.id}
                className="group relative pl-8 pb-8 last:pb-0"
              >
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-border group-last:bottom-auto group-last:h-4" />

                <div
                  className={cn(
                    "absolute left-0 top-0 w-6 h-6 rounded-full border-4 border-background flex items-center justify-center z-10 overflow-hidden",
                    item.platform === "slack"
                      ? "bg-[#4A154B]"
                      : item.platform === "notion"
                        ? "bg-white"
                        : item.platform === "github"
                          ? "bg-[#333333]"
                          : "bg-[#EA4335]",
                  )}
                >
                  <SourceIcon
                    type={item.platform}
                    size="sm"
                    className="border-0 p-0 bg-transparent shadow-none"
                  />
                </div>

                <div className="bg-surface border border-border hover:border-sync-blue/30 rounded-2xl p-5 transition-all duration-300 hover:shadow-[0_0_20px_rgba(79,142,247,0.05)]">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-1 flex items-center gap-2">
                        {item.title}
                        <ExternalLink className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="font-mono text-sync-blue">{item.sourceLabel}</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted" />
                        <span>{item.author}</span>
                        <span className="w-1 h-1 rounded-full bg-text-muted" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-text-secondary text-sm leading-relaxed mb-4">{item.content}</p>

                  <div className="flex items-center gap-2">
                    {item.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-elevated border border-border text-[10px] font-bold uppercase tracking-wider text-text-muted"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-border bg-surface/50 p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated text-sync-blue">
                <Link2 className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-text-primary">No memory indexed yet</h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                Once you connect a source and run ingestion, recent conversations, documents, and
                tasks will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
