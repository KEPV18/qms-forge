import { LucideIcon, ArrowRight, FileText, FolderOpen, TrendingUp, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  moduleClass: string;
  stats: { formsCount: number; recordsCount: number; pendingCount: number; issuesCount: number };
  isoClause: string;
  isLoading?: boolean;
}

const moduleColorMap: Record<string, { gradient: string; text: string; bg: string; border: string; shadow: string }> = {
  "module-sales":       { gradient: "from-[hsl(var(--module-sales))] to-[hsl(var(--module-sales)/0.7)]", text: "text-[hsl(var(--module-sales))]", bg: "bg-[hsl(var(--module-sales)/0.08)]", border: "border-[hsl(var(--module-sales)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-sales)/0.25)]" },
  "module-operations":  { gradient: "from-[hsl(var(--module-operations))] to-[hsl(var(--module-operations)/0.7)]", text: "text-[hsl(var(--module-operations))]", bg: "bg-[hsl(var(--module-operations)/0.08)]", border: "border-[hsl(var(--module-operations)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-operations)/0.25)]" },
  "module-quality":     { gradient: "from-[hsl(var(--module-quality))] to-[hsl(var(--module-quality)/0.7)]", text: "text-[hsl(var(--module-quality))]", bg: "bg-[hsl(var(--module-quality)/0.08)]", border: "border-[hsl(var(--module-quality)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-quality)/0.25)]" },
  "module-procurement": { gradient: "from-[hsl(var(--module-procurement))] to-[hsl(var(--module-procurement)/0.7)]", text: "text-[hsl(var(--module-procurement))]", bg: "bg-[hsl(var(--module-procurement)/0.08)]", border: "border-[hsl(var(--module-procurement)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-procurement)/0.25)]" },
  "module-hr":          { gradient: "from-[hsl(var(--module-hr))] to-[hsl(var(--module-hr)/0.7)]", text: "text-[hsl(var(--module-hr))]", bg: "bg-[hsl(var(--module-hr)/0.08)]", border: "border-[hsl(var(--module-hr)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-hr)/0.25)]" },
  "module-rnd":         { gradient: "from-[hsl(var(--module-rnd))] to-[hsl(var(--module-rnd)/0.7)]", text: "text-[hsl(var(--module-rnd))]", bg: "bg-[hsl(var(--module-rnd)/0.08)]", border: "border-[hsl(var(--module-rnd)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-rnd)/0.25)]" },
  "module-management":  { gradient: "from-[hsl(var(--module-management))] to-[hsl(var(--module-management)/0.7)]", text: "text-[hsl(var(--module-management))]", bg: "bg-[hsl(var(--module-management)/0.08)]", border: "border-[hsl(var(--module-management)/0.15)]", shadow: "hover:shadow-[0_12px_40px_-12px_hsl(var(--module-management)/0.25)]" },
};

const defaultColor = { gradient: "from-primary to-primary/70", text: "text-primary", bg: "bg-primary/10", border: "border-primary/20", shadow: "" };

export function ModuleCard({ title, description, icon: Icon, moduleClass, stats, isoClause, isLoading = false }: ModuleCardProps) {
  const colors = moduleColorMap[moduleClass] || defaultColor;

  const total = stats.formsCount + stats.recordsCount;
  const issues = stats.pendingCount + stats.issuesCount;
  const complianceRate = total > 0 ? Math.round(((total - issues) / total) * 100) : 100;

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className={cn(
      "relative glass-card rounded-2xl border overflow-hidden group cursor-pointer transition-all duration-300 card-lift hover:-translate-y-1",
      colors.border,
      colors.shadow
    )}>
      {/* Colored top bar */}
      <div className={cn("h-1 w-full bg-gradient-to-r", colors.gradient)} />

      <div className="p-5 flex flex-col h-full">
        {/* Header with large icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg",
              colors.bg
            )}>
              <Icon className={cn("w-6 h-6", colors.text)} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">{title}</h3>
              <span className={cn("text-[9px] font-bold uppercase tracking-[0.15em]", colors.text, "opacity-60")}>{isoClause}</span>
            </div>
          </div>
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0",
            colors.bg
          )}>
            <ArrowRight className={cn("w-3.5 h-3.5", colors.text)} />
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-2">{description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={cn("flex items-center gap-2 p-2.5 rounded-lg", colors.bg)}>
            <FileText className={cn("w-3.5 h-3.5", colors.text, "opacity-50")} />
            <div>
              <span className="text-sm font-bold text-foreground">{stats.formsCount}</span>
              <span className="text-[9px] text-muted-foreground ml-1">Forms</span>
            </div>
          </div>
          <div className={cn("flex items-center gap-2 p-2.5 rounded-lg", colors.bg)}>
            <FolderOpen className={cn("w-3.5 h-3.5", colors.text, "opacity-50")} />
            <div>
              <span className="text-sm font-bold text-foreground">{stats.recordsCount}</span>
              <span className="text-[9px] text-muted-foreground ml-1">Records</span>
            </div>
          </div>
        </div>

        {/* Compliance bar - gradient */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Compliance
            </span>
            <span className={cn("text-xs font-extrabold", complianceRate >= 80 ? "text-success" : complianceRate >= 50 ? "text-warning" : "text-destructive")}>
              {complianceRate}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                complianceRate >= 80 ? "bg-gradient-to-r from-success/80 to-success" : complianceRate >= 50 ? "bg-gradient-to-r from-warning/80 to-warning" : "bg-gradient-to-r from-destructive/80 to-destructive"
              )}
              style={{ width: `${complianceRate}%` }}
            />
          </div>
        </div>

        {/* Alerts */}
        {(stats.pendingCount > 0 || stats.issuesCount > 0) && (
          <div className="mt-3 flex items-center gap-2 text-[10px]">
            <Activity className="w-3 h-3 text-muted-foreground" />
            {stats.pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-warning">
                <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                {stats.pendingCount} pending
              </span>
            )}
            {stats.pendingCount > 0 && stats.issuesCount > 0 && <span className="text-muted-foreground">·</span>}
            {stats.issuesCount > 0 && (
              <span className="inline-flex items-center gap-1 font-bold text-destructive">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                {stats.issuesCount} issues
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
