"use client";

import TextareaAutosize from "react-textarea-autosize";
import { Send, Sparkles, Plus, Image as ImageIcon, Paperclip } from "lucide-react";
import { useState } from "react";

interface SyncInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

import { toast } from "sonner";
import { useRef } from "react";

export function SyncInput({ onSendMessage, isLoading }: SyncInputProps) {
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  const handleMockAction = (type: string) => {
    switch (type) {
      case "plus":
        toast.info("Quick Actions", {
          description: "Summary and Insight tools are being synchronized."
        });
        break;
      case "image":
        toast.promise(new Promise(resolve => setTimeout(resolve, 1500)), {
          loading: "Scanning image for context...",
          success: "Image context extracted successfully!",
          error: "Failed to scan image."
        });
        break;
      case "attach":
        fileInputRef.current?.click();
        break;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      toast.success(`Attached: ${e.target.files[0].name}`, {
        description: "File uploaded to Sync's temporary memory."
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
      />
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-sync-blue to-sync-indigo rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity duration-500" />
        
        <form 
          onSubmit={handleSubmit}
          className="relative flex flex-col bg-surface border border-border group-focus-within:border-sync-blue/50 rounded-2xl overflow-hidden transition-all duration-300"
        >
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask anything..."
            className="w-full bg-transparent text-text-primary placeholder:text-text-muted px-5 pt-5 pb-3 outline-none resize-none min-h-[60px] max-h-[200px] font-sans text-lg"
            rows={1}
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button 
                type="button" 
                onClick={() => handleMockAction("plus")}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
              <button 
                type="button" 
                onClick={() => handleMockAction("image")}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
              <button 
                type="button" 
                onClick={() => handleMockAction("attach")}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-elevated rounded-lg transition-colors"
              >
                <Paperclip className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4F8EF7]/10 rounded-full border border-[#4F8EF7]/20 shadow-[0_0_15px_rgba(79,142,247,0.1)]">
                <Sparkles className="w-3.5 h-3.5 text-[#4F8EF7] animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4F8EF7]">Deep Sync Active</span>
              </div>
              
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-sync-blue text-white rounded-xl hover:bg-sync-blue/90 disabled:opacity-50 disabled:hover:bg-sync-blue transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </form>
      </div>
      
      <p className="text-center text-[11px] text-text-muted mt-3 uppercase tracking-widest font-medium">
        Sync can recall information from Gmail, Slack, and Notion
      </p>
    </div>
  );
}
