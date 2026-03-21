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
  AlertCircle,
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
  variant?: "default" | "compact";
}

function getAuditStatusBadge(status: string) {
  const lower = status.toLowerCase();

  if (lower.includes("approved") || lower.includes("compliant") || lower.includes("✅")) {
    return { label: "Compliant", variant: "success" as const, icon: CheckCircle };
  }
  return { label: "Pending", variant: "warning" as const, icon: Clock };
}

import { RecordCard } from "./RecordCard";

export function RecordsTable({ records, isLoading = false, variant = "default" }: RecordsTableProps) {
  const navigate = useNavigate();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [updatingRows, setUpdatingRows] = useState<Record<string, boolean>>({});

  const handleUpdateStatus = async (record: QMSRecord, status: RecordStatus) => {
    const key = (record as any).isAtomic ? `file-${(record as any).fileId}` : `${record.rowIndex}-audit`;
    setUpdatingRows(prev => ({ ...prev, [key]: true }));

    try {
      const { updateRecordStatus } = await import("@/lib/statusService");
      const success = await updateRecordStatus(record, status, user?.name || "User");
      if (success) {
        toast({ title: "Status Updated", description: `Record marked as ${status}.` });
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

  const handleDelete = async (rowIndex: number) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    try {
      await deleteRecord.mutateAsync(rowIndex);
      toast({ title: "Record Deleted" });
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
    } catch (error: any) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="p-20 text-center flex flex-col items-center justify-center">
        <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
          <FileText className="w-10 h-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">No Records Found</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          There are no records in this category that match your current search and filters.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("container mx-auto", variant === "compact" ? "p-2 sm:p-4" : "p-6")}>
      <div className={cn(
        "grid gap-4",
        variant === "compact" 
          ? "grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 w-full" 
          : "grid-cols-1 max-w-4xl mx-auto gap-6"
      )}>
        {records.map((record: any) => (
          <RecordCard
            key={(record as any).isAtomic ? `file-${(record as any).fileId}` : `${record.code}-${record.rowIndex}`}
            record={record}
            onViewDetails={(r) => navigate(`/module/${r.category.toLowerCase().replace(/\s+/g, '-')}`)}
            onDelete={handleDelete}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={updatingRows[(record as any).isAtomic ? `file-${(record as any).fileId}` : `${record.rowIndex}-audit`]}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
}
