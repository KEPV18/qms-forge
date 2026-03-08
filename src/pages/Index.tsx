import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Settings,
  ClipboardCheck,
  ShoppingCart,
  GraduationCap,
  Lightbulb,
  Building2,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

const moduleIcons: Record<string, LucideIcon> = {
  sales: Users,
  operations: Settings,
  quality: ClipboardCheck,
  procurement: ShoppingCart,
  hr: GraduationCap,
  rnd: Lightbulb,
  management: Building2,
};

const moduleDescriptions: Record<string, { description: string; isoClause: string }> = {
  sales: { description: "Customer lifecycle from requirements to post-delivery feedback.", isoClause: "Clause 8.2, 9.1.2" },
  operations: { description: "Operational activities, project timelines & resource scheduling.", isoClause: "Clause 8.1, 8.5" },
  quality: { description: "Quality control, nonconformity handling & corrective actions.", isoClause: "Clause 9, 10" },
  procurement: { description: "Vendor qualification and purchased items quality assurance.", isoClause: "Clause 8.4" },
  hr: { description: "Personnel competence, training records & performance appraisals.", isoClause: "Clause 7.2, 7.3" },
  rnd: { description: "Innovation, development requests & technical validation.", isoClause: "Clause 8.3" },
  management: { description: "Governance, documentation, KPI tracking & leadership decisions.", isoClause: "Clause 5, 6, 7.5" },
};

export default function Index() {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleToggle = (event: Event) => {
      setSidebarCollapsed((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);

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

  const rejectedCount = (records ?? []).reduce((acc, r) => {
    const reviews = (r.fileReviews || {}) as Record<string, { status?: string }>;
    Object.values(reviews).forEach(rev => {
      if ((rev.status || "").toLowerCase() === "rejected") acc++;
    });
    return acc;
  }, 0);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ml-0",
        sidebarCollapsed ? "md:ml-[60px]" : "md:ml-60"
      )}>
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-6 md:p-8 space-y-6">

            {/* Welcome bar */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
                <p className="text-sm text-muted-foreground">ISO 9001:2015 Quality Management System</p>
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Synced {lastUpdated}
                  </div>
                )}
                <Button onClick={handleRefresh} variant="outline" size="sm" className="h-8 gap-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync
                </Button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div onClick={() => navigate("/audit?tab=pending")} className="cursor-pointer">
                <StatusCard
                  title="Evidence"
                  value={records?.reduce((sum, r) => sum + (r.actualRecordCount || 0), 0) || 0}
                  subtitle="Files collected"
                  icon={FileText}
                  variant="default"
                  trend={monthlyComparison.percentageChange > 0 ? { value: monthlyComparison.percentageChange, isPositive: monthlyComparison.isPositive } : undefined}
                  isLoading={isLoading}
                />
              </div>
              <div onClick={() => navigate("/audit?tab=compliant")} className="cursor-pointer">
                <StatusCard title="Certified" value={reviewSummary.completed} subtitle="Approved records" icon={CheckCircle} variant="success" isLoading={isLoading} />
              </div>
              <div onClick={() => navigate("/audit?tab=pending")} className="cursor-pointer">
                <StatusCard title="Pending" value={reviewSummary.pending} subtitle="Awaiting review" icon={Clock} variant="warning" isLoading={isLoading} />
              </div>
              <div onClick={() => navigate("/audit")} className="cursor-pointer">
                <StatusCard title="Gaps" value={records?.filter(r => (r.actualRecordCount || 0) === 0).length || 0} subtitle="Empty records" icon={AlertTriangle} variant="warning" isLoading={isLoading} />
              </div>
              <div onClick={() => navigate("/audit?tab=issues")} className="cursor-pointer">
                <StatusCard title="Rejected" value={rejectedCount} subtitle="Needs attention" icon={AlertTriangle} variant="destructive" isLoading={isLoading} />
              </div>
            </div>

            {/* Main grid: Modules + Sidebar widgets */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              {/* Modules */}
              <div className="xl:col-span-8 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">System Modules</h2>
                  {!isLoading && records && (
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-md border border-border/50">
                      {auditSummary.total} definitions
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {!isLoading && moduleStats.map(module => {
                    const Icon = moduleIcons[module.id] || FileText;
                    const meta = moduleDescriptions[module.id] || { description: "QMS module.", isoClause: "ISO 9001" };
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

              {/* Right sidebar */}
              <div className="xl:col-span-4 space-y-5">
                <QuickActions />
                <AuditReadiness
                  moduleStats={moduleStats}
                  complianceRate={auditSummary.complianceRate}
                  isLoading={isLoading}
                  onRefresh={handleRefresh}
                  emptyFormsCount={records?.filter(r => (r.actualRecordCount || 0) === 0).length || 0}
                />
                <PendingActions records={records ?? []} isLoading={isLoading} />
              </div>
            </div>

            {/* Activity & Review Pipeline */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity records={activity} isLoading={isLoading} />

              {/* Review Pipeline */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Review Pipeline</h3>
                    <p className="text-[10px] text-muted-foreground">Verification status</p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-14 bg-muted/10 animate-pulse rounded-lg" />)
                  ) : (
                    <>
                      <div
                        className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/10 cursor-pointer hover:bg-success/10 transition-colors"
                        onClick={() => navigate("/audit?tab=compliant")}
                      >
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-success" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Approved</p>
                            <p className="text-[10px] text-success/70">Verified compliant</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-success">{reviewSummary.completed}</span>
                      </div>

                      <div
                        className="flex items-center justify-between p-4 rounded-lg bg-warning/5 border border-warning/10 cursor-pointer hover:bg-warning/10 transition-colors"
                        onClick={() => navigate("/audit?tab=pending")}
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5 text-warning" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Pending</p>
                            <p className="text-[10px] text-warning/70">Awaiting validation</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-warning">{reviewSummary.pending}</span>
                      </div>

                      <div
                        className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => navigate("/audit")}
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">Total Definitions</p>
                            <p className="text-[10px] text-muted-foreground">Form templates</p>
                          </div>
                        </div>
                        <span className="text-2xl font-bold text-foreground">{auditSummary.total}</span>
                      </div>

                      {/* Monthly velocity */}
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Monthly velocity</span>
                          <span className="text-xs font-bold text-foreground">{monthlyComparison.currentMonth} records</span>
                        </div>
                        {monthlyComparison.percentageChange > 0 && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
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
        </main>
        <Footer />
      </div>
    </div>
  );
}
