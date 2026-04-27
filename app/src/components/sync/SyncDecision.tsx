"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FileCheck,
  Search,
  Calendar,
  User,
  Tag,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/format";
import type { DecisionItem } from "@/types/sync";

export function SyncDecision() {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/decisions", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { decisions: DecisionItem[] }) => setDecisions(payload.decisions))
      .catch((error) => console.error("Failed to load decisions", error));
  }, []);

  const filteredDecisions = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return decisions;
    }

    return decisions.filter((decision) =>
      [decision.title, decision.rationale, decision.decidedBy, decision.context, decision.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [decisions, search]);

  const resolvedCount = decisions.filter((decision) => decision.status === "resolved").length;
  const pendingCount = decisions.filter((decision) => decision.status === "pending").length;

  return (
    <div className="flex flex-col h-full bg-background">
      <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-background/50 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <FileCheck className="w-5 h-5 text-sync-blue" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-text-primary">
            Decision Log
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
            <CheckCircle2 className="w-4 h-4 text-status-resolved" />
            <span className="text-xs font-bold text-text-primary">{resolvedCount} Resolved</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-lg">
            <Clock className="w-4 h-4 text-status-pending" />
            <span className="text-xs font-bold text-text-primary">{pendingCount} Pending</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-text-primary">Recent Decisions</h1>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search decisions..."
                  className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary outline-none focus:border-sync-blue/50 w-64"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredDecisions.length > 0 ? (
              filteredDecisions.map((decision, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={decision.id}
                  className="bg-surface border border-border hover:border-sync-blue/30 rounded-2xl p-6 transition-all group relative"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={cn(
                        "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border",
                        decision.status === "resolved"
                          ? "bg-status-resolved/10 text-status-resolved border-status-resolved/20"
                          : "bg-status-pending/10 text-status-pending border-status-pending/20",
                      )}
                    >
                      {decision.status}
                    </div>
                    <button className="text-text-muted hover:text-text-primary">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-xl font-bold text-text-primary mb-3 leading-tight group-hover:text-sync-blue transition-colors">
                    {decision.title}
                  </h3>

                  <p className="text-text-secondary text-sm leading-relaxed mb-6 italic">
                    "{decision.rationale}"
                  </p>

                  <div className="space-y-3 pt-6 border-t border-border">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-text-muted">
                        <User className="w-3.5 h-3.5" />
                        <span>
                          Decided by{" "}
                          <span className="text-text-primary font-bold">{decision.decidedBy}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-text-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDisplayDate(decision.decidedAt)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-text-muted">
                        <Tag className="w-3.5 h-3.5" />
                        <div className="flex gap-1">
                          {decision.tags.map((tag) => (
                            <span key={tag} className="text-text-primary">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button className="flex items-center gap-1 text-sync-blue font-bold group/btn">
                        View Context
                        <ArrowRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="md:col-span-2 rounded-3xl border border-dashed border-border bg-surface/50 p-10 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated text-sync-blue">
                  <Link2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">No decisions indexed yet</h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  Connect Slack, Gmail, Notion, or GitHub and let Sync ingest real workspace
                  history before the decision log can populate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
