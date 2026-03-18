import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useQMSData } from "@/hooks/useQMSData";
import { RecordsTable } from "@/components/records/RecordsTable";
import { AuditCharts } from "@/components/audit/AuditCharts";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  FileX,
  CalendarClock,
  Loader2,
  ArrowRight,
  CheckCheck,
  RotateCcw,
  Download,
  Upload,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeCategory, updateSheetCell } from "@/lib/googleSheets";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
export default function AuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState("quality");
  const [activeTab, setActiveTab] = useState("pending");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam && ["pending", "compliant", "issues", "overdue", "never-filled"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    const handleToggle = (event: Event) => {
      setSidebarCollapsed((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);

  const { data: records, isLoading, error, dataUpdatedAt, refetch } = useQMSData();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    refetch();
  };

  const handleModuleChange = (newModuleId: string) => {
    setActiveModule(newModuleId);
    if (newModuleId === "dashboard") navigate("/");
    else if (newModuleId !== "documents") navigate(`/module/${newModuleId}`);
  };

  // All unique categories
  const categories = useMemo(() => {
    if (!records) return [];
    return [...new Set(records.map(r => r.category))].filter(Boolean).sort();
  }, [records]);

  // Filtered data
  const { pendingRecords, compliantRecords, issueRecords, overdueRecords, neverFilledRecords, stats, categoryBreakdown } = useMemo(() => {
    if (!records) return {
      pendingRecords: [], compliantRecords: [], issueRecords: [],
      overdueRecords: [], neverFilledRecords: [],
      stats: { pending: 0, compliant: 0, issues: 0, overdue: 0, neverFilled: 0, totalTemplates: 0, filledTemplatesCount: 0 },
      categoryBreakdown: [],
    };

    const searchLower = search.toLowerCase();
    const matchesSearch = (r: any) => {
      if (!search) return true;
      return (
        r.code?.toLowerCase().includes(searchLower) ||
        r.recordName?.toLowerCase().includes(searchLower) ||
        r.category?.toLowerCase().includes(searchLower) ||
        r.fileName?.toLowerCase().includes(searchLower)
      );
    };
    const matchesCategory = (r: any) => categoryFilter === "all" || r.category === categoryFilter;

    const pending: any[] = [];
    const compliant: any[] = [];
    const issuesList: any[] = [];

    records.forEach(record => {
      const files = record.files || [];
      const reviews = record.fileReviews || {};
      files.forEach(file => {
        const review = reviews[file.id] || { status: 'pending_review', comment: '' };
        const auditItem = {
          ...record, fileId: file.id, fileName: file.name, fileLink: file.webViewLink,
          fileStatus: review.status, fileComment: review.comment,
          fileReviewedBy: review.reviewedBy || record.reviewedBy || "", isAtomic: true
        };
        if (!matchesSearch(auditItem) || !matchesCategory(auditItem)) return;
        if (review.status === 'approved') compliant.push(auditItem);
        else if (review.status === 'rejected') issuesList.push(auditItem);
        else pending.push(auditItem);
      });
    });

    const filteredRecords = records.filter(r => matchesSearch(r) && matchesCategory(r));
    const overdue = filteredRecords.filter(r => r.isOverdue);
    const neverFilled = filteredRecords.filter(r => (r.actualRecordCount || 0) === 0);

    // Category breakdown for bar chart (unfiltered for full picture)
    const catMap = new Map<string, { compliant: number; pending: number; issues: number }>();
    records.forEach(record => {
      const cat = record.category || "Unknown";
      if (!catMap.has(cat)) catMap.set(cat, { compliant: 0, pending: 0, issues: 0 });
      const entry = catMap.get(cat)!;
      const files = record.files || [];
      const reviews = record.fileReviews || {};
      files.forEach(file => {
        const review = reviews[file.id] || { status: 'pending_review' };
        if (review.status === 'approved') entry.compliant++;
        else if (review.status === 'rejected') entry.issues++;
        else entry.pending++;
      });
    });
    const breakdown = Array.from(catMap.entries())
      .map(([category, data]) => ({ category: category.length > 12 ? category.slice(0, 12) + "…" : category, ...data }))
      .sort((a, b) => (b.compliant + b.pending + b.issues) - (a.compliant + a.pending + a.issues))
      .slice(0, 8);

    return {
      pendingRecords: pending, compliantRecords: compliant, issueRecords: issuesList,
      overdueRecords: overdue, neverFilledRecords: neverFilled,
      stats: {
        pending: pending.length, compliant: compliant.length, issues: issuesList.length,
        overdue: overdue.length, neverFilled: neverFilled.length,
        totalTemplates: records.length,
        filledTemplatesCount: records.filter(r => (r.actualRecordCount || 0) > 0).length,
      },
      categoryBreakdown: breakdown,
    };
  }, [records, search, categoryFilter]);

  // Current tab data for export
  const currentTabData = useMemo(() => {
    switch (activeTab) {
      case "pending": return pendingRecords;
      case "compliant": return compliantRecords;
      case "issues": return issueRecords;
      case "overdue": return overdueRecords;
      case "never-filled": return neverFilledRecords;
      default: return [];
    }
  }, [activeTab, pendingRecords, compliantRecords, issueRecords, overdueRecords, neverFilledRecords]);

  const handleExportCSV = useCallback(() => {
    if (currentTabData.length === 0) return;
    const isAtomic = currentTabData[0]?.isAtomic;
    const headers = isAtomic
      ? ["Code", "Record Name", "Category", "File Name", "Status", "Reviewed By"]
      : ["Code", "Record Name", "Category", "Description", "Last Filed", "Frequency"];
    const rows = currentTabData.map((r: any) =>
      isAtomic
        ? [r.code, r.recordName, r.category, r.fileName || "", r.fileStatus || "", r.fileReviewedBy || ""]
        : [r.code, r.recordName, r.category, r.description || "", r.lastFileDate || "", r.fillFrequency || ""]
    );

    const csvContent = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-${activeTab}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentTabData, activeTab]);

  const totalFilteredCount = pendingRecords.length + compliantRecords.length + issueRecords.length;

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  const complianceRate = stats.totalTemplates > 0
    ? Math.round((stats.filledTemplatesCount / stats.totalTemplates) * 100) : 0;

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/audit?tab=${value}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />

      <div className={cn("flex-1 flex flex-col ml-0 transition-all duration-300", sidebarCollapsed ? "md:ml-[60px]" : "md:ml-60")}>
        <Header />

        <main className="flex-1">
          <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-5">
            <Breadcrumbs items={[{ label: "Dashboard", path: "/" }, { label: "Audit Dashboard" }]} />

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Dashboard</h1>
                  <p className="text-xs text-muted-foreground">ISO 9001:2015 Compliance Review</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    Synced {lastUpdated}
                  </span>
                )}
                <Button onClick={handleRefresh} variant="outline" size="sm" className="h-8 gap-2" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Sync
                </Button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Templates", value: records?.length || 0, icon: Filter, color: "text-foreground", bg: "bg-muted/50", tab: null },
                { label: "Pending", value: stats.pending, icon: Clock, color: "text-warning", bg: "bg-warning/10", tab: "pending" },
                { label: "Approved", value: stats.compliant, icon: CheckCircle, color: "text-success", bg: "bg-success/10", tab: "compliant" },
                { label: "Issues", value: stats.issues, icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", tab: "issues" },
                { label: "Overdue", value: stats.overdue, icon: CalendarClock, color: "text-destructive", bg: "bg-destructive/10", tab: "overdue" },
                { label: "Never Filled", value: stats.neverFilled, icon: FileX, color: "text-warning", bg: "bg-warning/10", tab: "never-filled" },
              ].map(s => (
                <div
                  key={s.label}
                  className={cn(
                    "bg-card rounded-xl border border-border p-4 flex items-center gap-3 transition-colors",
                    s.tab && "cursor-pointer hover:shadow-sm",
                    activeTab === s.tab && "ring-1 ring-primary/30"
                  )}
                  onClick={() => s.tab && handleTabChange(s.tab)}
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", s.bg)}>
                    <s.icon className={cn("w-4 h-4", s.color)} />
                  </div>
                  <div>
                    <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                    <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <AuditCharts stats={stats} categoryBreakdown={categoryBreakdown} />

            {/* Compliance bar */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Template Population Rate</span>
                <span className="text-2xl font-bold text-success">{complianceRate}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-2 overflow-hidden">
                <div className="bg-success h-2 rounded-full transition-all duration-700" style={{ width: `${complianceRate}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                {stats.filledTemplatesCount} of {stats.totalTemplates} templates populated
              </p>
            </div>

            {/* Filters */}
            <AuditFilters
              search={search}
              onSearchChange={setSearch}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              categories={categories}
              onExportCSV={handleExportCSV}
              totalFiltered={totalFilteredCount}
              totalAll={stats.pending + stats.compliant + stats.issues}
            />

            {/* Tabs */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="px-5 py-2 border-b border-border overflow-x-auto">
                  <TabsList className="bg-transparent h-11 p-0 gap-1">
                    {[
                      { value: "pending", label: "Pending", icon: Clock, count: pendingRecords.length, color: "data-[state=active]:text-warning data-[state=active]:border-warning" },
                      { value: "compliant", label: "Approved", icon: CheckCircle, count: compliantRecords.length, color: "data-[state=active]:text-success data-[state=active]:border-success" },
                      { value: "issues", label: "Issues", icon: AlertTriangle, count: issueRecords.length, color: "data-[state=active]:text-destructive data-[state=active]:border-destructive" },
                      { value: "overdue", label: "Overdue", icon: CalendarClock, count: overdueRecords.length, color: "data-[state=active]:text-destructive data-[state=active]:border-destructive" },
                      { value: "never-filled", label: "Never Filled", icon: FileX, count: neverFilledRecords.length, color: "data-[state=active]:text-warning data-[state=active]:border-warning" },
                    ].map(t => (
                      <TabsTrigger
                        key={t.value}
                        value={t.value}
                        className={cn(
                          "data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent rounded-none h-11 px-3 gap-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                          t.color
                        )}
                      >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label} ({t.count})
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <TabsContent value="pending" className="m-0">
                  <RecordsTable records={pendingRecords} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="compliant" className="m-0">
                  <RecordsTable records={compliantRecords} isLoading={isLoading} />
                </TabsContent>
                <TabsContent value="issues" className="m-0">
                  <RecordsTable records={issueRecords} isLoading={isLoading} />
                </TabsContent>

                {/* Overdue tab */}
                <TabsContent value="overdue" className="m-0">
                  {overdueRecords.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle className="w-10 h-10 text-success/30 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground">No overdue records</p>
                      <p className="text-xs text-muted-foreground mt-1">All records are up to date</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {overdueRecords.map(record => (
                        <div
                          key={record.rowIndex}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => {
                            const mod = normalizeCategory(record.category);
                            if (mod?.id) navigate(`/module/${mod.id}`);
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                              <CalendarClock className="w-4 h-4 text-destructive" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-primary/70">{record.code}</span>
                                <span className="text-xs font-semibold text-foreground truncate">{record.recordName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">{record.category}</span>
                                {record.fillFrequency && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-destructive font-semibold">Freq: {record.fillFrequency}</span>
                                  </>
                                )}
                                {record.lastFileDate && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground">Last: {record.lastFileDate}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Never Filled tab */}
                <TabsContent value="never-filled" className="m-0">
                  {neverFilledRecords.length === 0 ? (
                    <div className="p-12 text-center">
                      <CheckCircle className="w-10 h-10 text-success/30 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground">All templates have records</p>
                      <p className="text-xs text-muted-foreground mt-1">No empty templates found</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {neverFilledRecords.map(record => (
                        <div
                          key={record.rowIndex}
                          className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => navigate(`/record/${encodeURIComponent(record.code)}`)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
                              <FileX className="w-4 h-4 text-warning" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-primary/70">{record.code}</span>
                                <span className="text-xs font-semibold text-foreground truncate">{record.recordName}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-muted-foreground">{record.category}</span>
                                {record.description && (
                                  <>
                                    <span className="text-[10px] text-muted-foreground">·</span>
                                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{record.description}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {record.templateLink && (
                              <a
                                href={record.templateLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-semibold text-primary hover:underline"
                                onClick={e => e.stopPropagation()}
                              >
                                Template
                              </a>
                            )}
                            <ArrowRight className="w-4 h-4 text-muted-foreground/30" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
