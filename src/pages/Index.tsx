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
  AlertCircle,
  Loader2,
  Shield,
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
  sales: {
    description: "Manage customer lifecycle from requirements capture to post-delivery feedback and satisfaction tracking.",
    isoClause: "Clause 8.2, 9.1.2",
  },
  operations: {
    description: "Plan, control, and execute operational activities with project timelines and resource scheduling.",
    isoClause: "Clause 8.1, 8.5",
  },
  quality: {
    description: "Core module for quality control, nonconformity handling, internal audits, and corrective actions.",
    isoClause: "Clause 9, 10",
  },
  procurement: {
    description: "Ensure all purchased items and vendors meet quality requirements with approval workflows.",
    isoClause: "Clause 8.4",
  },
  hr: {
    description: "Track personnel competence, training records, and performance appraisals.",
    isoClause: "Clause 7.2, 7.3",
  },
  rnd: {
    description: "Manage innovation, development requests, and technical validation processes.",
    isoClause: "Clause 8.3",
  },
  management: {
    description: "Control governance, documentation, KPI tracking, and leadership decisions.",
    isoClause: "Clause 5, 6, 7.5",
  },
};

import { PendingActions } from "@/components/dashboard/PendingActions";

export default function Index() {
  const [activeModule, setActiveModule] = useState("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setSidebarCollapsed(customEvent.detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);

  // Fetch live data from Google Sheets
  const { data: records, isLoading, isError, refetch, dataUpdatedAt } = useQMSData();

  // Derived data
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
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load QMS Data</h2>
          <p className="text-muted-foreground mb-4">Could not connect to Google Sheets data source.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const complianceRate = auditSummary?.complianceRate || 0;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />

      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 ml-0",
        sidebarCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <Header />

        <main className="flex-1 p-6 md:p-10 overflow-auto bg-slate-50/30 dark:bg-black">
          <div className="max-w-[1600px] mx-auto space-y-10 animate-fade-in">
            {/* High-Impact Hero Section */}
            <div className="relative overflow-hidden glass-card rounded-3xl p-8 md:p-12 glass-sheen">
              {/* Abstract decorative background elements */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-fade-in" />
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-fade-in" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold mb-4 border border-primary/20 tracking-wider uppercase">
                    <Shield className="w-3 h-3" />
                    Enterprise QMS Dashboard
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tighter leading-[1.05] font-heading">
                    Quality Management <br />
                    <span className="text-primary bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">Command Center</span>
                  </h1>
                  <p className="text-lg md:text-xl text-muted-foreground font-medium leading-relaxed max-w-xl">
                    Full-spectrum compliance management supporting ISO 9001:2015 standards with real-time record synchronization.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="glass-card bg-background/20 backdrop-blur-xl border-white/10 p-6 rounded-2xl shadow-xl text-center min-w-[200px] border border-sidebar-border/50">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em] mb-2 opacity-60">Platform Status</p>
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-success mb-1">
                      <div className="w-2 h-2 rounded-full bg-success animate-glow-pulse" />
                      Live & Secure
                    </div>
                    {lastUpdated && (
                      <p className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase font-mono opacity-50">Synced {lastUpdated}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleRefresh}
                    size="lg"
                    className="h-20 px-10 rounded-2xl text-lg font-bold gap-3 shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)] hover:shadow-[0_15px_25px_-5px_rgba(59,130,246,0.4)] transition-all duration-300 border border-white/10 bg-gradient-to-br from-primary to-blue-600"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <RefreshCw className="h-6 w-6" />
                    )}
                    Sync QMS Data
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* 1. Evidence Collected */}
              <div onClick={() => navigate("/audit?tab=pending")} className="cursor-pointer group">
                <StatusCard
                  title="Evidence Collected"
                  value={records?.reduce((sum, r) => sum + (r.actualRecordCount || 0), 0) || 0}
                  subtitle="Files in central repository"
                  icon={CheckCircle}
                  variant="success"
                  trend={monthlyComparison.percentageChange > 0 ? {
                    value: monthlyComparison.percentageChange,
                    isPositive: monthlyComparison.isPositive,
                  } : undefined}
                  isLoading={isLoading}
                />
              </div>

              {/* 2. Certified Records */}
              <div onClick={() => navigate("/audit?tab=compliant")} className="cursor-pointer group">
                <StatusCard
                  title="Certified Records"
                  value={reviewSummary.completed}
                  subtitle="Approved evidence"
                  icon={CheckCircle}
                  variant="success"
                  isLoading={isLoading}
                />
              </div>

              {/* 3. Verification Pipeline */}
              <div onClick={() => navigate("/audit?tab=pending")} className="cursor-pointer group">
                <StatusCard
                  title="Verification Pipeline"
                  value={reviewSummary.pending}
                  subtitle="Awaiting final review"
                  icon={Clock}
                  variant="warning"
                  isLoading={isLoading}
                />
              </div>

              {/* 4. Compliance Gaps */}
              <div onClick={() => navigate("/audit")} className="cursor-pointer group">
                <StatusCard
                  title="Compliance Gaps"
                  value={records?.filter(r => (r.actualRecordCount || 0) === 0).length || 0}
                  subtitle="Empty record areas"
                  icon={AlertTriangle}
                  variant="warning"
                  isLoading={isLoading}
                />
              </div>

              {/* 5. Rejected Files */}
              {(() => {
                const issuesCount = (records ?? []).reduce((acc, r) => {
                  const files = r.files || [];
                  const reviews = (r.fileReviews || {}) as Record<string, { status?: string }>;
                  files.forEach(f => {
                    const rev = reviews[f.id] || { status: "pending_review" };
                    if ((rev.status || "").toLowerCase() === "rejected") acc++;
                  });
                  return acc;
                }, 0);
                return (
                  <div onClick={() => navigate("/audit?tab=issues")} className="cursor-pointer group">
                    <StatusCard
                      title="Rejected Files"
                      value={issuesCount}
                      subtitle="Requires attention"
                      icon={AlertTriangle}
                      variant="destructive"
                      isLoading={isLoading}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
              {/* Modules Grid - Now 2 Column Layout internally */}
              <div className="xl:col-span-8 space-y-8">
                <div className="flex items-end justify-between border-l-4 border-primary pl-6 py-2">
                  <div>
                    <h2 className="text-3xl font-black text-foreground tracking-tight">System Modules</h2>
                    <p className="text-muted-foreground font-medium">Navigating ISO 9001:2015 Operational Control</p>
                  </div>
                  {!isLoading && records && (
                    <div className="hidden sm:block text-xs font-bold text-primary bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                      {auditSummary.total} DOCUMENT DEFINITIONS
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {!isLoading &&
                    moduleStats.map((module) => {
                      const Icon = moduleIcons[module.id] || FileText;
                      const meta = moduleDescriptions[module.id] || {
                        description: "QMS module records and documentation.",
                        isoClause: "ISO 9001:2015",
                      };

                      return (
                        <div
                          key={module.id}
                          onClick={() => navigate(`/module/${module.id}`)}
                          className="cursor-pointer group h-full"
                        >
                          <ModuleCard
                            title={module.name}
                            description={meta.description}
                            icon={Icon}
                            moduleClass={`module-${module.id}`}
                            stats={{
                              formsCount: module.formsCount,
                              recordsCount: module.recordsCount,
                              pendingCount: module.pendingCount,
                              issuesCount: module.issuesCount,
                            }}
                            isoClause={meta.isoClause}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Sidebar Widgets Area */}
              <div className="xl:col-span-4 space-y-8">
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

            {/* Enhanced Recent Activity & Stats */}
            <div className="space-y-8">
              <div className="border-l-4 border-accent pl-6 py-2">
                <h2 className="text-3xl font-black text-foreground tracking-tight">Activity & Insights</h2>
                <p className="text-muted-foreground font-medium">Monitoring system throughput and documentation lifecycle</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <RecentActivity records={activity} isLoading={isLoading} />

                {/* Enhanced Review Status */}
                <div className="bg-card rounded-3xl border border-border shadow-md overflow-hidden flex flex-col">
                  <div className="p-8 border-b border-border/50 bg-muted/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-foreground">Review Pipeline</h3>
                        <p className="text-sm text-muted-foreground font-medium">Verification status distribution</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-5 flex-1">
                    {isLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-20 bg-muted/10 animate-pulse rounded-2xl" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div
                          className="flex items-center justify-between p-6 rounded-2xl bg-success/5 border border-success/10 cursor-pointer hover:bg-success/10 transition-all duration-300 group shadow-sm hover:shadow"
                          onClick={() => navigate("/audit?tab=compliant")}
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                              <CheckCircle className="w-6 h-6 text-success" />
                            </div>
                            <div>
                              <div className="text-lg font-bold text-foreground">Approved Evidence</div>
                              <div className="text-xs text-success/70 font-semibold uppercase tracking-wider">Verified compliant</div>
                            </div>
                          </div>
                          <span className="text-4xl font-black text-success tracking-tighter">{reviewSummary.completed}</span>
                        </div>

                        <div
                          className="flex items-center justify-between p-6 rounded-2xl bg-warning/5 border border-warning/10 cursor-pointer hover:bg-warning/10 transition-all duration-300 group shadow-sm hover:shadow"
                          onClick={() => navigate("/audit?tab=pending")}
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                              <Clock className="w-6 h-6 text-warning" />
                            </div>
                            <div>
                              <div className="text-lg font-bold text-foreground">Pending Review</div>
                              <div className="text-xs text-warning/70 font-semibold uppercase tracking-wider">Awaiting validation</div>
                            </div>
                          </div>
                          <span className="text-4xl font-black text-warning tracking-tighter">{reviewSummary.pending}</span>
                        </div>

                        <div
                          className="flex items-center justify-between p-6 rounded-2xl bg-muted/20 border border-border/50 cursor-pointer hover:bg-muted/30 transition-all duration-300 group shadow-sm hover:shadow"
                          onClick={() => navigate("/audit")}
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="text-lg font-bold text-foreground">Total Definitions</div>
                              <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">System form templates</div>
                            </div>
                          </div>
                          <span className="text-4xl font-black text-foreground tracking-tighter">{auditSummary.total}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-6 border-t border-border/50 bg-slate-50/50 dark:bg-muted/5 mt-auto">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">Monthly Velocity</div>
                          <div className="text-xs text-muted-foreground font-medium">{monthlyComparison.currentMonth} records added this cycle</div>
                        </div>
                      </div>
                      {monthlyComparison.percentageChange > 0 && (
                        <div className={cn(
                          "px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5",
                          monthlyComparison.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        )}>
                          <span>{monthlyComparison.isPositive ? "↗" : "↘"}</span>
                          <span>{monthlyComparison.isPositive ? "+" : "-"}{monthlyComparison.percentageChange}%</span>
                        </div>
                      )}
                    </div>
                  </div>
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
