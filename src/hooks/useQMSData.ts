import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchSheetData,
  fetchSheetDataWithAllFiles,
  updateSheetCell,
  deleteRecord as deleteRecordFromSheet,
  calculateModuleStats,
  calculateAuditSummary,
  calculateReviewSummary,
  calculateMonthlyComparison,
  getRecentActivity,
  QMSRecord,
  ModuleStats,
  AuditSummary,
  ReviewSummary,
  MonthlyComparison,
} from "@/lib/googleSheets";
import { useToast } from "@/hooks/use-toast";

export function useQMSData() {
  return useQuery({
    queryKey: ["qms-data"],
    queryFn: fetchSheetDataWithAllFiles, // Use comprehensive fetcher
    refetchInterval: 60000,
    staleTime: 30000,
  });
}

export function useModuleStats(records: QMSRecord[] | undefined): ModuleStats[] {
  if (!records) return [];
  return calculateModuleStats(records);
}

export function useAuditSummary(records: QMSRecord[] | undefined): AuditSummary {
  if (!records) return { total: 0, compliant: 0, pending: 0, issues: 0, complianceRate: 0 };
  return calculateAuditSummary(records);
}

export function useReviewSummary(records: QMSRecord[] | undefined): ReviewSummary {
  if (!records) return { completed: 0, pending: 0, total: 0 };
  return calculateReviewSummary(records);
}

export function useMonthlyComparison(records: QMSRecord[] | undefined): MonthlyComparison {
  if (!records) return { currentMonth: 0, previousMonth: 0, percentageChange: 0, isPositive: true };
  return calculateMonthlyComparison(records);
}

export function useRecentActivity(records: QMSRecord[] | undefined, limit: number = 5): QMSRecord[] {
  if (!records) return [];
  return getRecentActivity(records, limit);
}

export function useUpdateRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      rowIndex,
      field,
      value
    }: {
      rowIndex: number;
      field: "auditStatus" | "reviewed" | "reviewedBy" | "reviewDate";
      value: string;
    }) => {
      // Column mapping
      const columnMap: Record<string, string> = {
        auditStatus: "L", // Should technically use statusService for this now
        reviewed: "R",
        reviewedBy: "N",
        reviewDate: "O",
      };

      const column = columnMap[field];
      const success = await updateSheetCell(rowIndex, column, value);

      if (!success) {
        throw new Error("Failed to update record");
      }

      return { rowIndex, field, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      toast({
        title: "Record Updated",
        description: "The record has been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Google Sheets rejected the write operation. This may require authentication beyond API key access.",
        variant: "destructive",
      });
      console.error("Update error:", error);
    },
  });
}

export function useDeleteRecord() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (rowIndex: number) => {
      await deleteRecordFromSheet(rowIndex);
      return rowIndex;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف السجل بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الحذف",
        description: "حدث خطأ أثناء حذف السجل",
        variant: "destructive",
      });
      console.error("Delete error:", error);
    },
  });
}
