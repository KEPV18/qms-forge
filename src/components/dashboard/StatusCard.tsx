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
    default: { card: "border-border", icon: "bg-muted/60 text-foreground" },
    success: { card: "border-success/20", icon: "bg-success/10 text-success" },
    warning: { card: "border-warning/20", icon: "bg-warning/10 text-warning" },
    destructive: { card: "border-destructive/20", icon: "bg-destructive/10 text-destructive" },
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-xl border p-5 hover:shadow-md transition-all duration-200 group cursor-pointer",
      styles[variant].card
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-foreground tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
          {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform",
          styles[variant].icon
        )}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
