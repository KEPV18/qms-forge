import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useQMSData, useUpdateRecord } from "@/hooks/useQMSData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

import { RecordHeader } from "@/components/record-detail/RecordHeader";
import { FileStats } from "@/components/record-detail/FileStats";
import { TechnicalSpec } from "@/components/record-detail/TechnicalSpec";
import { DocumentLinks } from "@/components/record-detail/DocumentLinks";
import { CompliancePanel } from "@/components/record-detail/CompliancePanel";
import { ReviewPanel } from "@/components/record-detail/ReviewPanel";
import { RecordTimeline } from "@/components/record-detail/RecordTimeline";

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

  const { data: records, isLoading } = useQMSData();
  const updateRecord = useUpdateRecord();

  const decodedCode = code ? decodeURIComponent(code) : "";

  const record = useMemo(() => {
    if (!records) return null;
    return records.find(r => r.code === decodedCode);
  }, [records, decodedCode]);

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

  const handleSaveReviewer = async (reviewedBy: string, reviewDate: string) => {
    if (!record) return;
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "reviewedBy",
      value: reviewedBy,
    });
    await updateRecord.mutateAsync({
      rowIndex: record.rowIndex,
      field: "reviewDate",
      value: reviewDate || new Date().toISOString().split("T")[0],
    });
    toast({
      title: "Saved",
      description: "Reviewer information updated successfully.",
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
        <main className={`ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
          <Header />
          <div className="p-6 flex items-center justify-center min-h-[60vh]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  // Not found
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
                The record with code "{decodedCode}" was not found.
              </AlertDescription>
            </Alert>
            <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">
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

        <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
          <RecordHeader
            code={record.code}
            name={record.recordName}
            description={record.description}
            category={record.category}
            onRefresh={handleRefresh}
          />

          {/* Stats Row */}
          <FileStats record={record} />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              <TechnicalSpec record={record} />
              <DocumentLinks
                templateLink={record.templateLink}
                folderLink={record.folderLink}
              />
              <RecordTimeline record={record} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              <CompliancePanel
                auditStatus={record.auditStatus}
                onStatusChange={handleAuditStatusChange}
              />
              <ReviewPanel
                reviewed={record.reviewed}
                reviewedBy={record.reviewedBy || ""}
                reviewDate={record.reviewDate || ""}
                onReviewedChange={handleReviewedChange}
                onSave={handleSaveReviewer}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
