import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useQMSData, useUpdateRecord } from "@/hooks/useQMSData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  FileText,
  FolderOpen,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function RecordDetail() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

  useEffect(() => {
    const handleToggle = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;
      setSidebarCollapsed(customEvent.detail);
    };
    window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
  }, []);
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState("dashboard");

  const { data: records, isLoading, error } = useQMSData();
  const updateRecord = useUpdateRecord();

  const [localReviewedBy, setLocalReviewedBy] = useState("");
  const [localReviewDate, setLocalReviewDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const decodedCode = code ? decodeURIComponent(code) : "";

  const record = useMemo(() => {
    if (!records) return null;
    return records.find(r => r.code === decodedCode);
  }, [records, decodedCode]);

  // Initialize local state when record loads
  useMemo(() => {
    if (record) {
      setLocalReviewedBy(record.reviewedBy || "");
      setLocalReviewDate(record.reviewDate || "");
    }
  }, [record?.reviewedBy, record?.reviewDate]);

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

  const handleSaveReviewer = async () => {
    if (!record) return;
    setIsSaving(true);

    try {
      await updateRecord.mutateAsync({
        rowIndex: record.rowIndex,
        field: "reviewedBy",
        value: localReviewedBy,
      });

      await updateRecord.mutateAsync({
        rowIndex: record.rowIndex,
        field: "reviewDate",
        value: localReviewDate || new Date().toISOString().split("T")[0],
      });

      toast({
        title: "Saved",
        description: "Reviewer information updated successfully.",
      });
    } catch (error) {
      // Error is handled by the mutation
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuditStatusChange = async (newStatus: string) => {
    if (!record) return;
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "auditStatus",
      value: newStatus,
    });
  };

  const handleReviewedChange = async (checked: boolean) => {
    if (!record) return;
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "reviewed",
      value: checked ? "TRUE" : "FALSE",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
        <main className={`ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
          <Header />
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
        <main className={`ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
          <Header />
          <div className="p-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Record Not Found</AlertTitle>
              <AlertDescription>
                The record with code "{decodedCode}" was not found in the database.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />

      <main className={`ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
        <Header />

        <div className="p-6 space-y-8 max-w-[1400px] mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between animate-fade-in mb-2">
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="mt-1 hover:bg-primary/10 hover:text-primary transition-all rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-mono text-xs font-bold tracking-wider">
                    {record.code}
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight font-heading text-foreground">{record.recordName}</h1>
                </div>
                <p className="text-sm text-muted-foreground font-medium opacity-80">{record.description}</p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="glass-card border-border/50 hover:bg-primary/5 transition-all rounded-xl font-bold uppercase tracking-widest text-[10px] h-11 px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Data
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-8">
              {/* Record Details */}
              <div className="glass-card rounded-2xl border-border/50 p-8 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-500" />

                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-8 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  Technical Specification
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Module Category</Label>
                    <p className="text-base font-semibold text-foreground">{record.category}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">System Identifier</Label>
                    <p className="text-base font-mono font-bold text-primary">{record.code}</p>
                  </div>
                  <div className="col-span-full space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Fulfillment Protocol</Label>
                    <p className="text-base font-medium text-foreground/80">{record.whenToFill || "Not formally specified"}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Active Serial Range</Label>
                    <div className="flex items-center gap-2 font-mono text-sm">
                      <span className="text-muted-foreground">Last:</span> <span className="font-bold">{record.lastSerial || "N/A"}</span>
                      <span className="text-muted-foreground ml-2">Next:</span> <span className="font-extrabold text-primary">{record.nextSerial || "-"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60">Temporal Status</Label>
                    <p className="text-sm font-semibold">{record.lastFileDate || "No records logged"} <span className="text-muted-foreground font-normal ml-2">({record.daysAgo || "-"} days ago)</span></p>
                  </div>
                </div>
              </div>

              {/* Links */}
              <div className="glass-card rounded-2xl border-border/50 p-8 shadow-2xl relative overflow-hidden group">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-8 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  Documentation Nodes
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {record.templateLink ? (
                    <a
                      href={record.templateLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-5 rounded-xl bg-background/40 border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all group/link shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover/link:scale-110 transition-transform">
                        <FileText className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">Master Template</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Source Document</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <div className="p-5 rounded-xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center grayscale opacity-60">
                      <p className="text-xs font-bold uppercase tracking-widest">No Template Available</p>
                    </div>
                  )}

                  {record.folderLink ? (
                    <a
                      href={record.folderLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-5 rounded-xl bg-background/40 border border-border/50 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group/link shadow-sm"
                    >
                      <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover/link:scale-110 transition-transform">
                        <FolderOpen className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">Vault Storage</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">Record Repository</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-40 group-hover/link:opacity-100 transition-opacity" />
                    </a>
                  ) : (
                    <div className="p-5 rounded-xl bg-muted/20 border border-dashed border-border text-center flex flex-col items-center justify-center grayscale opacity-60">
                      <p className="text-xs font-bold uppercase tracking-widest">No Vault Link</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar - Editable Fields */}
            <div className="space-y-8">
              {/* Audit Status */}
              <div className="glass-card rounded-2xl border-border/50 p-8 shadow-2xl">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                  Compliance Verification
                </h2>
                <div className="space-y-6">
                  <Select
                    value={record.auditStatus || "⚪ Waiting"}
                    onValueChange={handleAuditStatusChange}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-background/50 border-border/50 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-border/50">
                      <SelectItem value="⚪ Waiting">
                        <div className="flex items-center gap-2 font-semibold">
                          <Clock className="w-4 h-4 text-warning" />
                          Pending Review
                        </div>
                      </SelectItem>
                      <SelectItem value="✅ Approved">
                        <div className="flex items-center gap-2 font-semibold">
                          <CheckCircle className="w-4 h-4 text-success" />
                          Validated (Approved)
                        </div>
                      </SelectItem>
                      <SelectItem value="❌ NC">
                        <div className="flex items-center gap-2 font-semibold">
                          <AlertTriangle className="w-4 h-4 text-destructive" />
                          Non-Conforming (NC)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.1em] text-center opacity-70">
                    Propagates to core enterprise ledger
                  </p>
                </div>
              </div>

              {/* Review Status */}
              <div className="glass-card rounded-2xl border-border/50 p-8 shadow-2xl">
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground mb-6 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Authorization Details
                </h2>
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <Checkbox
                      id="reviewed"
                      checked={record.reviewed}
                      onCheckedChange={handleReviewedChange}
                      className="w-5 h-5 rounded-md border-primary/30 data-[state=checked]:bg-primary"
                    />
                    <Label htmlFor="reviewed" className="cursor-pointer text-sm font-bold text-foreground/80">
                      Mark as Formally Reviewed
                    </Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reviewedBy" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Responsible Officer</Label>
                    <Input
                      id="reviewedBy"
                      value={localReviewedBy}
                      onChange={(e) => setLocalReviewedBy(e.target.value)}
                      placeholder="Identified Auditor"
                      className="h-11 rounded-lg bg-background/50 border-border/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="reviewDate" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Authorization Timestamp</Label>
                    <Input
                      id="reviewDate"
                      type="date"
                      value={localReviewDate}
                      onChange={(e) => setLocalReviewDate(e.target.value)}
                      className="h-11 rounded-lg bg-background/50 border-border/50"
                    />
                  </div>

                  <Button
                    onClick={handleSaveReviewer}
                    disabled={isSaving}
                    className="w-full h-12 rounded-xl bg-foreground text-background font-bold tracking-widest uppercase text-[10px] hover:bg-foreground/90 transition-all shadow-xl active:scale-[0.98]"
                  >
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Commit Authorization
                  </Button>
                </div>
              </div>

              {/* Security Advisory */}
              <div className="p-5 rounded-2xl bg-warning/5 border border-warning/20 flex gap-4">
                <AlertTriangle className="w-6 h-6 text-warning shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-warning mb-1">Administrative Advisory</h4>
                  <p className="text-[11px] text-warning/80 leading-relaxed font-medium">
                    Modifications require verified Google Workspace authorization. Unauthorized attempts will be logged in the audit trail.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
