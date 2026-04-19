import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData } from "@/hooks/useQMSData";
import { RecordsTable } from "@/components/records/RecordsTable";
import { AuditCharts } from "@/components/audit/AuditCharts";
import { AuditFilters } from "@/components/audit/AuditFilters";
import { AutomatedAuditModal } from "@/components/audit/AutomatedAuditModal";
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
  PlayCircle,
  LayoutGrid,
  List
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { normalizeCategory, updateSheetCell, QMSRecord } from "@/lib/googleSheets";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
export default function AuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    const projectParam = params.get("project");
    const yearParam = params.get("year");
    const searchParam = params.get("search");

    if (tabParam && ["pending", "compliant", "issues", "overdue", "never-filled"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    if (projectParam) setProjectFilter(projectParam);
    if (yearParam) setYearFilter(yearParam);
    if (searchParam) setSearch(searchParam);
  }, [location.search]);

  const { data: records, isLoading, error, dataUpdatedAt, refetch } = useQMSData();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    refetch();
  };

  // Bulk status change: updates all files in a tab to a new status
  const handleBulkStatusChange = useCallback(async (items: QMSRecord[], newStatus: string) => {
    if (items.length === 0) return;
    setBulkLoading(true);
    const reviewerName = user?.name || user?.email || "System";

    try {
      // Group items by rowIndex (same record)
      const grouped = new Map<number, { record: QMSRecord; fileIds: string[] }>();
      items.forEach(item => {
        if (!grouped.has(item.rowIndex)) {
          grouped.set(item.rowIndex, { record: item, fileIds: [] });
        }
        grouped.get(item.rowIndex)!.fileIds.push(item.fileId);
      });

      let successCount = 0;
      for (const [rowIndex, { record, fileIds }] of grouped) {
        const updatedReviews = { ...(record.fileReviews || {}) };
        fileIds.forEach(fileId => {
          updatedReviews[fileId] = {
            ...(updatedReviews[fileId] || {}),
            status: newStatus,
            reviewedBy: reviewerName,
            date: new Date().toISOString(),
          };
        });

        const success = await updateSheetCell(rowIndex, 'P', JSON.stringify(updatedReviews));
        if (success) successCount += fileIds.length;
      }

      toast.success(`Bulk Update Complete`, { description: `${successCount} files changed to "${newStatus}"` });
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    } catch (error: unknown) {
      toast.error("Bulk Update Failed", { description: (error as Error).message });
    } finally {
      setBulkLoading(false);
    }
  }, [user, queryClient]);

  // Per-record approve: updates a single rejected file to 'approved'
  const handleApproveRecord = useCallback(async (item: QMSRecord) => {
    if (!item?.isAtomic || !item?.fileId) return;
    const reviewerName = user?.name || user?.email || "System";
    const today = new Date().toISOString().split('T')[0];
    
    // Create the audit trail comment
    const auditLog = `Approved individually by ${reviewerName} on ${today}`;
    const currentComment = item.fileReviews?.[item.fileId]?.comment || "";
    const newComment = currentComment 
      ? `${currentComment}\n\n[Audit Log]: ${auditLog}` 
      : `${auditLog}`;

    const updatedReviews = {
      ...(item.fileReviews || {}),
      // Set record status to approved as well to clear any integrity rejections
      recordStatus: 'approved',
      lastUpdated: new Date().toISOString(),
      [item.fileId]: {
        ...(item.fileReviews?.[item.fileId] || {}),
        status: 'approved',
        reviewedBy: reviewerName,
        date: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        comment: newComment,
      },
    };

    try {
      // 1. Update the JSON metadata in Column P
      const success = await updateSheetCell(item.rowIndex, 'P', JSON.stringify(updatedReviews));
      
      if (success) {
        // 2. Synchronize with summary columns (like statusService.updateRecordStatus does)
        // This makes the change visible in the main spreadsheet list as well
        await updateSheetCell(item.rowIndex, 'R', 'TRUE'); // Reviewed
        await updateSheetCell(item.rowIndex, 'N', reviewerName); // Reviewer
        await updateSheetCell(item.rowIndex, 'O', today); // Review Date
        
        toast.success("Record Approved", { description: `"${item.fileName || item.recordName}" has been approved and audit trail recorded.` });
        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } else {
        throw new Error("Update returned false");
      }
    } catch (err: unknown) {
      toast.error("Approval Failed", { description: (err as Error)?.message || "Could not update the record status." });
    }
  }, [user, queryClient]);

  // Export all metadata to JSON file
  const handleExportMetadata = useCallback(() => {
    if (!records) return;
    const metadata = records
      .filter(r => r.fileReviews && Object.keys(r.fileReviews).length > 0)
      .map(r => ({
        code: r.code,
        recordName: r.recordName,
        category: r.category,
        rowIndex: r.rowIndex,
        fileReviews: r.fileReviews,
      }));

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qms-metadata-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Metadata Exported", description: `${metadata.length} records exported` });
  }, [records, toast]);

  // Import metadata from JSON file
  const handleImportMetadata = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setBulkLoading(true);
      try {
        const text = await file.text();
        const metadata = JSON.parse(text);
        if (!Array.isArray(metadata)) throw new Error("Invalid file format");

        let successCount = 0;
        for (const item of metadata) {
          if (!item.rowIndex || !item.fileReviews) continue;
          const success = await updateSheetCell(item.rowIndex, 'P', JSON.stringify(item.fileReviews));
          if (success) successCount++;
        }

        toast.success("Metadata Imported", { description: `${successCount} records restored successfully` });
        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } catch (error: unknown) {
        toast.error("Import Failed", { description: (error as Error).message });
      } finally {
        setBulkLoading(false);
      }
    };
    input.click();
  }, [queryClient]);


  // All unique categories, projects, years
  const { categories, projects, years } = useMemo(() => {
    if (!records) return { categories: [], projects: [], years: [] };
    const cats = new Set<string>();
    const projs = new Set<string>();
    const yrs = new Set<string>();

    records.forEach(r => {
      if (r.category) cats.add(r.category);
      if (r.fileReviews) {
        Object.values(r.fileReviews).forEach((review: unknown) => {
          if (review.project) projs.add(review.project);
          if (review.targetYear) yrs.add(review.targetYear.toString());
        });
      }
    });
    return {
      categories: Array.from(cats).sort(),
      projects: Array.from(projs).sort(),
      years: Array.from(yrs).sort().reverse()
    };
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
    const matchesSearch = (r: QMSRecord) => {
      if (!search) return true;
      return (
        r.code?.toLowerCase().includes(searchLower) ||
        r.recordName?.toLowerCase().includes(searchLower) ||
        r.category?.toLowerCase().includes(searchLower) ||
        r.fileName?.toLowerCase().includes(searchLower)
      );
    };
    const matchesCategory = (r: QMSRecord) => categoryFilter === "all" || r.category === categoryFilter;

    const pending: QMSRecord[] = [];
    const compliant: QMSRecord[] = [];
    const issuesList: QMSRecord[] = [];

    records.forEach(record => {
      const files = record.files || [];
      const reviews = record.fileReviews || {};
      const recordLevelStatus = reviews?.recordStatus;

      files.forEach(file => {
        const review = reviews[file.id] || { status: 'pending_review', comment: '' };

        const effectiveStatus: string = review.status;

        const auditItem = {
          ...record,
          fileId: file.id,
          fileName: file.name,
          fileLink: file.webViewLink,
          fileStatus: effectiveStatus,
          fileComment: review.comment || (recordLevelStatus === 'rejected' ? "Automated Audit detected issues in this form." : ""),
          fileReviewedBy: review.reviewedBy || record.reviewedBy || "",
          fileTargetYear: review.targetYear ? review.targetYear.toString() : "2026",
          fileProject: review.project || "General",
          isAtomic: true
        };

        const rawProject = auditItem.fileProject || "General";
        const normalizedProject = (rawProject === "General / All Company") ? "General" : rawProject;
        const matchesProject = projectFilter === "all" || normalizedProject === projectFilter;
        const matchesYear = yearFilter === "all" || auditItem.fileTargetYear === yearFilter;
        const itemReviewDate = auditItem.reviewDate || review.reviewDate || "";
        const matchesDate = !dateFilter || itemReviewDate.startsWith(dateFilter) || itemReviewDate.includes(dateFilter);

        if (!matchesSearch(auditItem) || !matchesCategory(auditItem) || !matchesProject || !matchesYear || !matchesDate) return;

        if (effectiveStatus === 'approved') compliant.push(auditItem);
        else if (effectiveStatus === 'rejected') issuesList.push(auditItem);
        else pending.push(auditItem);
      });
    });

    // Overdue: spread as atomic records (file-level) for consistent display
    const overdue: QMSRecord[] = [];
    const neverFilled: QMSRecord[] = [];
    records.forEach(record => {
      if (!matchesSearch(record) || !matchesCategory(record)) return;
      const files = record.files || [];
      const reviews = record.fileReviews || {};

      if (record.isOverdue) {
        if (files.length > 0) {
          files.forEach(file => {
            const review = reviews[file.id] || { status: 'pending_review', comment: '' };
            overdue.push({
              ...record,
              fileId: file.id,
              fileName: file.name,
              fileLink: file.webViewLink,
              fileStatus: review.status || 'pending_review',
              fileComment: review.comment || "",
              fileReviewedBy: review.reviewedBy || record.reviewedBy || "",
              fileTargetYear: review.targetYear ? review.targetYear.toString() : "2026",
              fileProject: review.project || "General",
              isAtomic: true
            });
          });
        } else {
          overdue.push({ ...record, fileStatus: 'pending_review', isAtomic: true, fileName: record.recordName, fileId: '', fileProject: "General", fileTargetYear: "2026", fileReviewedBy: record.reviewedBy || "", fileComment: "" });
        }
      }

      if ((record.actualRecordCount || 0) === 0) {
        neverFilled.push({ ...record, fileStatus: 'pending_review', isAtomic: true, fileName: record.recordName, fileId: '', fileProject: "General", fileTargetYear: "2026", fileReviewedBy: record.reviewedBy || "", fileComment: "" });
      }
    });

    // Category breakdown for bar chart (unfiltered for full picture)
    const catMap = new Map<string, { compliant: number; pending: number; issues: number }>();
    records.forEach(record => {
      const cat = record.category || "Unknown";
      if (!catMap.has(cat)) catMap.set(cat, { compliant: 0, pending: 0, issues: 0 });
      const entry = catMap.get(cat)!;
      const files = record.files || [];
      const reviews = record.fileReviews || {};
      const recordLevelStatus = reviews?.recordStatus;

      files.forEach(file => {
        const review = reviews[file.id] || { status: 'pending_review' };
        let effectiveStatus = review.status;
        if (recordLevelStatus === 'rejected' && review.status === 'pending_review') {
            effectiveStatus = 'rejected';
        }

        if (effectiveStatus === 'approved') entry.compliant++;
        else if (effectiveStatus === 'rejected') entry.issues++;
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
  }, [records, search, categoryFilter, projectFilter, yearFilter, dateFilter]);

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
    const rows = currentTabData.map((r: QMSRecord) =>
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
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Audit Dashboard" }]}>
      <div className="space-y-5">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Audit Dashboard</h1>
                  <p className="text-xs text-muted-foreground">ISO 9001:2015 Compliance Review</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto pb-1">
                {lastUpdated && (
                  <span className="hidden lg:flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-sm border border-border/50 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-sm bg-success animate-pulse" />
                    Synced {lastUpdated}
                  </span>
                )}
                
                <Button onClick={() => setIsAuditModalOpen(true)} className="h-8 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] sm:text-xs shrink-0">
                  <PlayCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Run Audit</span>
                </Button>

                <Button onClick={handleExportMetadata} variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" disabled={!records || records.length === 0}>
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Backup</span>
                </Button>
                <Button onClick={handleImportMetadata} variant="outline" size="sm" className="h-8 gap-1.5 text-xs shrink-0" disabled={bulkLoading}>
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Restore</span>
                </Button>
                <Button onClick={handleRefresh} variant="outline" size="sm" className="h-8 gap-2 shrink-0" disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline">Sync</span>
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
                    "bg-card rounded-sm border border-border p-4 flex items-center gap-3 transition-colors",
                    s.tab && "cursor-pointer hover:shadow-sm",
                    activeTab === s.tab && "ring-1 ring-primary/30"
                  )}
                  onClick={() => s.tab && handleTabChange(s.tab)}
                >
                  <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center", s.bg)}>
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
            <div className="bg-card rounded-sm border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-foreground">Template Population Rate</span>
                <span className="text-2xl font-bold text-success">{complianceRate}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-sm h-2 overflow-hidden">
                <div className="bg-success h-2 rounded-sm transition-all duration-700" style={{ width: `${complianceRate}%` }} />
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
              projectFilter={projectFilter}
              onProjectChange={setProjectFilter}
              projects={projects}
              yearFilter={yearFilter}
              onYearChange={setYearFilter}
              years={years}
              dateFilter={dateFilter}
              onDateChange={setDateFilter}
              onExportCSV={handleExportCSV}
              totalFiltered={totalFilteredCount}
              totalAll={stats.pending + stats.compliant + stats.issues}
            />

            {/* Tabs */}
            <div className="bg-card rounded-sm border border-border overflow-hidden">
              <Tabs value={activeTab} onValueChange={handleTabChange}>
                <div className="px-5 py-2 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 overflow-x-auto overflow-y-hidden">
                  <TabsList className="bg-transparent h-11 p-0 gap-1 shrink-0">
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
                  
                  {/* View Toggle */}
                  <div className="hidden sm:flex items-center bg-muted/40 rounded-sm p-0.5 border border-border/50 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-10 mx-0 flex-shrink-0 p-0 rounded-md", viewMode === "compact" && "bg-background shadow-sm text-primary")}
                      onClick={() => setViewMode("compact")}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-8 w-10 mx-0 flex-shrink-0 p-0 rounded-md", viewMode === "card" && "bg-background shadow-sm text-primary")}
                      onClick={() => setViewMode("card")}
                      title="Card View"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <TabsContent value="pending" className="m-0">
                  {pendingRecords.length > 0 && (
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/20">
                      <Button
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        disabled={bulkLoading}
                        onClick={() => handleBulkStatusChange(pendingRecords, 'approved')}
                      >
                        {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                        Approve All ({pendingRecords.length})
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 gap-1.5 text-xs"
                        disabled={bulkLoading}
                        onClick={() => handleBulkStatusChange(pendingRecords, 'rejected')}
                      >
                        Reject All
                      </Button>
                    </div>
                  )}
                  <ErrorBoundary>
                    <RecordsTable records={pendingRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
                  </ErrorBoundary>
                </TabsContent>
                <TabsContent value="compliant" className="m-0">
                  {compliantRecords.length > 0 && (
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/20">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs"
                        disabled={bulkLoading}
                        onClick={() => handleBulkStatusChange(compliantRecords, 'pending_review')}
                      >
                        {bulkLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        Reset All to Pending ({compliantRecords.length})
                      </Button>
                    </div>
                  )}
                  <ErrorBoundary>
                    <RecordsTable records={compliantRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
                  </ErrorBoundary>
                </TabsContent>
                <TabsContent value="issues" className="m-0">
                  {issueRecords.length > 0 && (
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2 bg-muted/20 flex-wrap">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-success/10 border border-success/20 rounded-sm px-3 py-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                        <span>Use the <strong className="text-success">Approve</strong> button on each record below to approve individually</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1.5 text-xs ml-auto"
                        disabled={bulkLoading}
                        onClick={() => handleBulkStatusChange(issueRecords, 'pending_review')}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset All to Pending
                      </Button>
                    </div>
                  )}
                  <ErrorBoundary>
                    <RecordsTable
                      records={issueRecords}
                      isLoading={isLoading}
                      variant={viewMode === "card" ? "default" : "compact"}
                      onApproveRecord={handleApproveRecord}
                    />
                  </ErrorBoundary>
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
                  <ErrorBoundary>
                    <RecordsTable records={overdueRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} onApproveRecord={handleApproveRecord} />
                  </ErrorBoundary>
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
                  <ErrorBoundary>
                    <RecordsTable records={neverFilledRecords} isLoading={isLoading} variant={viewMode === "card" ? "default" : "compact"} />
                  </ErrorBoundary>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <AutomatedAuditModal
              isOpen={isAuditModalOpen}
              onClose={() => setIsAuditModalOpen(false)}
              records={records || []}
            />

          </div>
    </AppShell>
  );
}
