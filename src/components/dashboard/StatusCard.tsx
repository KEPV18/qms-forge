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
      card: "border-border hover:border-primary/30",
      icon: "bg-primary/10 text-primary",
      glow: "group-hover:shadow-[0_4px_20px_-4px_hsl(var(--primary)/0.15)]",
    },
    success: {
      card: "border-success/20 hover:border-success/40",
      icon: "bg-success/10 text-success",
      glow: "group-hover:shadow-[0_4px_20px_-4px_hsl(var(--success)/0.2)]",
    },
    warning: {
      card: "border-warning/20 hover:border-warning/40",
      icon: "bg-warning/10 text-warning",
      glow: "group-hover:shadow-[0_4px_20px_-4px_hsl(var(--warning)/0.2)]",
    },
    destructive: {
      card: "border-destructive/20 hover:border-destructive/40",
      icon: "bg-destructive/10 text-destructive",
      glow: "group-hover:shadow-[0_4px_20px_-4px_hsl(var(--destructive)/0.2)]",
    },
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
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
      "bg-card rounded-xl border p-5 transition-all duration-300 group cursor-pointer",
      styles[variant].card,
      styles[variant].glow
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.12em]">{title}</p>
          <p className="text-3xl font-extrabold text-foreground tracking-tight leading-none">
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
          "w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110",
          styles[variant].icon
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
