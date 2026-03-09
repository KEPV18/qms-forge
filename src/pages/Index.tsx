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
  ShieldCheck,
  TrendingUp,
  BarChart3,
  Zap,
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

  const rejectedCount = (records ?? []).filter(r => {
    const reviews = (r.fileReviews || {}) as Record<string, { status?: string }>;
    const statuses = Object.values(reviews).map(rev => (rev.status || "").toLowerCase());
    const approvedCount = statuses.filter(s => s === "approved" || s === "✅" || s.includes("approved")).length;
    const rejCount = statuses.filter(s => s === "rejected" || s.includes("invalid") || s === "❌").length;
    return rejCount > 0 && rejCount >= approvedCount;
  }).length;

  const totalEvidence = records?.reduce((sum, r) => sum + (r.actualRecordCount || 0), 0) || 0;
  const gapsCount = records?.filter(r => (r.actualRecordCount || 0) === 0).length || 0;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ml-0",
        sidebarCollapsed ? "md:ml-[60px]" : "md:ml-60"
      )}>
        <Header />

        <main className="flex-1 overflow-auto">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-8">

            {/* Hero Section - Bold gradient */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-primary/70 p-8 md:p-10 shadow-xl shadow-primary/10">
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[11px] font-bold text-white/80 uppercase tracking-[0.2em]">Quality Management System</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Dashboard</h1>
                  <p className="text-sm text-white/60 mt-1">ISO 9001:2015 Compliance Overview</p>
                </div>
                <div className="flex items-center gap-3">
                  {lastUpdated && (
                    <div className="hidden sm:flex items-center gap-2 text-[11px] text-white/70 bg-white/10 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      Synced {lastUpdated}
                    </div>
                  )}
                  <Button onClick={handleRefresh} size="sm" className="h-10 gap-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/20 shadow-none" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Sync
                  </Button>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-xl" />
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
                    <div className="w-2 h-8 rounded-full bg-gradient-to-b from-primary to-primary/30" />
                    <div>
                      <h2 className="text-xl font-extrabold text-foreground tracking-tight">System Modules</h2>
                      <p className="text-xs text-muted-foreground">ISO 9001:2015 organizational structure</p>
                    </div>
                  </div>
                  {!isLoading && records && (
                    <div className="flex items-center gap-2 text-xs font-bold text-primary bg-primary/8 px-4 py-2 rounded-full border border-primary/15">
                      <Zap className="w-3.5 h-3.5" />
                      {auditSummary.total} templates
                    </div>
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
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Review Pipeline</h3>
                    <p className="text-[10px] text-muted-foreground">Verification progress</p>
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  {isLoading ? (
                    [1, 2, 3].map(i => <div key={i} className="h-16 bg-muted/10 animate-pulse rounded-xl" />)
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
                              "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01]",
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
                            "text-[10px] font-bold px-2 py-0.5 rounded-md",
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
