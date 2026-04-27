import { Slack, Mail, FileText, Github, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SourcePlatform } from "@/types/sync";

interface SourceIconProps {
  type: SourcePlatform;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SourceIcon({ type, size = "md", className }: SourceIconProps) {
  const icons = {
    slack: Slack,
    gmail: Mail,
    notion: FileText,
    github: Github,
    whatsapp: Globe,
    custom: Globe,
  };

  const colors = {
    slack: "bg-[#4A154B] text-white",
    gmail: "bg-[#EA4335] text-white",
    notion: "bg-white text-black",
    github: "bg-[#333333] text-white",
    whatsapp: "bg-[#25D366] text-white",
    custom: "bg-sync-blue text-white",
  };

  const sizeClasses = {
    sm: "p-1 rounded-md",
    md: "p-2 rounded-lg",
    lg: "p-3 rounded-xl",
  };

  const Icon = icons[type];

  return (
    <div className={cn(
      "flex items-center justify-center shrink-0",
      colors[type],
      sizeClasses[size],
      className
    )}>
      <Icon className={cn(
        size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-6 h-6"
      )} />
    </div>
  );
}
