import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AuditReadiness } from "@/components/dashboard/AuditReadiness";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PendingActions } from "@/components/dashboard/PendingActions";
import { PipelineItem } from "@/components/dashboard/PipelineItem";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatsRow } from "@/components/ui/StatsRow";
import { DecisionBanner } from "@/components/ui/DecisionBanner";
import { StateScreen } from "@/components/ui/StateScreen";
import {
  useQMSData, useModuleStats, useAuditSummary,
  useReviewSummary, useMonthlyComparison, useRecentActivity,
} from "@/hooks/useQMSData";
import { MODULE_CONFIG } from "@/config/modules";
import {
  FileText, AlertTriangle, Clock, CheckCircle,
  TrendingUp, TrendingDown, BarChart3, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Dashboard page ──────────────────────────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useQMSData();
  const { data: moduleStats } = useModuleStats();
  const { data: auditSummary } = useAuditSummary();
  const { data: reviewSummary } = useReviewSummary();
  const { data: monthlyComparison } = useMonthlyComparison();
  const { recentActivity } = useRecentActivity();

  const stats = useMemo(() => ({
    evidence: moduleStats?.totalEvidence ?? 0,
    approved: moduleStats?.approved ?? 0,
    pending: moduleStats?.pendingReview ?? 0,
    gaps: moduleStats?.gaps?.total ?? 0,
    rejected: moduleStats?.rejected ?? 0,
  }), [moduleStats]);

  if (isLoading) return <StateScreen state="loading" title="Loading dashboard…" />;
  if (error) return <StateScreen state="error" title="Failed to load data" message={error.message} action={{ label: "Retry", onClick: () => window.location.reload() }} />;

  const totalReviewItems = stats.approved + stats.pending + stats.rejected;
  const approvedPct = totalReviewItems > 0 ? Math.round((stats.approved / totalReviewItems) * 100) : 0;
  const pendingPct = totalReviewItems > 0 ? Math.round((stats.pending / totalReviewItems) * 100) : 0;
  const rejectedPct = totalReviewItems > 0 ? Math.round((stats.rejected / totalReviewItems) * 100) : 0;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="space-y-6">

        {/* Decision banner */}
        {stats.rejected > 0 ? (
          <DecisionBanner priority="critical" title={`${stats.rejected} Rejected Records`} description="Resolve rejected records to maintain compliance." action={{ label: "Fix Now", href: "/audit?tab=issues" }} />
        ) : stats.pending > 0 ? (
          <DecisionBanner priority="warning" title={`${stats.pending} Records Pending Review`} description="Approve or reject pending records to keep your audit trail current." action={{ label: "Review Now", href: "/audit?tab=pending" }} />
        ) : stats.approved > 0 ? (
          <DecisionBanner priority="success" title="All Clear" description="No outstanding reviews. All records are approved." />
        ) : null}

        {/* Stats */}
        <StatsRow stats={[
          { icon: FileText, value: stats.evidence, label: "Evidence", variant: "default" as const },
          { icon: CheckCircle, value: stats.approved, label: "Approved", variant: "success" as const, onClick: () => navigate("/audit?tab=compliant") },
          { icon: Clock, value: stats.pending, label: "Pending", variant: "warning" as const, onClick: () => navigate("/audit?tab=pending") },
          { icon: AlertTriangle, value: stats.rejected, label: "Rejected", variant: "destructive" as const, onClick: () => navigate("/audit?tab=issues") },
          { icon: BarChart3, value: stats.gaps, label: "Gaps", variant: "default" as const },
        ]} />

        {/* Pipeline */}
        <div className="space-y-3">
          <SectionHeader title="Review Pipeline" description="Approval status across all records" action={<Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => navigate("/audit")}>View Audit</Button>} />
          <div className="bg-card border border-border rounded-sm overflow-hidden divide-y divide-border/50">
            <PipelineItem label="Approved" count={stats.approved} pct={approvedPct} variant="success" onClick={() => navigate("/audit?tab=compliant")} />
            <PipelineItem label="Pending Review" count={stats.pending} pct={pendingPct} variant="warning" onClick={() => navigate("/audit?tab=pending")} />
            <PipelineItem label="Rejected" count={stats.rejected} pct={rejectedPct} variant="destructive" onClick={() => navigate("/audit?tab=issues")} />
          </div>
        </div>

        {/* Modules */}
        <div className="space-y-3">
          <SectionHeader title="QMS Modules" description="Quality management modules" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.values(MODULE_CONFIG).map(mod => {
              const modStats = moduleStats?.[mod.id] ?? { formsCount: 0, recordsCount: 0, pendingCount: 0, issuesCount: 0 };
              return (
                <ModuleCard
                  key={mod.id}
                  title={mod.name}
                  description={mod.description}
                  icon={mod.icon}
                  moduleClass={mod.moduleClass}
                  isoClause={mod.isoClause}
                  stats={modStats}
                  onClick={() => navigate(`/module/${mod.id}`)}
                />
              );
            })}
          </div>
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <QuickActions />
          <AuditReadiness />
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentActivity recentActivity={recentActivity} />
          <PendingActions />
        </div>

        {/* Comparison */}
        {monthlyComparison && (
          <div className="space-y-3">
            <SectionHeader title="Monthly Comparison" description="Current vs previous period" />
            <div className="bg-card border border-border rounded-sm p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-black text-success">{monthlyComparison.currentMonth?.approved ?? 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Approved</p>
                {monthlyComparison.currentMonth?.approved !== undefined && monthlyComparison.previousMonth?.approved !== undefined && (
                  <div className="flex items-center justify-center gap-1 mt-1">
                    {monthlyComparison.currentMonth.approved >= monthlyComparison.previousMonth.approved
                      ? <TrendingUp className="w-3 h-3 text-success" />
                      : <TrendingDown className="w-3 h-3 text-destructive" />}
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {monthlyComparison.currentMonth.approved >= monthlyComparison.previousMonth.approved ? "+" : ""}
                      {monthlyComparison.previousMonth.approved > 0
                        ? Math.round(((monthlyComparison.currentMonth.approved - monthlyComparison.previousMonth.approved) / monthlyComparison.previousMonth.approved) * 100)
                        : 0}%
                    </span>
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-warning">{monthlyComparison.currentMonth?.pending ?? 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-destructive">{monthlyComparison.currentMonth?.rejected ?? 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Rejected</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-foreground">{monthlyComparison.currentMonth?.total ?? 0}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Total</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}