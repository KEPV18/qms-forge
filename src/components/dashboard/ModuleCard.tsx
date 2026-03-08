import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  moduleClass: string;
  stats: {
    formsCount: number;
    recordsCount: number;
    pendingCount: number;
    issuesCount: number;
  };
  isoClause: string;
  isLoading?: boolean;
}

export function ModuleCard({
  title,
  description,
  icon: Icon,
  moduleClass,
  stats,
  isoClause,
  isLoading = false,
}: ModuleCardProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-4" />
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "glass-card rounded-3xl p-8 card-hover-enhanced group flex flex-col h-full relative overflow-hidden glass-sheen",
        moduleClass
      )}
    >
      {/* Decorative corner element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-700 blur-2xl" />

      {/* Header section with enhanced icon */}
      <div className="flex items-start justify-between mb-6 relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm border border-primary/5">
            <Icon className="w-8 h-8 text-foreground group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground mb-1 tracking-tight font-heading">{title}</h3>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[9px] font-black bg-primary/10 text-primary tracking-widest uppercase border border-primary/10">Verified</span>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">{isoClause}</p>
            </div>
          </div>
        </div>
        <div className="bg-muted/30 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Description with better line height */}
      <p className="text-base text-muted-foreground mb-8 leading-relaxed font-medium flex-1">
        {description}
      </p>

      {/* High-density stats footer */}
      <div className="grid grid-cols-2 gap-4 mt-auto pt-6 border-t border-border/10">
        <div className="bg-muted/30 rounded-2xl p-4 transition-all duration-500 group-hover:bg-primary/5 group-hover:shadow-inner">
          <div className="text-3xl font-bold text-foreground mb-1 tracking-tighter font-heading">{stats.formsCount}</div>
          <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Templates</div>
        </div>
        <div className="bg-success/5 rounded-2xl p-4 transition-all duration-500 group-hover:bg-success/10 group-hover:shadow-inner">
          <div className="text-3xl font-bold text-success mb-1 tracking-tighter font-heading">{stats.recordsCount}</div>
          <div className="text-[10px] text-success/70 font-bold uppercase tracking-[0.2em] opacity-60">Records</div>
        </div>
      </div>

      {/* Animated Status Indicators */}
      <div className="flex flex-wrap items-center gap-3 mt-6">
        {stats.pendingCount > 0 && (
          <div className="flex items-center gap-2 bg-warning/10 rounded-xl px-4 py-2 border border-warning/20">
            <div className="w-2.5 h-2.5 rounded-full bg-warning animate-pulse" />
            <span className="text-xs font-black text-warning uppercase tracking-tight">{stats.pendingCount} Pending</span>
          </div>
        )}
        {stats.issuesCount > 0 && (
          <div className="flex items-center gap-2 bg-destructive/10 rounded-xl px-4 py-2 border border-destructive/20">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.4)]" />
            <span className="text-xs font-black text-destructive uppercase tracking-tight">{stats.issuesCount} Issues</span>
          </div>
        )}
        {stats.pendingCount === 0 && stats.issuesCount === 0 && (
          <div className="flex items-center gap-2 bg-success/10 rounded-xl px-4 py-2 border border-success/20">
            <div className="w-2.5 h-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
            <span className="text-xs font-black text-success uppercase tracking-tight">System Optimized</span>
          </div>
        )}
      </div>
    </div>
  );
}
