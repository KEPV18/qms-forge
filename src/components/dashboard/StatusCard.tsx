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
      card: "border-border/50 hover:border-primary/30",
      icon: "bg-primary/10 text-primary",
      glow: "group-hover:shadow-[0_8px_30px_-8px_hsl(var(--primary)/0.15)]",
      gradient: "from-primary/5 via-transparent to-transparent",
    },
    success: {
      card: "border-success/15 hover:border-success/40",
      icon: "bg-success/10 text-success",
      glow: "group-hover:shadow-[0_8px_30px_-8px_hsl(var(--success)/0.2)]",
      gradient: "from-success/5 via-transparent to-transparent",
    },
    warning: {
      card: "border-warning/15 hover:border-warning/40",
      icon: "bg-warning/10 text-warning",
      glow: "group-hover:shadow-[0_8px_30px_-8px_hsl(var(--warning)/0.2)]",
      gradient: "from-warning/5 via-transparent to-transparent",
    },
    destructive: {
      card: "border-destructive/15 hover:border-destructive/40",
      icon: "bg-destructive/10 text-destructive",
      glow: "group-hover:shadow-[0_8px_30px_-8px_hsl(var(--destructive)/0.2)]",
      gradient: "from-destructive/5 via-transparent to-transparent",
    },
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="w-11 h-11 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "relative surface-card rounded-2xl p-6 transition-all duration-300 group cursor-pointer overflow-hidden hover:-translate-y-1",
      styles[variant].glow
    )}>
      {/* Subtle gradient background */}
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", styles[variant].gradient)} />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{title}</p>
          <p className="text-3xl font-extrabold text-foreground tracking-tight leading-none animate-counter">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-[10px] text-muted-foreground/70">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-1",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={cn(
          "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
          styles[variant].icon
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
