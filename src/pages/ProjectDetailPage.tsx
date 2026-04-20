import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData } from "@/hooks/useQMSData";
import type { FileReview } from "@/lib/googleSheets";
import {
  Briefcase,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  FolderOpen,
  FileText,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordsTable } from "@/components/records/RecordsTable";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const { data: records, isLoading, isError, error, refetch } = useQMSData();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");

  const decodedProject = decodeURIComponent(projectName || "");

  const projectRecords = useMemo(() => {
    if (!records) return [];

    return records.filter(record => {
      if (!record.fileReviews) return false;

      // Filter the fileReviews within the record too
      const reviews = Object.entries(record.fileReviews).filter(([fileId, review]: [string, FileReview]) => {
        // Only count existing files
        const fileExists = record.files?.some(f => f.id === fileId);
        if (!fileExists) return false;

        const rawProj = review.project || "General";
        const normalizedProj = (rawProj === "General / All Company") ? "General" : rawProj;
        return normalizedProj === decodedProject;
      });

      return reviews.length > 0;
    }).map(record => {
        // Only keep reviews relevant to this project for display in this view
        const relevantReviews: Record<string, FileReview> = {};
        const existingFileIds = new Set(record.files?.map(f => f.id) || []);

        Object.entries(record.fileReviews || {}).forEach(([fileId, review]: [string, FileReview]) => {
            // IMPORTANT: Only count the review if the file still exists in the Drive folder
            if (!existingFileIds.has(fileId)) return;

            const rawProj = review.project || "General";
            const normalizedProj = (rawProj === "General / All Company") ? "General" : rawProj;
            if (normalizedProj === decodedProject) {
              relevantReviews[fileId] = review;
            }
        });
        // Calculate a representative status for the record based on filtered project files
        const reviewsArr = Object.values(relevantReviews);
        let status = "Pending";
        if (reviewsArr.length > 0) {
            if (reviewsArr.every((rev: unknown) => rev.status === 'approved')) status = "Compliant ✅";
            else if (reviewsArr.some((rev: unknown) => rev.status === 'rejected' || rev.status === 'nc')) status = "Rejected ❌";
        }

        return { ...record, fileReviews: relevantReviews, auditStatus: status, isAtomic: false };
    });
  }, [records, decodedProject]);

  const stats = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0;
    projectRecords.forEach(r => {
        if (r.fileReviews) {
            Object.values(r.fileReviews).forEach((rev: unknown) => {
                if (rev.status === 'approved') approved++;
                else if (rev.status === 'rejected') rejected++;
                else pending++;
            });
        }
    });
    return { approved, pending, rejected, total: approved + pending + rejected };
  }, [projectRecords]);

  const filteredRecords = useMemo(() => {
    return projectRecords.filter(r => {
        const matchesSearch = r.recordName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             r.description?.toLowerCase().includes(searchQuery.toLowerCase());

        const reviews = Object.values(r.fileReviews || {});
        const matchesTab = activeTab === "all" ||
                          (activeTab === "pending" && reviews.some((rev: unknown) => rev.status !== 'approved' && rev.status !== 'rejected')) ||
                          (activeTab === "compliant" && reviews.every((rev: unknown) => rev.status === 'approved')) ||
                          (activeTab === "issues" && reviews.some((rev: unknown) => rev.status === 'rejected'));

        return matchesSearch && matchesTab;
    });
  }, [projectRecords, searchQuery, activeTab]);

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects", path: "/projects" }, { label: decodedProject }]} maxWidth="max-w-[1600px]">
      <div className="space-y-8">
        <PageHeader
              icon={Briefcase}
              iconClassName="text-primary"
              title={decodedProject}
              description={`Detailed view of all records and compliance status for project ${decodedProject}.`}
            >
              <div className="flex h-11 p-1 bg-card border border-border/40 rounded-sm">
                  <Button
                      variant="ghost"
                      size="sm"
                      className={cn("px-3 rounded-sm gap-2 font-bold transition-all", viewMode === "compact" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground")}
                      onClick={() => setViewMode("compact")}
                  >
                      <List className="w-4 h-4" />
                      Rows
                  </Button>
                  <Button
                      variant="ghost"
                      size="sm"
                      className={cn("px-3 rounded-sm gap-2 font-bold transition-all", viewMode === "card" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground")}
                      onClick={() => setViewMode("card")}
                  >
                      <LayoutGrid className="w-4 h-4" />
                      Cards
                  </Button>
              </div>
             </PageHeader>

        {/* Decision Banner */}
        {stats.rejected > 0 ? (
          <DecisionBanner
            priority="critical"
            title={`${stats.rejected} Issue${stats.rejected > 1 ? "s" : ""} Need Attention`}
            description="Rejected records require immediate review before your next audit."
            action={{ label: `Fix ${stats.rejected} Issue${stats.rejected > 1 ? "s" : ""}`, onClick: () => setActiveTab("issues") }}
          />
        ) : stats.pending > 0 ? (
          <DecisionBanner
            priority="info"
            title={`${stats.pending} Record${stats.pending > 1 ? "s" : ""} Pending Review`}
            description="Approve pending records to maintain compliance status."
            action={{ label: `Review ${stats.pending} Pending`, onClick: () => setActiveTab("pending") }}
          />
        ) : stats.total > 0 && stats.approved === stats.total ? (
          <DecisionBanner
            priority="success"
            title="All Records Compliant"
            description="No outstanding actions needed for this project."
          />
        ) : null}

        <StatsRow stats={[
          { icon: FolderOpen, value: stats.total, label: "Total Files", variant: "default" },
          { icon: CheckCircle2, value: stats.approved, label: "Approved", variant: "success" },
          { icon: Clock, value: stats.pending, label: "Pending", variant: "warning" },
          { icon: AlertCircle, value: stats.rejected, label: "Issues", variant: "destructive" },
        ]} />

        {/* Overall Progress Bar */}
        {stats.total > 0 && (
          <div className="bg-card rounded-sm border border-border/50 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Overall Compliance</span>
              <span className="text-sm font-black text-foreground">{Math.round((stats.approved / stats.total) * 100)}%</span>
            </div>
            <div className="w-full bg-muted/30 rounded-sm h-2.5 overflow-hidden">
              <div className={cn(
                "h-2.5 rounded-sm transition-all duration-700",
                (stats.approved / stats.total) > 0.7 ? "bg-success" : (stats.approved / stats.total) > 0.3 ? "bg-primary" : "bg-warning"
              )} style={{ width: `${Math.round((stats.approved / stats.total) * 100)}%` }} />
            </div>
          </div>
        )}

        <div className="space-y-6">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs h-9"
              onClick={() => navigate(`/audit?project=${encodeURIComponent(decodedProject)}&tab=pending`)}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Open in Audit
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="bg-muted/50 p-1 rounded-sm h-11 border border-border/40">
                  <TabsTrigger value="all" className="rounded-sm font-bold px-6">All</TabsTrigger>
                  <TabsTrigger value="pending" className="rounded-sm font-bold px-6">Pending</TabsTrigger>
                  <TabsTrigger value="compliant" className="rounded-sm font-bold px-6 text-success data-[state=active]:bg-success data-[state=active]:text-success-foreground">Compliant</TabsTrigger>
                  <TabsTrigger value="issues" className="rounded-sm font-bold px-6 text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">Issues</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search records..."
                  className="pl-10 h-11 bg-card border-border/50 rounded-sm shadow-inner font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
           </div>

           <div className="ds-card-elevated rounded-sm p-4 md:p-8 min-h-[400px]">
              {isError ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Failed to load project data</h3>
                    <p className="text-muted-foreground text-sm mb-4">{error?.message || "An error occurred while fetching data."}</p>
                    <Button variant="outline" onClick={() => refetch()}><RefreshCw className="w-4 h-4 mr-2" />Try Again</Button>
                  </div>
              ) : isLoading ? (
                  <div className="flex items-center justify-center h-full py-20">
                      <Clock className="w-10 h-10 animate-spin text-primary/30" />
                  </div>
              ) : filteredRecords.length > 0 ? (
                  <RecordsTable
                      records={filteredRecords}
                      variant={viewMode === "card" ? "default" : "compact"}
                  />
              ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                      <div className="w-20 h-20 bg-muted/50 rounded-sm flex items-center justify-center">
                          <FileText className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold">No records found</h3>
                          <p className="text-muted-foreground">No records match your current filter or search criteria for this project.</p>
                      </div>
                  </div>
              )}
           </div>
        </div>
      </div>
    </AppShell>
  );
}