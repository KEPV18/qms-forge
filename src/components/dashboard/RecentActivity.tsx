import { FileText, CheckCircle, AlertTriangle, Clock, User, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { QMSRecord, formatTimeAgo, getModuleForCategory } from "@/lib/googleSheets";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

interface RecentActivityProps {
  records: QMSRecord[];
  isLoading?: boolean;
}

function getActivityType(record: QMSRecord): "created" | "approved" | "pending" | "issue" {
  const reviews = record.fileReviews || {};
  const reviewValues = Object.values(reviews) as Array<{ status?: string }>;
  const fileReviewEntries = reviewValues.filter(r => r && typeof r === "object" && "status" in r);
  const statuses = fileReviewEntries.map(r => (r?.status || "").toLowerCase());
  const approvedCount = statuses.filter(s => s === "approved" || s === "✅" || s.includes("approved")).length;
  const rejectedCount = statuses.filter(s => s === "rejected" || s.includes("invalid") || s === "❌").length;
  const pendingCount = statuses.filter(s => s === "" || s === "pending" || s === "pending_review" || s.includes("under")).length;
  const auditStatus = (record.auditStatus || "").toLowerCase();

  if (auditStatus.includes("nc") || auditStatus.includes("issue")) return "issue";
  if (rejectedCount > 0 && rejectedCount >= approvedCount) return "issue";

  const auditOk = auditStatus.includes("✅") || auditStatus.includes("ok");
  if (auditOk || record.reviewed) return "approved";
  if (approvedCount > 0 && pendingCount === 0 && rejectedCount === 0) return "approved";

  const hasRecords = (record.actualRecordCount || 0) > 0 || (record.lastSerial && record.lastSerial !== "No Files Yet");
  if (hasRecords && pendingCount > 0) return "pending";
  if (hasRecords && approvedCount > 0) return "approved";

  return "created";
}

const typeConfig = {
  created: { icon: FileText, color: "text-info", bg: "bg-info/10", borderColor: "border-info/20", label: "New" },
  approved: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", borderColor: "border-success/20", label: "Approved" },
  pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10", borderColor: "border-warning/20", label: "Pending" },
  issue: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", borderColor: "border-destructive/20", label: "Issue" },
};

export function RecentActivity({ records, isLoading = false }: RecentActivityProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-card rounded-sm border border-border/50">
        <div className="px-5 py-4 border-b border-border/50">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="divide-y divide-border/30">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="p-4 flex gap-3">
              <Skeleton className="w-8 h-8 rounded-sm" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-sm border border-border/50 accent-line-top">
      <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
        <button onClick={() => navigate("/activity")} className="text-[10px] font-semibold text-primary hover:underline">
          View all →
        </button>
      </div>

      <div className="relative">
        {/* Timeline connector line */}
        {records.length > 1 && (
          <div className="absolute left-[34px] top-4 bottom-4 w-px bg-gradient-to-b from-border/50 via-border/30 to-transparent" />
        )}

        <div className="divide-y divide-border/30">
          {records.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No recent activity</div>
          ) : (
            records.map((record, i) => {
              const type = getActivityType(record);
              const config = typeConfig[type];
              const Icon = config.icon;
              return (
                <div key={`${record.code}-${i}`} className="px-5 py-3 hover:bg-muted/20 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0 relative z-10 border", config.bg, config.borderColor)}>
                      <Icon className={cn("w-3.5 h-3.5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{record.recordName}</span>
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-sm", config.bg, config.color)}>{config.label}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span className="font-mono">{record.code}</span>
                        <span>·</span>
                        <span className="font-mono">{formatTimeAgo(record.lastFileDate)}</span>
                        {record.reviewedBy && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{record.reviewedBy}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {record.folderLink && (
                      <a href={record.folderLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-muted-foreground/30 hover:text-primary transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
