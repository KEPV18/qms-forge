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
  compliant: { icon: CheckCircle, color: "text-success", bg: "bg-success" },
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning" },
  attention: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive" },
};

function getModuleStatus(s: ModuleStats): "compliant" | "pending" | "attention" {
  if (s.issuesCount > 0) return "attention";
  if (s.pendingCount > 0) return "pending";
  return "compliant";
}

function getModuleProgress(s: ModuleStats): number {
  if (s.formsCount === 0) return 0;
  return Math.round((s.compliantFormsCount / s.formsCount) * 100);
}

export function AuditReadiness({ moduleStats, complianceRate, isLoading = false, onRefresh, emptyFormsCount = 0 }: AuditReadinessProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full mb-3" />)}
      </div>
    );
  }

  const validModules = moduleStats.filter(m => m.formsCount > 0);
  const displayCompliance = validModules.length > 0 ? Math.max(0, Math.min(100, complianceRate)) : 0;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-success" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">System Readiness</h3>
            <p className="text-[10px] text-muted-foreground">{validModules.length} modules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-foreground">{displayCompliance}%</span>
          {onRefresh && (
            <Button onClick={onRefresh} variant="ghost" size="icon" className="h-7 w-7 rounded-md">
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {moduleStats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading modules...</p>
        ) : (
          moduleStats.map(module => {
            const status = getModuleStatus(module);
            const config = statusConfig[status];
            const Icon = config.icon;
            const progress = getModuleProgress(module);

            return (
              <div key={module.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={cn("w-3 h-3", config.color)} />
                    <span className="text-xs font-semibold text-foreground truncate max-w-[130px]">{module.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1 rounded-full bg-muted/30" />
                {(module.issuesCount > 0 || module.pendingCount > 0) && (
                  <div className="flex gap-2 text-[9px]">
                    {module.pendingCount > 0 && <span className="text-warning font-semibold">{module.pendingCount} pending</span>}
                    {module.issuesCount > 0 && <span className="text-destructive font-semibold">{module.issuesCount} issues</span>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {emptyFormsCount > 0 && (
        <div className="px-5 py-3 bg-warning/5 border-t border-warning/10 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-warning">Documentation Gaps</span>
          <span className="text-[10px] font-bold text-warning">{emptyFormsCount} empty</span>
        </div>
      )}
    </div>
  );
}
