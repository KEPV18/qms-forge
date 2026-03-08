import { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { useQMSData } from "@/hooks/useQMSData";
import { RecordsTable } from "@/components/records/RecordsTable";
import {
  ArrowLeft,
  ClipboardCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";

export default function AuditPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [activeModule, setActiveModule] = useState("quality");
  const [activeTab, setActiveTab] = useState("pending");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabParam = params.get("tab");
    if (tabParam === "pending" || tabParam === "compliant" || tabParam === "issues") {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setSidebarCollapsed(customEvent.detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);

  const { data: records, isLoading, error, dataUpdatedAt } = useQMSData();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
  };

  const handleModuleChange = (newModuleId: string) => {
    setActiveModule(newModuleId);
    if (newModuleId === "dashboard") {
      navigate("/");
    } else if (newModuleId !== "documents") {
      navigate(`/module/${newModuleId}`);
    }
  };

  // Categorize records by audit status at the individual FILE level
  const { pendingRecords, compliantRecords, issueRecords, stats } = useMemo(() => {
    if (!records) return {
      pendingRecords: [],
      compliantRecords: [],
      issueRecords: [],
      stats: { pending: 0, compliant: 0, issues: 0 }
    };

    const pending: any[] = [];
    const compliant: any[] = [];
    const issuesList: any[] = [];

    records.forEach(record => {
      const files = record.files || [];
      const reviews = record.fileReviews || {};

      files.forEach(file => {
        const review = reviews[file.id] || { status: 'pending_review', comment: '' };

        const auditItem = {
          ...record,
          fileId: file.id,
          fileName: file.name,
          fileLink: file.webViewLink,
          fileStatus: review.status,
          fileComment: review.comment,
          fileReviewedBy: review.reviewedBy || record.reviewedBy || "",
          isAtomic: true // Flag for RecordsTable
        };

        if (review.status === 'approved') {
          compliant.push(auditItem);
        } else if (review.status === 'rejected') {
          issuesList.push(auditItem);
        } else {
          pending.push(auditItem);
        }
      });
    });

    const totalTemplates = records.length;
    const filledTemplatesCount = records.filter(r => (r.actualRecordCount || 0) > 0).length;

    return {
      pendingRecords: pending,
      compliantRecords: compliant,
      issueRecords: issuesList,
      stats: {
        pending: pending.length,
        compliant: compliant.length,
        issues: issuesList.length,
        totalTemplates,
        filledTemplatesCount
      }
    };
  }, [records]);

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
    : null;

  const complianceRate = stats.totalTemplates > 0
    ? Math.round((stats.filledTemplatesCount / stats.totalTemplates) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />

      <div className={`flex-1 flex flex-col ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        <Header />

        <main className="flex-1">
          <div className="p-6 space-y-6">
            <Breadcrumbs
              items={[
                { label: "Dashboard", path: "/" },
                { label: "Audit & Quality Control" }
              ]}
            />
            {/* Page Header */}
            <div className="flex items-start justify-between animate-fade-in">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="mt-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center shadow-lg shadow-accent/10">
                      <ClipboardCheck className="w-6 h-6 text-accent" />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-foreground tracking-tight font-heading">Audit Dashboard</h1>
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">ISO 9001:2015 Compliance Review</p>
                    </div>
                  </div>
                  {lastUpdated && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Last synced: {lastUpdated}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                  <Filter className="w-5 h-5 text-foreground/60" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground font-heading">{records?.length || 0}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Templates</p>
                </div>
              </div>
              <div
                className="glass-card rounded-2xl p-4 cursor-pointer hover:bg-warning/5 transition-all duration-300 card-hover-enhanced"
                onClick={() => setActiveTab("pending")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-warning font-heading">{stats.pending}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Pending</p>
                  </div>
                </div>
              </div>
              <div
                className="glass-card rounded-2xl p-4 cursor-pointer hover:bg-success/5 transition-all duration-300 card-hover-enhanced"
                onClick={() => setActiveTab("compliant")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-success font-heading">{stats.compliant}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Approved</p>
                  </div>
                </div>
              </div>
              <div
                className="glass-card rounded-2xl p-4 cursor-pointer hover:bg-destructive/5 transition-all duration-300 card-hover-enhanced"
                onClick={() => setActiveTab("issues")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive font-heading">{stats.issues}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Issues</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Rate */}
            <div className="glass-card rounded-2xl p-7 border-sidebar-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-foreground font-heading tracking-tight">Overall Compliance Rate</h2>
                <span className="text-4xl font-bold text-success font-heading tracking-tighter">{complianceRate}%</span>
              </div>
              <div className="w-full bg-muted/30 rounded-full h-3 overflow-hidden border border-white/5">
                <div
                  className="bg-gradient-to-r from-success to-emerald-400 h-3 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                  style={{ width: `${complianceRate}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-4 font-bold uppercase tracking-widest opacity-60">
                {stats.filledTemplatesCount} of {stats.totalTemplates} form templates populated
              </p>
            </div>

            {/* Tabbed Records View */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-2xl border-border/50 animate-fade-in">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="bg-muted/30 px-6 py-2 border-b border-border/50">
                  <TabsList className="bg-transparent h-14 p-0 gap-8">
                    <TabsTrigger
                      value="pending"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-warning border-b-2 border-transparent data-[state=active]:border-warning rounded-none h-14 px-2 gap-2 font-bold uppercase tracking-widest text-[10px] transition-all"
                    >
                      <Clock className="w-4 h-4" />
                      Pending ({pendingRecords.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="compliant"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-success border-b-2 border-transparent data-[state=active]:border-success rounded-none h-14 px-2 gap-2 font-bold uppercase tracking-widest text-[10px] transition-all"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approved ({compliantRecords.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="issues"
                      className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-destructive border-b-2 border-transparent data-[state=active]:border-destructive rounded-none h-14 px-2 gap-2 font-bold uppercase tracking-widest text-[10px] transition-all"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Issues ({issueRecords.length})
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-1">
                  <TabsContent value="pending" className="m-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    <RecordsTable records={pendingRecords} isLoading={isLoading} />
                  </TabsContent>

                  <TabsContent value="compliant" className="m-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    <RecordsTable records={compliantRecords} isLoading={isLoading} />
                  </TabsContent>

                  <TabsContent value="issues" className="m-0 animate-in fade-in slide-in-from-top-2 duration-300">
                    <RecordsTable records={issueRecords} isLoading={isLoading} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
