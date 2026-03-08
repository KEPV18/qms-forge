import { LucideIcon, ArrowUpRight } from "lucide-react";
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

export function ModuleCard({ title, description, icon: Icon, moduleClass, stats, isoClause, isLoading = false }: ModuleCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <Skeleton className="h-5 w-32 mb-3" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-card rounded-xl border border-border p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-pointer flex flex-col h-full",
      moduleClass
    )}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <Icon className="w-5 h-5 text-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{title}</h3>
            <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">{isoClause}</span>
          </div>
        </div>
        <ArrowUpRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
      </div>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-4 flex-1 line-clamp-2">{description}</p>

      {/* Stats row */}
      <div className="flex items-center gap-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-foreground">{stats.formsCount}</span>
          <span className="text-[9px] text-muted-foreground uppercase">Forms</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-lg font-bold text-success">{stats.recordsCount}</span>
          <span className="text-[9px] text-muted-foreground uppercase">Records</span>
        </div>
        {stats.pendingCount > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
              <span className="text-[9px] font-semibold text-warning">{stats.pendingCount}</span>
            </div>
          </>
        )}
        {stats.issuesCount > 0 && (
          <>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
              <span className="text-[9px] font-semibold text-destructive">{stats.issuesCount}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
