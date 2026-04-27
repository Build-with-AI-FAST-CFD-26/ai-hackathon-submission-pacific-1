"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Brain, 
  MessageSquare, 
  History, 
  FileCheck, 
  Settings, 
  Link2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChatStore } from "@/store/useChatStore";

const navItems = [
  { name: "Ask Sync", href: "/ask", icon: MessageSquare },
  { name: "Search", href: "/search", icon: Search },
  { name: "Memory Feed", href: "/memory", icon: History },
  { name: "Decisions", href: "/decisions", icon: FileCheck },
  { name: "Sources", href: "/sources", icon: Link2 },
];

import { Menu, X } from "lucide-react";

export function SyncSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const clearMessages = useChatStore((state) => state.clearMessages);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-[110]">
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 bg-surface border border-border rounded-lg text-text-primary shadow-xl backdrop-blur-md"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside 
        className={cn(
          "h-screen bg-surface border-r border-border transition-all duration-500 ease-in-out relative flex flex-col z-[105]",
          "fixed inset-y-0 left-0 lg:relative",
          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Logo Area */}
        <div className="p-6 flex items-center gap-3">
          <img src="/logo.svg" alt="Sync Logo" className="w-8 h-8 shrink-0" />
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xl font-bold tracking-tight text-text-primary"
            >
              Sync
            </motion.span>
          )}
        </div>

        {/* New Chat Button */}
        <div className="px-4 mb-8">
          <button
            onClick={() => {
              clearMessages();
              setIsMobileOpen(false);
              router.push("/ask");
            }}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-3 bg-elevated hover:bg-sync-blue/10 border border-border hover:border-sync-blue/50 text-text-primary rounded-xl transition-all group",
              isCollapsed ? "px-0" : "px-4",
            )}
          >
            <Plus className="w-5 h-5 text-sync-blue group-hover:scale-110 transition-transform" />
            {!isCollapsed && <span className="font-medium">New Query</span>}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative group",
                  isActive 
                    ? "bg-sync-blue/10 text-sync-blue" 
                    : "text-text-secondary hover:text-text-primary hover:bg-elevated"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5 shrink-0 transition-transform group-hover:scale-110",
                  isActive ? "text-sync-blue" : "text-text-secondary"
                )} />
                {!isCollapsed && (
                  <span className="font-medium">{item.name}</span>
                )}
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1 h-6 bg-sync-blue rounded-r-full" 
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Link
            href="/settings"
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-elevated transition-all",
              isCollapsed && "justify-center"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span className="font-medium">Settings</span>}
          </Link>

          {/* Sync Status */}
          <div className={cn(
            "flex items-center gap-3 px-3 py-3 rounded-xl bg-elevated/50 border border-border/50",
            isCollapsed ? "justify-center" : "justify-between"
          )}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-status-resolved animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-status-resolved animate-ping" />
              </div>
              {!isCollapsed && <span className="text-xs font-mono text-text-secondary uppercase tracking-widest">Live Syncing</span>}
            </div>
          </div>
        </div>

        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute top-1/2 -right-3 w-6 h-6 bg-surface border border-border rounded-full items-center justify-center text-text-secondary hover:text-text-primary transition-colors z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>
    </>
  );
}
