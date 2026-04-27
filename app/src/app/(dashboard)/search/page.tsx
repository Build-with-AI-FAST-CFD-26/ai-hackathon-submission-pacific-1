"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, ChevronRight, Sparkles, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { SourceIcon } from "@/components/shared/SourceIcon";
import { formatRelativeTime } from "@/lib/format";
import type { MemoryItem, SourcePlatform } from "@/types/sync";

const searchFilters = ["All", "Slack", "Notion", "Gmail", "GitHub", "WhatsApp"] as const;

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] =
    useState<(typeof searchFilters)[number]>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const filteredResults = useMemo(() => {
    if (activeFilter === "All") {
      return results;
    }

    return results.filter(
      (result) => result.platform === activeFilter.toLowerCase() as SourcePlatform,
    );
  }, [activeFilter, results]);

  const handleSearch = async (event?: React.FormEvent, forcedQuery?: string) => {
    event?.preventDefault();
    const normalizedQuery = (forcedQuery ?? query).trim();
    if (!normalizedQuery) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/memory?query=${encodeURIComponent(normalizedQuery)}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(`Search failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { items: MemoryItem[] };
      setResults(payload.items);
      setQuery(normalizedQuery);
    } catch (error) {
      console.error("Workspace search failed", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-8 border-b border-border bg-surface/30 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-sync-blue to-sync-indigo rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your indexed workspace..."
              className="w-full bg-surface border border-border group-focus-within:border-sync-blue/50 rounded-2xl py-6 pl-14 pr-6 text-xl text-text-primary placeholder:text-text-muted outline-none transition-all"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-text-muted group-focus-within:text-sync-blue transition-colors" />

            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex items-center gap-2",
                    showFilters
                      ? "bg-sync-blue text-white"
                      : "text-text-muted hover:text-text-primary bg-elevated",
                  )}
                >
                  <Filter className="w-4 h-4" />
                  {activeFilter !== "All" && (
                    <span className="text-[10px] font-bold uppercase">{activeFilter}</span>
                  )}
                </button>

                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-2xl z-50 p-2 overflow-hidden"
                    >
                      {searchFilters.map((filter) => (
                        <button
                          key={filter}
                          onClick={() => {
                            setActiveFilter(filter);
                            setShowFilters(false);
                          }}
                          className={cn(
                            "w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-between",
                            activeFilter === filter
                              ? "bg-sync-blue/10 text-sync-blue"
                              : "text-text-secondary hover:bg-elevated",
                          )}
                        >
                          {filter}
                          {activeFilter === filter && (
                            <div className="w-1.5 h-1.5 rounded-full bg-sync-blue" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-text-muted">
                <Sparkles className="w-3.5 h-3.5 text-sync-blue" />
                Live Workspace Search
              </div>
              <div className="flex flex-wrap gap-2">
                {searchFilters.map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all border",
                      activeFilter === filter
                        ? "bg-sync-blue text-white border-sync-blue shadow-[0_0_15px_rgba(79,142,247,0.3)]"
                        : "text-text-muted border-border hover:border-text-muted",
                    )}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mr-2 self-center">
                Suggestions:
              </span>
              {[
                "recent customer conversation",
                "my last task",
                "latest slack discussion",
                "recent engineering decision",
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => handleSearch(undefined, suggestion)}
                  className="px-3 py-1 rounded-full bg-elevated border border-border text-[10px] font-bold text-text-muted hover:text-sync-blue hover:border-sync-blue/50 transition-all uppercase tracking-wider"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-20"
              >
                <div className="w-12 h-12 border-4 border-sync-blue/20 border-t-sync-blue rounded-full animate-spin mb-4" />
                <p className="text-text-secondary font-mono text-xs uppercase tracking-[0.2em]">
                  Searching Workspace...
                </p>
              </motion.div>
            ) : hasSearched ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <p className="text-sm text-text-secondary mb-6 flex items-center justify-between">
                  <span>
                    Found {filteredResults.length} indexed results for "{query}" in{" "}
                    <span className="text-text-primary font-bold">{activeFilter}</span>
                  </span>
                  <span className="text-[10px] font-mono text-text-muted uppercase">
                    {results.length} total matches
                  </span>
                </p>

                {filteredResults.length > 0 ? (
                  filteredResults.map((result, idx) => (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={result.id}
                      className="p-6 bg-surface border border-border rounded-2xl hover:border-sync-blue/30 transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-sync-blue opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <SourceIcon type={result.platform} size="md" className="shadow-none" />
                          <div>
                            <h3 className="font-bold text-text-primary group-hover:text-sync-blue transition-colors">
                              {result.title}
                            </h3>
                            <p className="text-xs text-text-muted">
                              {result.sourceLabel} • {result.author}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-text-muted uppercase">
                          {formatRelativeTime(result.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {result.content}
                      </p>
                    </motion.div>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-border bg-surface/50 p-10 text-center text-text-muted">
                    No indexed results matched this query yet. Connect sources and let Sync ingest
                    more workspace activity.
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-40 text-center">
                <div className="w-20 h-20 bg-surface border border-border rounded-full flex items-center justify-center mb-8 shadow-xl">
                  <Link2 className="w-8 h-8 text-sync-blue" />
                </div>
                <h2 className="text-2xl font-bold text-text-primary mb-4">
                  Search Your Real Workspace
                </h2>
                <p className="text-text-secondary max-w-md mx-auto leading-relaxed">
                  Sync only searches indexed records now. Connect Slack, Gmail, Notion, or GitHub,
                  then ask about recent talks, tasks, members, or customer context.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
