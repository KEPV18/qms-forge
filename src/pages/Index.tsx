import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { ModuleCard } from "@/components/dashboard/ModuleCard";
import { StatusCard } from "@/components/dashboard/StatusCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { AuditReadiness } from "@/components/dashboard/AuditReadiness";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PendingActions } from "@/components/dashboard/PendingActions";
import {
  useQMSData,
  useModuleStats,
  useAuditSummary,
  useReviewSummary,
  useMonthlyComparison,
  useRecentActivity,
} from "@/hooks/useQMSData";
import { MODULE_CONFIG } from "@/config/modules";
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Loader2,
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

export default function Index() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: records, isLoading, isError, refetch, dataUpdatedAt } = useQMSData();
  const moduleStats = useModuleStats(records);
  const auditSummary = useAuditSummary(records);
  const reviewSummary = useReviewSummary(records);
  const monthlyComparison = useMonthlyComparison(records);
  const activity = useRecentActivity(records, 5);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    refetch();
  };

  if (isError) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-bold">Failed to load QMS Data</h2>
          <p className="text-sm text-muted-foreground">Could not connect to data source.</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  // Count individual rejected files (matching Audit page calculation)
  const rejectedCount = (records ?? []).reduce((count, r) => {
    const reviews = (r.fileReviews || {}) as Record<string, { status?: string }>;
    const files = r.files || [];
    files.forEach(file => {
      const review = reviews[file.id];
      const status = (review?.status || "").toLowerCase();
      if (status === "rejected" || status.includes("invalid") || status === "❌") {
        count++;
      }
    });
    return count;
  }, 0);

  const totalEvidence = records?.reduce((sum, r) => sum + (r.actualRecordCount || 0), 0) || 0;
  const gapsCount = records?.filter(r => (r.actualRecordCount || 0) === 0).length || 0;

  return (
    <AppShell>
      <div className="space-y-6">

        {/* Hero Section — Aurora gradient */}
        <div className="relative overflow-hidden rounded-sm aurora-bg p-8 md:p-12 border border-neon-cyan/10 accent-line-top">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-sm bg-neon-cyan/20 backdrop-blur-sm flex items-center justify-center border border-neon-cyan/20">
                  <ShieldCheck className="w-4 h-4 text-neon-cyan" />
                </div>
                <span className="text-[11px] font-mono font-bold text-primary/80 uppercase tracking-[0.2em]">Quality Management System</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
                {user?.name ? `Welcome, ${user.name.split(' ')[0]}` : 'Dashboard'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">ISO 9001:2015 Compliance Overview</p>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground bg-card/80 backdrop-blur-sm px-4 py-2.5 rounded-sm border border-border font-mono">
                  <div className="w-2 h-2 rounded-none bg-neon-cyan animate-glow-pulse" />
                  Synced {lastUpdated}
                </div>
              )}
              <Button onClick={handleRefresh} size="sm" className="h-10 gap-2 rounded-sm bg-neon-cyan/10 hover:bg-neon-cyan/20 text-foreground border border-neon-cyan/20 shadow-none" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Sync
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div onClick={() => navigate("/audit")} className="cursor-pointer">
                <StatusCard
                  title="Evidence"
                  value={totalEvidence}
                  subtitle="Files collected"
                  icon={FileText}
                  variant="default"
                  trend={monthlyComparison.percentageChange > 0 ? { value: monthlyComparison.percentageChange, isPositive: monthlyComparison.isPositive } : undefined}
                  isLoading={isLoading}
                />
              </div>
              <div onClick={() => navigate("/audit?tab=compliant")} className="cursor-pointer">
                <StatusCard title="Approved" value={reviewSummary.completed} subtitle="Verified records" icon={CheckCircle} variant="success" isLoading={isLoading} />
              </div>
              <div onClick={() => navigate("/audit?tab=pending")} className="cursor-pointer">
                <StatusCard title="Pending" value={reviewSummary.pending} subtitle="Awaiting review" icon={Clock} variant="warning" isLoading={isLoading} />
              </div>
              <div onClick={() => navigate("/audit")} className="cursor-pointer">
                <StatusCard title="Gaps" value={gapsCount} subtitle="Empty records" icon={AlertTriangle} variant={gapsCount > 0 ? "warning" : "default"} isLoading={isLoading} />
              </div>
              <div onClick={() => navigate("/audit?tab=issues")} className="cursor-pointer">
                <StatusCard title="Rejected" value={rejectedCount} subtitle="Needs attention" icon={AlertTriangle} variant={rejectedCount > 0 ? "destructive" : "default"} isLoading={isLoading} />
              </div>
            </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Left: Modules */}
              <div className="xl:col-span-8 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-none bg-gradient-to-b from-primary to-primary/30" />
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground tracking-tight">System Modules</h2>
                      <p className="text-xs text-muted-foreground">ISO 9001:2015 organizational structure</p>
                    </div>
                  </div>
                  {!isLoading && records && (
                    <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/8 px-4 py-2 rounded-sm border border-primary/15 font-mono">
                      <Zap className="w-3.5 h-3.5" />
                      {auditSummary.total} templates
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!isLoading && moduleStats.map(module => {
                    const config = MODULE_CONFIG[module.id];
                    const Icon = config?.icon || FileText;
                    const meta = config ? { description: config.description, isoClause: config.isoClause } : { description: "QMS module.", isoClause: "ISO 9001" };
                    return (
                      <div key={module.id} onClick={() => navigate(`/module/${module.id}`)} className="cursor-pointer">
                        <ModuleCard
                          title={module.name}
                          description={meta.description}
                          icon={Icon}
                          moduleClass={`module-${module.id}`}
                          stats={{ formsCount: module.formsCount, recordsCount: module.recordsCount, pendingCount: module.pendingCount, issuesCount: module.issuesCount }}
                          isoClause={meta.isoClause}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Widgets */}
              <div className="xl:col-span-4 space-y-5">
                <QuickActions />
                <AuditReadiness
                  moduleStats={moduleStats}
                  complianceRate={auditSummary.complianceRate}
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                  emptyFormsCount={gapsCount}
                />
                <PendingActions records={records ?? []} isLoading={isLoading} />
              </div>
            </div>

            {/* Bottom: Activity & Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity records={activity} isLoading={isLoading} />

              {/* Review Pipeline */}
              <div className="bg-card rounded-sm border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Review Pipeline</h3>
                    <p className="text-[10px] text-muted-foreground">Verification progress</p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/10 animate-pulse rounded-sm" />)
                  ) : (
                    <>
                      {[
                        { label: "Approved", subtitle: "Verified compliant", count: reviewSummary.completed, icon: CheckCircle, variant: "success" as const, tab: "compliant" },
                        { label: "Pending", subtitle: "Awaiting validation", count: reviewSummary.pending, icon: Clock, variant: "warning" as const, tab: "pending" },
                        { label: "Total Templates", subtitle: "Form definitions", count: auditSummary.total, icon: FileText, variant: "default" as const, tab: "" },
                      ].map(item => {
                        const variantStyles = {
                          success: "bg-success/5 border-success/15 hover:bg-success/10",
                          warning: "bg-warning/5 border-warning/15 hover:bg-warning/10",
                          default: "bg-muted/10 border-border/50 hover:bg-muted/20",
                        };
                        const textStyles = {
                          success: "text-success",
                          warning: "text-warning",
                          default: "text-foreground",
                        };
                        return (
                          <div
                            key={item.label}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-sm border cursor-pointer transition-all duration-200 hover:scale-[1.01]",
                              variantStyles[item.variant]
                            )}
                            onClick={() => navigate(item.tab ? `/audit?tab=${item.tab}` : "/audit")}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className={cn("w-5 h-5", textStyles[item.variant])} />
                              <div>
                                <p className="text-sm font-semibold text-foreground">{item.label}</p>
                                <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
                              </div>
                            </div>
                            <span className={cn("text-2xl font-extrabold", textStyles[item.variant])}>{item.count}</span>
                          </div>
                        );
                      })}

                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Monthly velocity</span>
                          <span className="text-xs font-bold text-foreground">{monthlyComparison.currentMonth} records</span>
                        </div>
                        {monthlyComparison.percentageChange > 0 && (
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-sm font-mono",
                            monthlyComparison.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                          )}>
                            {monthlyComparison.isPositive ? "+" : "-"}{monthlyComparison.percentageChange}%
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
        </div>
      </div>
    </AppShell>
  );
}
