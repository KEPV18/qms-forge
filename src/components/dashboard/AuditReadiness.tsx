import { CheckCircle, Clock, AlertTriangle, Shield, RefreshCw } from "lucide-react";
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
  compliant: { icon: CheckCircle, color: "text-success", bg: "bg-success", ring: "ring-success/20" },
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning", ring: "ring-warning/20" },
  attention: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive", ring: "ring-destructive/20" },
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

// Circular progress component
function CircularProgress({ value, size = 36, strokeWidth = 3, className }: { value: number; size?: number; strokeWidth?: number; className?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth} opacity={0.3} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
      </svg>
      <span className="absolute text-[9px] font-bold text-foreground">{value}%</span>
    </div>
  );
}

export function AuditReadiness({ moduleStats, complianceRate, isLoading = false, onRefresh, emptyFormsCount = 0 }: AuditReadinessProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-border/50 p-5">
        <Skeleton className="h-4 w-32 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full mb-3" />)}
      </div>
    );
  }

  const validModules = moduleStats.filter(m => m.formsCount > 0);
  const displayCompliance = validModules.length > 0 ? Math.max(0, Math.min(100, complianceRate)) : 0;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
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

      <div className="p-5 space-y-3">
        {moduleStats.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading modules...</p>
        ) : (
          moduleStats.map(module => {
            const status = getModuleStatus(module);
            const config = statusConfig[status];
            const Icon = config.icon;
            const progress = getModuleProgress(module);

            return (
              <div key={module.id} className="flex items-center gap-3 group">
                <CircularProgress value={progress} size={36} strokeWidth={3} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground truncate">{module.name}</span>
                    <Icon className={cn("w-3 h-3 flex-shrink-0", config.color)} />
                  </div>
                  {(module.issuesCount > 0 || module.pendingCount > 0) && (
                    <div className="flex gap-2 text-[9px] mt-0.5">
                      {module.pendingCount > 0 && <span className="text-warning font-semibold">{module.pendingCount} pending</span>}
                      {module.issuesCount > 0 && <span className="text-destructive font-semibold">{module.issuesCount} issues</span>}
                    </div>
                  )}
                </div>
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
