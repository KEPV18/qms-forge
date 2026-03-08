import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "destructive";
  isLoading?: boolean;
}

export function StatusCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = "default",
  isLoading = false,
}: StatusCardProps) {
  const variantStyles = {
    default: "bg-card border-border/60 shadow-sm",
    success: "bg-success/5 border-success/20 shadow-sm",
    warning: "bg-warning/5 border-warning/20 shadow-sm",
    destructive: "bg-destructive/5 border-destructive/20 shadow-sm",
  };

  const iconStyles = {
    default: "bg-muted text-foreground",
    success: "bg-success/20 text-success shadow-sm shadow-success/10",
    warning: "bg-warning/20 text-warning shadow-sm shadow-warning/10",
    destructive: "bg-destructive/20 text-destructive shadow-sm shadow-destructive/10",
  };

  if (isLoading) {
    return (
      <div className={cn(
        "rounded-2xl border p-6 transition-all duration-200",
        variantStyles[variant]
      )}>
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
          <Skeleton className="w-14 h-14 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "glass-card rounded-3xl p-7 card-hover-enhanced group relative overflow-hidden",
      variantStyles[variant]
    )}>
      {/* Decorative background glow for hover */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] opacity-70">{title}</p>
          <p className="text-4xl font-bold text-foreground tracking-tighter font-heading">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight opacity-50">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "flex items-center gap-2 mt-4 px-2 py-1 rounded-lg w-fit text-xs font-black",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              <span className="flex items-center gap-1">
                <span className="text-sm font-bold">{trend.isPositive ? "↗" : "↘"}</span>
                {Math.abs(trend.value)}%
              </span>
              <span className="opacity-60 font-medium">Monthly</span>
            </div>
          )}
        </div>
        <div className={cn(
          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm border border-black/5 dark:border-white/5",
          iconStyles[variant]
        )}>
          <Icon className="w-7 h-7" />
        </div>
      </div>
    </div>
  );
}
