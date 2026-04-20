import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData } from "@/hooks/useQMSData";
import type { FileReview } from "@/lib/googleSheets";
import {
  Briefcase,
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  LayoutGrid,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, isError, error, refetch } = useQMSData();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<string>("files-desc");

  const projectStats = useMemo(() => {
    if (!records) return [];

    const statsMap: Record<string, {
      name: string;
      totalFiles: number;
      approved: number;
      pending: number;
      rejected: number;
      lastActivity: Date | null;
    }> = {};

    records.forEach(record => {
      // Only count records that have actual files and reviews
      if (record.fileReviews && record.files) {
        const existingFileIds = new Set(record.files.map(f => f.id));

        Object.entries(record.fileReviews).forEach(([fileId, review]: [string, FileReview]) => {
          // IMPORTANT: Only count the review if the file still exists in the Drive folder
          if (!existingFileIds.has(fileId)) return;

          const rawName = review.project || "General";
          const projectName = (rawName === "General / All Company") ? "General" : rawName;
          if (!statsMap[projectName]) {
            statsMap[projectName] = {
              name: projectName,
              totalFiles: 0,
              approved: 0,
              pending: 0,
              rejected: 0,
              lastActivity: null
            };
          }

          const s = statsMap[projectName];
          s.totalFiles++;
          if (review.status === 'approved') s.approved++;
          else if (review.status === 'rejected') s.rejected++;
          else s.pending++;

          // Try to track last activity from record's file createdTime if available
          const file = record.files?.find(f => f.id === fileId);
          if (file) {
            const date = new Date(file.createdTime);
            if (!s.lastActivity || date > s.lastActivity) s.lastActivity = date;
          }
        });
      }
    });

    return Object.values(statsMap).sort((a, b) => b.totalFiles - a.totalFiles);
  }, [records]);

  const filteredProjects = projectStats
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'approval-asc': return (a.approved / Math.max(a.totalFiles, 1)) - (b.approved / Math.max(b.totalFiles, 1));
        case 'approval-desc': return (b.approved / Math.max(b.totalFiles, 1)) - (a.approved / Math.max(a.totalFiles, 1));
        default: return b.totalFiles - a.totalFiles;
      }
    });

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects Overview" }]}>
      <div className="space-y-5">
        <PageHeader
            icon={Briefcase}
            iconClassName="text-primary"
            title="Projects Dashboard"
            description="Manage and track compliance across all your projects. Real-time stats and progress monitoring."
          >
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-10 h-11 bg-card border-border/50 rounded-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] h-11 bg-card border-border/50 rounded-sm text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="files-desc">Most Files</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="approval-desc">Highest Compliance</SelectItem>
                  <SelectItem value="approval-asc">Lowest Compliance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PageHeader>

        {/* Top Priority Decision */}
        {!isLoading && !isError && projectStats.length > 0 && (() => {
          const criticalProject = projectStats.reduce((worst, p) => {
            const pri = p.rejected > 0 ? 0 : p.pending > 0 ? 1 : 2;
            const worstPri = worst.rejected > 0 ? 0 : worst.pending > 0 ? 1 : 2;
            return pri < worstPri ? p : worst;
          }, projectStats[0]);
          const decision = getProjectDecision({
            rejected: criticalProject.rejected,
            pending: criticalProject.pending,
            approved: criticalProject.approved,
            total: criticalProject.totalFiles,
            projectName: criticalProject.name,
          });
          if (!decision || !decision.action) return null;
          return <DecisionBanner {...decision} />;
        })()}

        {isError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold mb-2">Failed to load projects</h3>
            <p className="text-muted-foreground text-sm mb-4">{error?.message || "An error occurred while fetching data."}</p>
            <Button variant="outline" onClick={() => refetch()}>Try Again</Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[280px] rounded-sm bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{projectStats.length}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Projects</p>
              </div>
            </div>
            <div className="glass-card rounded-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-black text-success">{projectStats.reduce((s, p) => s + p.approved, 0)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Approved</p>
              </div>
            </div>
            <div className="glass-card rounded-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-warning/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-black text-warning">{projectStats.reduce((s, p) => s + p.pending, 0)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending</p>
              </div>
            </div>
            <div className="glass-card rounded-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-black text-destructive">{projectStats.reduce((s, p) => s + p.rejected, 0)}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Issues</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProjects.map((project) => {
              const percentApproved = project.totalFiles > 0
                ? Math.round((project.approved / project.totalFiles) * 100)
                : 0;

              return (
                <div
                  key={project.name}
                  className={cn(
                      "group relative backdrop-blur-xl border rounded-sm p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden flex flex-col h-full ",
                      project.rejected > 0 ? "bg-destructive/[0.03] border-destructive/30 hover:border-destructive/50 ds-pulse-critical" : "bg-card border-border/50 hover:border-border"
                    )}
                >

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-14 h-14 rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-inner border border-primary/10 transition-colors">
                        <LayoutGrid className="w-7 h-7 text-primary" />
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Status</p>
                        <div className={cn(
                          "px-3 py-1 rounded-sm text-[10px] font-black uppercase tracking-wider border",
                          percentApproved === 100 ? "bg-success/10 text-success border-success/20" :
                          percentApproved > 0 ? "bg-warning/10 text-warning border-warning/20" :
                          "bg-muted text-muted-foreground border-border"
                        )}>
                          {percentApproved === 100 ? "Fully Compliant" : percentApproved > 0 ? "In Progress" : "Pending"}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                      {project.name}
                    </h3>

                    <div className="flex items-center gap-2 mb-8">
                       <TrendingUp className="w-3.5 h-3.5 text-success" />
                       <span className="text-xs font-bold text-success">{percentApproved}% Completion Rate</span>
                    </div>

                    <div className="space-y-6 flex-1">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Progress</p>
                          <p className="text-sm font-black text-foreground">{project.approved} / {project.totalFiles}</p>
                        </div>
                        <Progress value={percentApproved} className="h-2.5 rounded-sm bg-muted shadow-inner" indicatorClassName={cn(
                           percentApproved > 70 ? "bg-success" : percentApproved > 30 ? "bg-primary" : "bg-warning"
                        )} />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-success/5 rounded-sm p-3 border border-success/10 group-hover:bg-success/10 transition-colors">
                          <CheckCircle2 className="w-4 h-4 text-success mb-2" />
                          <p className="text-lg font-black text-foreground">{project.approved}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Approved</p>
                        </div>
                        <div className="bg-warning/5 rounded-sm p-3 border border-warning/10 group-hover:bg-warning/10 transition-colors">
                          <Clock className="w-4 h-4 text-warning mb-2" />
                          <p className="text-lg font-black text-foreground">{project.pending}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Pending</p>
                        </div>
                        <div className="bg-destructive/5 rounded-sm p-3 border border-destructive/10 group-hover:bg-destructive/10 transition-colors">
                          <AlertCircle className="w-4 h-4 text-destructive mb-2" />
                          <p className="text-lg font-black text-foreground">{project.rejected}</p>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Issues</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/project/${encodeURIComponent(project.name)}`)}
                      className="w-full h-14 mt-8 bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary rounded-sm font-black text-sm gap-2 transition-all group/btn shadow-md hover:shadow-xl hover:scale-[1.01]"
                      variant="outline"
                    >
                      View Project Records
                      <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        )}

        {(!isLoading && filteredProjects.length === 0) && (
          <div className="py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-muted/50 rounded-sm flex items-center justify-center mx-auto">
              <FileText className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <div>
              <h3 className="text-xl font-bold">No projects found</h3>
              <p className="text-muted-foreground">Try adjusting your search query.</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}