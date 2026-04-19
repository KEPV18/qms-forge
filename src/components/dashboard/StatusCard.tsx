import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  variant?: "default" | "success" | "warning" | "destructive";
  isLoading?: boolean;
}

export function StatusCard({ title, value, subtitle, icon: Icon, trend, variant = "default", isLoading = false }: StatusCardProps) {
  const styles = {
    default: {
      card: "border-border/50 hover:border-primary/50",
      icon: "bg-primary/10 text-primary",
      glow: "",
      gradient: "from-primary/5 via-transparent to-transparent",
    },
    success: {
      card: "border-success/15 hover:border-success/50",
      icon: "bg-success/10 text-success",
      glow: "",
      gradient: "from-success/5 via-transparent to-transparent",
    },
    warning: {
      card: "border-warning/15 hover:border-warning/50",
      icon: "bg-warning/10 text-warning",
      glow: "",
      gradient: "from-warning/5 via-transparent to-transparent",
    },
    destructive: {
      card: "border-destructive/15 hover:border-destructive/50",
      icon: "bg-destructive/10 text-destructive",
      glow: "",
      gradient: "from-destructive/5 via-transparent to-transparent",
    },
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-sm border border-border/50 p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="w-11 h-11 rounded-sm" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative surface-card rounded-sm p-6 transition-all duration-300 group cursor-pointer overflow-hidden accent-line-top neon-border-hover",
      styles[variant].card
    )}>
      {/* Subtle gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", styles[variant].gradient)} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{title}</p>
          <p className="text-3xl font-extrabold font-mono text-foreground tracking-tight leading-none animate-counter">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm mt-1",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 rounded-sm flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
          styles[variant].icon
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
