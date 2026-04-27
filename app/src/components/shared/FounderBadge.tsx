import { cn } from "@/lib/utils";

interface FounderBadgeProps {
  name: "Paul" | "Sam";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function FounderBadge({ name, size = "md", className }: FounderBadgeProps) {
  const initials = name[0];
  const color = name === "Paul" ? "bg-sync-blue" : "bg-sync-indigo";

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-12 h-12 text-base",
  };

  return (
    <div className={cn(
      "rounded-full flex items-center justify-center font-bold text-white shadow-lg border-2 border-background",
      color,
      sizeClasses[size],
      className
    )}>
      {initials}
      <div className="absolute inset-0 rounded-full border border-white/20" />
    </div>
  );
}
