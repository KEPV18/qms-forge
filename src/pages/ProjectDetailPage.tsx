import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useQMSData } from "@/hooks/useQMSData";
import {
  Briefcase,
  Search,
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderOpen,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecordsTable } from "@/components/records/RecordsTable";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const { data: records, isLoading } = useQMSData();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "compact">("compact");

  const decodedProject = decodeURIComponent(projectName || "");

  useEffect(() => {
    const handleToggle = (event: Event) => {
      setSidebarCollapsed((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);

  const projectRecords = useMemo(() => {
    if (!records) return [];

    return records.filter(record => {
      if (!record.fileReviews) return false;
      
      // Filter the fileReviews within the record too
      const reviews = Object.entries(record.fileReviews).filter(([fileId, review]: [string, any]) => {
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
        const relevantReviews: Record<string, any> = {};
        const existingFileIds = new Set(record.files?.map(f => f.id) || []);
        
        Object.entries(record.fileReviews || {}).forEach(([fileId, review]: [string, any]) => {
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
            if (reviewsArr.every((rev: any) => rev.status === 'approved')) status = "Compliant ✅";
            else if (reviewsArr.some((rev: any) => rev.status === 'rejected' || rev.status === 'nc')) status = "Rejected ❌";
        }

        return { ...record, fileReviews: relevantReviews, auditStatus: status, isAtomic: false };
    });
  }, [records, decodedProject]);

  const stats = useMemo(() => {
    let approved = 0, pending = 0, rejected = 0;
    projectRecords.forEach(r => {
        if (r.fileReviews) {
            Object.values(r.fileReviews).forEach((rev: any) => {
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
                          (activeTab === "pending" && reviews.some((rev: any) => rev.status !== 'approved' && rev.status !== 'rejected')) ||
                          (activeTab === "compliant" && reviews.every((rev: any) => rev.status === 'approved')) ||
                          (activeTab === "issues" && reviews.some((rev: any) => rev.status === 'rejected'));

        return matchesSearch && matchesTab;
    });
  }, [projectRecords, searchQuery, activeTab]);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar activeModule="projects-all" onModuleChange={() => {}} />

      <div className={cn("flex-1 flex flex-col ml-0 transition-all duration-300", sidebarCollapsed ? "md:ml-16" : "md:ml-64")}>
        <Header />

        <main className="flex-1 p-6 space-y-8 max-w-[1600px] mx-auto w-full">
          <div className="space-y-4">
            <Breadcrumbs items={[
                { label: "Dashboard", path: "/" }, 
                { label: "Projects", path: "/projects" },
                { label: decodedProject }
            ]} />
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-lg shadow-primary/10">
                    <Briefcase className="w-6 h-6 text-primary" />
                  </div>
                  <h1 className="text-4xl font-black tracking-tight text-foreground">{decodedProject}</h1>
                </div>
                <p className="text-muted-foreground text-lg">
                  Detailed view of all records and compliance status for project <span className="text-foreground font-bold">{decodedProject}</span>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                 <div className="flex h-11 p-1 bg-card border border-border/40 rounded-xl">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("px-3 rounded-lg gap-2 font-bold transition-all", viewMode === "compact" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground")}
                        onClick={() => setViewMode("compact")}
                    >
                        <List className="w-4 h-4" />
                        Rows
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("px-3 rounded-lg gap-2 font-bold transition-all", viewMode === "card" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground")}
                        onClick={() => setViewMode("card")}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        Cards
                    </Button>
                 </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-card/40 backdrop-blur-xl border border-border/40 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FolderOpen className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <p className="text-2xl font-black text-foreground">{stats.total}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Files</p>
                </div>
            </div>
            <div className="bg-success/5 border border-success/20 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                    <p className="text-2xl font-black text-success">{stats.approved}</p>
                    <p className="text-xs font-bold text-success/70 uppercase tracking-widest">Approved</p>
                </div>
            </div>
            <div className="bg-warning/5 border border-warning/20 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-warning" />
                </div>
                <div>
                    <p className="text-2xl font-black text-warning">{stats.pending}</p>
                    <p className="text-xs font-bold text-warning/70 uppercase tracking-widest">Pending</p>
                </div>
            </div>
            <div className="bg-destructive/5 border border-destructive/20 p-6 rounded-3xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                    <p className="text-2xl font-black text-destructive">{stats.rejected}</p>
                    <p className="text-xs font-bold text-destructive/70 uppercase tracking-widest">Issues</p>
                </div>
            </div>
          </div>

          <div className="space-y-6">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                  <TabsList className="bg-muted/50 p-1 rounded-xl h-11 border border-border/40">
                    <TabsTrigger value="all" className="rounded-lg font-bold px-6">All</TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-lg font-bold px-6">Pending</TabsTrigger>
                    <TabsTrigger value="compliant" className="rounded-lg font-bold px-6 text-success data-[state=active]:bg-success data-[state=active]:text-success-foreground">Compliant</TabsTrigger>
                    <TabsTrigger value="issues" className="rounded-lg font-bold px-6 text-destructive data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">Issues</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search records..." 
                    className="pl-10 h-11 bg-card border-border/50 rounded-xl shadow-inner font-medium" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
             </div>

             <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-[2.5rem] p-4 md:p-8 min-h-[400px]">
                {isLoading ? (
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
                        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center">
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
        </main>

        <Footer />
      </div>
    </div>
  );
}
