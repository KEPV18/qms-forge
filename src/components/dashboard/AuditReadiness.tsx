import { CheckCircle, Clock, AlertTriangle, Shield, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ModuleStats } from "@/lib/googleSheets";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface AuditReadinessProps {
  moduleStats: ModuleStats[];
  complianceRate: number;
  isLoading?: boolean;
  onRefresh?: () => void;
  emptyFormsCount?: number;
}

const statusConfig = {
  compliant: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success",
    label: "Compliant"
  },
  pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning",
    label: "In Progress"
  },
  attention: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive",
    label: "Needs Attention"
  },
};

function getModuleStatus(stats: ModuleStats): "compliant" | "pending" | "attention" {
  if (stats.issuesCount > 0) return "attention";
  if (stats.pendingCount > 0) return "pending";
  return "compliant";
}

function getModuleProgress(stats: ModuleStats): number {
  if (stats.formsCount === 0) return 0;

  // Stricter readiness: (Approved Forms / Total Forms)
  return Math.round((stats.compliantFormsCount / stats.formsCount) * 100);
}

export function AuditReadiness({
  moduleStats,
  complianceRate,
  isLoading = false,
  onRefresh,
  emptyFormsCount = 0,
}: AuditReadinessProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-16" />
          </div>
        </div>
        <div className="p-5 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-12" />
              </div>
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate overall progress safely
  const validModules = moduleStats.filter(m => m.formsCount > 0);
  const displayCompliance = validModules.length > 0 ? Math.max(0, Math.min(100, complianceRate)) : 0;

  return (
    <div className="bg-card rounded-3xl border border-border/60 shadow-md overflow-hidden">
      <div className="p-8 border-b border-border/50 bg-muted/5">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">System Readiness</h3>
              <p className="text-sm text-muted-foreground font-medium">{validModules.length} Active Workstreams</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-success" />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Global Compliance</span>
              <span className="text-3xl font-black text-foreground tracking-tighter">{displayCompliance}%</span>
            </div>
            {onRefresh && (
              <Button
                onClick={onRefresh}
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-primary/10 hover:text-primary transition-all"
                title="Synchronize Readiness"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {moduleStats.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 font-medium italic">
            Waiting for module mapping...
          </div>
        ) : (
          moduleStats.map((module) => {
            const hasData = module.formsCount > 0;
            const status = getModuleStatus(module);
            const config = statusConfig[status];
            const Icon = config.icon;
            const progress = getModuleProgress(module);

            return (
              <div key={module.id} className="group space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg transition-colors group-hover:scale-110", config.bg + "/10")}>
                      <Icon className={cn("w-3.5 h-3.5", config.color)} />
                    </div>
                    <span className="text-sm font-bold text-foreground truncate max-w-[140px] tracking-tight group-hover:text-primary transition-colors">
                      {module.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasData ? (
                      <span className="text-xs font-black text-foreground p-1 bg-card rounded border border-border shadow-sm">{progress}%</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter italic bg-muted/20 px-2 py-0.5 rounded">Cold Start</span>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <Progress value={progress} className="h-1.5 rounded-full overflow-hidden bg-muted/30" />
                </div>

                {(module.issuesCount > 0 || module.pendingCount > 0) && (
                  <div className="flex items-center gap-3 pt-1">
                    {module.pendingCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                        <span className="text-[10px] font-black text-warning uppercase">{module.pendingCount} Review</span>
                      </div>
                    )}
                    {module.issuesCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_4px_rgba(239,68,68,0.4)]" />
                        <span className="text-[10px] font-black text-destructive uppercase">{module.issuesCount} Gap</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {emptyFormsCount > 0 && (
        <div className="p-6 bg-warning/5 border-t border-warning/10">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-warning/80 uppercase tracking-widest">Documentation Gaps</span>
            <span className="font-black text-warning">{emptyFormsCount} Empty Templates</span>
          </div>
        </div>
      )}
    </div>
  );
}
