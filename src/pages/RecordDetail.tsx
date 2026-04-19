import { useMemo, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useQMSData, useUpdateRecord } from "@/hooks/useQMSData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { RecordHeader } from "@/components/record-detail/RecordHeader";
import { FileStats } from "@/components/record-detail/FileStats";
import { TechnicalSpec } from "@/components/record-detail/TechnicalSpec";
import { DocumentLinks } from "@/components/record-detail/DocumentLinks";
import { CompliancePanel } from "@/components/record-detail/CompliancePanel";
import { ReviewPanel } from "@/components/record-detail/ReviewPanel";
import { RecordTimeline } from "@/components/record-detail/RecordTimeline";

export default function RecordDetail() {
  const { "*": splat } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: records, isLoading } = useQMSData();
  const updateRecord = useUpdateRecord();

  const decodedCode = splat ? decodeURIComponent(splat) : "";

  const record = useMemo(() => {
    if (!records) return null;
    return records.find(r => r.code === decodedCode);
  }, [records, decodedCode]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["qms-data"] });
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
    toast.success("Saved", { description: "Reviewer information updated successfully." });
  };

  // Loading state
  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppShell>
    );
  }

  // Not found
  if (!record) {
    return (
      <AppShell>
        <div className="space-y-4">
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
      </AppShell>
    );
  }

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }]}>
      <div className="space-y-6">
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
    </AppShell>
  );
}