import { useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Loader2,
  ChevronRight,
  Save,
  MessageSquare,
  FileText,
  ExternalLink,
  CheckCircle,
  Clock,
  FolderOpen,
  Eye
} from "lucide-react";
import { QMSRecord, RecordStatus } from "@/lib/googleSheets";
import { useUpdateRecord, useDeleteRecord } from "@/hooks/useQMSData";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FormDetailsModal } from "./FormDetailsModal";

interface RecordsTableProps {
  records: QMSRecord[];
  isLoading?: boolean;
}

function getAuditStatusBadge(status: string) {
  const lower = status.toLowerCase();

  if (lower.includes("approved") || lower.includes("compliant") || lower.includes("✅")) {
    return { label: "Compliant", variant: "success" as const, icon: CheckCircle };
  }
  if (lower.includes("rejected") || lower.includes("nc") || lower.includes("issue") || lower.includes("invalid") || lower.includes("❌")) {
    return { label: "Issue", variant: "destructive" as const, icon: AlertTriangle };
  }
  return { label: "Pending", variant: "warning" as const, icon: Clock };
}

export function RecordsTable({ records, isLoading = false }: RecordsTableProps) {
  const navigate = useNavigate();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [updatingRows, setUpdatingRows] = useState<Record<string, boolean>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [rowFiles, setRowFiles] = useState<Record<string, any[]>>({});
  const [loadingFiles, setLoadingFiles] = useState<Record<string, boolean>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<number | null>(null);
  const [fileComments, setFileComments] = useState<Record<string, string>>({});
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [selectedRecord, setSelectedRecord] = useState<QMSRecord | null>(null);
  const [showFormDetails, setShowFormDetails] = useState(false);

  const handleFileReview = async (record: QMSRecord, fileId: string, status: RecordStatus, reviewerName?: string) => {
    const name = reviewerName || user?.name || (record as any).fileReviewedBy || record.reviewedBy || "User";
    const comment = fileComments[fileId] || (record as any).fileComment || "";
    const key = `file-${fileId}`;
    setUpdatingRows(prev => ({ ...prev, [key]: true }));

    try {
      const { updateFileReview } = await import("@/lib/statusService");
      const success = await updateFileReview(record.rowIndex, fileId, status, comment, name, record.fileReviews);

      if (success) {
        toast({ title: "File Review Saved", description: "The status for this individual file has been updated." });

        // Check if all files are now approved to auto-approve the parent record
        const filesInFolder = rowFiles[record.code] || [];
        const updatedReviews = { ...record.fileReviews, [fileId]: { status, comment, reviewedBy: name } };

        const allApproved = filesInFolder.length > 0 && filesInFolder.every(f =>
          updatedReviews[f.id]?.status === 'approved'
        );

        if (allApproved && record.auditStatus !== 'Approved') {
          const { updateRecordStatus } = await import("@/lib/statusService");
          await updateRecordStatus(record, 'approved', name);
          toast({
            title: "Record Auto-Approved",
            description: "All files are now approved, so the overall status is Approved.",
            className: "bg-success text-success-foreground"
          });
        }

        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } else {
        throw new Error("Update failed");
      }
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Could not save file review.",
        variant: "destructive"
      });
    } finally {
      setUpdatingRows(prev => ({ ...prev, [key]: false }));
    }
  };

  const toggleExpand = async (record: QMSRecord) => {
    const key = record.code;
    const isExpanding = !expandedRows[key];
    setExpandedRows(prev => ({ ...prev, [key]: isExpanding }));

    if (isExpanding && !rowFiles[key]) {
      setLoadingFiles(prev => ({ ...prev, [key]: true }));
      try {
        const { listFolderFiles } = await import("@/lib/driveService");
        const files = await listFolderFiles(record.folderLink);
        setRowFiles(prev => ({ ...prev, [key]: files }));
      } catch (err) {
        console.error("Failed to load files", err);
      } finally {
        setLoadingFiles(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const handleReviewedChange = async (record: QMSRecord, checked: boolean) => {
    const key = `${record.rowIndex}-reviewed`;
    setUpdatingRows(prev => ({ ...prev, [key]: true }));

    try {
      await updateRecord.mutateAsync({
        rowIndex: record.rowIndex,
        field: "reviewed",
        value: checked ? "TRUE" : "FALSE",
      });
      await updateRecord.mutateAsync({
        rowIndex: record.rowIndex,
        field: "reviewedBy",
        value: checked ? (user?.name || "User") : "",
      });
      const today = new Date();
      const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      await updateRecord.mutateAsync({
        rowIndex: record.rowIndex,
        field: "reviewDate",
        value: checked ? isoDate : "",
      });
    } finally {
      setUpdatingRows(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleAuditStatusChange = async (record: QMSRecord, newStatus: string) => {
    const key = `${record.rowIndex}-audit`;
    setUpdatingRows(prev => ({ ...prev, [key]: true }));

    try {
      const { updateRecordStatus } = await import("@/lib/statusService");
      const statusValue = newStatus === "Approved" ? "approved" :
        newStatus === "Rejected" ? "rejected" : "pending_review";

      const success = await updateRecordStatus(record, statusValue as any, user?.name || "User");
      if (success) {
        queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      } else {
        throw new Error("Update failed");
      }
    } catch (err: any) {
      toast({
        title: "Update Failed",
        description: err.message || "Google Sheets rejected the write operation.",
        variant: "destructive"
      });
    } finally {
      setUpdatingRows(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReviewedByNameChange = async (record: QMSRecord, newName: string) => {
    const key = `${record.rowIndex}-reviewer-name`;
    setUpdatingRows(prev => ({ ...prev, [key]: true }));

    try {
      await updateRecord.mutateAsync({
        rowIndex: record.rowIndex,
        field: "reviewedBy",
        value: newName,
      });
    } finally {
      setUpdatingRows(prev => ({ ...prev, [key]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-12 text-center">
        <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Records Found</h3>
        <p className="text-muted-foreground">
          There are no records in this module yet.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto glass-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent border-b border-border/50">
            <TableHead className="w-10"></TableHead>
            <TableHead className="w-20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Code</TableHead>
            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Record Name / File</TableHead>
            <TableHead className="w-16 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Records</TableHead>
            <TableHead className="w-32 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Audit Status</TableHead>
            <TableHead className="w-28 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Reviewed</TableHead>
            <TableHead className="w-32 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Reviewed By</TableHead>
            <TableHead className="w-48 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Comment</TableHead>
            <TableHead className="w-24 text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-heading">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record: any) => {
            const statusInfo = getAuditStatusBadge(record.isAtomic ? record.fileStatus : record.auditStatus);
            const StatusIcon = statusInfo.icon;
            const isUpdatingAudit = updatingRows[record.isAtomic ? `file-${record.fileId}` : `${record.rowIndex}-audit`];
            const isExpanded = !record.isAtomic && expandedRows[record.code];
            const files = !record.isAtomic ? (rowFiles[record.code] || []) : [];
            const isFilesLoading = !record.isAtomic && loadingFiles[record.code];

            return (
              <Fragment key={record.isAtomic ? `file-${record.fileId}` : `${record.code}-${record.rowIndex}`}>
                <TableRow
                  className={cn("cursor-pointer hover:bg-primary/5 transition-all duration-300 border-b border-border/30 group", isExpanded && "bg-primary/[0.03]")}
                  onClick={() => !record.isAtomic && toggleExpand(record)}
                >
                  <TableCell>
                    {!record.isAtomic && (
                      <div className="flex items-center justify-center">
                        <ChevronRight className={cn("w-4 h-4 transition-transform text-muted-foreground", isExpanded ? "rotate-90" : "rotate-0")} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-bold text-primary group-hover:scale-105 transition-transform duration-300">
                    {record.code}
                  </TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {record.isAtomic ? (
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3 text-primary/50" />
                          <span className="font-semibold text-sm">{record.fileName}</span>
                        </div>
                      ) : (
                        <>
                          <p className="font-bold text-sm text-foreground tracking-tight">{record.recordName}</p>
                          <p className="text-[10px] text-muted-foreground/70 line-clamp-1 font-medium italic">
                            {record.description}
                          </p>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-accent">
                    {record.isAtomic ? "1" : (record.actualRecordCount || 0)}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      {isUpdatingAudit && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                      <Select
                        value={record.isAtomic ? (record.fileStatus || "pending_review") : (record.auditStatus || "pending_review")}
                        onValueChange={(value) => {
                          if (record.isAtomic) {
                            handleFileReview(record, record.fileId, value as any);
                          } else {
                            handleAuditStatusChange(record, value);
                          }
                        }}
                        disabled={isUpdatingAudit}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-md focus:ring-2 focus:ring-accent/40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="pending_review">Pending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={record.isAtomic ? record.fileStatus === 'approved' : record.reviewed}
                        onCheckedChange={(checked) => {
                          if (!record.isAtomic) {
                            handleReviewedChange(record, !!checked);
                            // Also update the audit status based on checkbox
                            handleAuditStatusChange(record, checked ? 'Approved' : 'Pending Review');
                          }
                        }}
                      />
                    </div>
                  </TableCell>
                  <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                    <div className="relative">
                      <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/30 rounded-full border border-border inline-block min-w-[80px]">
                        {record.isAtomic
                          ? (record.fileStatus === 'approved' || record.fileStatus === 'rejected' ? record.fileReviewedBy || "---" : "---")
                          : (record.reviewed ? record.reviewedBy || "---" : "---")
                        }
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="p-2" onClick={(e) => e.stopPropagation()}>
                    {record.isAtomic && (
                      <div className="relative">
                        <MessageSquare className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <Input
                          className="h-8 text-xs pl-7 bg-transparent border-none rounded-md focus-visible:ring-2 focus-visible:ring-accent/40 hover:bg-muted/40 transition-colors"
                          placeholder="Comment..."
                          defaultValue={record.fileComment}
                          onBlur={(e) => {
                            if (e.target.value !== record.fileComment) {
                              handleFileReview(record, record.fileId, record.fileStatus);
                            }
                          }}
                          onChange={(e) => setFileComments(prev => ({ ...prev, [record.fileId]: e.target.value }))}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => {
                          setSelectedRecord(record);
                          setShowFormDetails(true);
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>

                {!record.isAtomic && isExpanded && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell colSpan={9} className="p-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Files in Folder ({record.actualRecordCount || 0})
                        </h4>

                        {isFilesLoading ? (
                          <div className="flex items-center gap-3 py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-accent" />
                            <span className="text-sm text-muted-foreground">Reading Drive folder...</span>
                          </div>
                        ) : files.length === 0 ? (
                          <p className="text-sm text-muted-foreground p-4 bg-background/50 rounded-lg border border-dashed text-center">
                            No individual files detected in the Drive folder.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {files.map((file: any) => {
                              const review = record.fileReviews?.[file.id] || { status: 'pending_review', comment: '' };
                              const isSaving = updatingRows[`file-${file.id}`];

                              return (
                                <div key={file.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 bg-background/60 rounded-lg border border-border gap-3">
                                  <div className="flex items-center gap-2 overflow-hidden min-w-[200px]">
                                    <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                                    <span className="text-sm truncate font-medium">{file.name}</span>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => window.open(file.webViewLink, '_blank')}>
                                      <ExternalLink className="w-3 h-3" />
                                    </Button>
                                  </div>

                                  <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
                                    <Select
                                      value={review.status}
                                      onValueChange={(val) => handleFileReview(record, file.id, val as RecordStatus)}
                                      disabled={isSaving}
                                    >
                                      <SelectTrigger className="h-8 w-32 text-xs rounded-md focus:ring-2 focus:ring-accent/40">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="approved">Approved</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                        <SelectItem value="pending_review">Pending</SelectItem>
                                      </SelectContent>
                                    </Select>

                                    <div className="relative flex-1">
                                      <MessageSquare className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                      <Input
                                        className="h-8 text-xs pl-7 rounded-md focus-visible:ring-2 focus-visible:ring-accent/40"
                                        placeholder="Add comment..."
                                        defaultValue={review.comment}
                                        onChange={(e) => setFileComments(prev => ({ ...prev, [file.id]: e.target.value }))}
                                        onBlur={(e) => {
                                          if (e.target.value !== review.comment) {
                                            handleFileReview(record, file.id, review.status);
                                          }
                                        }}
                                      />
                                    </div>

                                    <Button
                                      size="sm"
                                      variant="default"
                                      className="h-8 px-2 rounded-md"
                                      disabled={isSaving}
                                      onClick={() => handleFileReview(record, file.id, review.status)}
                                    >
                                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex justify-between pt-2 border-t border-border mt-4">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="rounded-md"
                            onClick={() => {
                              setRecordToDelete(record.rowIndex);
                              setShowDeleteModal(true);
                            }}
                          >
                            حذف السجل
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-md" onClick={() => window.open(record.folderLink, '_blank')}>
                            Open Full Folder in Drive
                          </Button>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setRecordToDelete(null);
              }}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (recordToDelete) {
                  try {
                    // Find the record to get its row index
                    const record = records.find(r => (r as any).rowIndex === recordToDelete);
                    if (record) {
                      await deleteRecord.mutateAsync(record.rowIndex);
                    }
                    setShowDeleteModal(false);
                    setRecordToDelete(null);
                  } catch (error) {
                    toast({
                      title: "خطأ في الحذف",
                      description: "حدث خطأ أثناء حذف السجل",
                      variant: "destructive",
                    });
                  }
                }
              }}
            >
              حذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FormDetailsModal
        record={selectedRecord}
        open={showFormDetails}
        onOpenChange={setShowFormDetails}
        onViewInDrive={() => {
          if (!selectedRecord) return;
          const link = (selectedRecord as any).isAtomic ? (selectedRecord as any).fileLink : selectedRecord.folderLink;
          window.open(link, '_blank');
        }}
      />
    </div>
  );
}
