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
  const statuses = reviewValues.map(r => (r?.status || "").toLowerCase());
  const hasApproved = statuses.some(s => s === "approved" || s === "✅" || s.includes("approved"));
  const hasRejected = statuses.some(s => s === "rejected" || s.includes("invalid") || s === "❌" || s.includes("nc"));
  const hasPending = reviewValues.length === 0
    ? false
    : statuses.some(s => s === "" || s === "pending" || s === "pending_review" || s.includes("under"));

  const auditStatus = (record.auditStatus || "").toLowerCase();
  if (auditStatus.includes("nc") || auditStatus.includes("issue") || auditStatus.includes("invalid") || auditStatus.includes("❌") || hasRejected) {
    return "issue";
  }

  // If there are any files and at least one is not approved yet → pending
  const hasRecords = (record.actualRecordCount || 0) > 0 || (record.lastSerial && record.lastSerial !== "No Files Yet");
  if (hasRecords && (hasPending || !hasApproved)) {
    return "pending";
  }

  if (record.reviewed || hasApproved) {
    return "approved";
  }

  return "created";
}

const typeConfig = {
  created: {
    icon: FileText,
    color: "text-info",
    bg: "bg-info/10",
    label: "Created"
  },
  approved: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    label: "Approved"
  },
  pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    label: "Pending"
  },
  issue: {
    icon: AlertTriangle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    label: "Issue"
  },
};

export function RecentActivity({ records, isLoading = false }: RecentActivityProps) {
  const navigate = useNavigate();
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="p-5 border-b border-border">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-5 border-b border-border">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Latest updates from Google Sheets</p>
      </div>

      <div className="divide-y divide-border">
        {records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No recent activity found
          </div>
        ) : (
          records.map((record, index) => {
            const activityType = getActivityType(record);
            const config = typeConfig[activityType];
            const Icon = config.icon;

            return (
              <div
                key={`${record.code}-${index}`}
                className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    config.bg
                  )}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-foreground truncate">
                        {record.recordName}
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium shrink-0",
                        config.bg, config.color
                      )}>
                        {config.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-mono">{record.code}</span>
                      <span>•</span>
                      <span>{getModuleForCategory(record.category)}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {record.reviewedBy && (
                        <>
                          <User className="w-3 h-3" />
                          <span>{record.reviewedBy}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>{formatTimeAgo(record.lastFileDate)}</span>
                      {record.folderLink && (
                        <a
                          href={record.folderLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto text-accent hover:text-accent/80 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => navigate("/audit")}
          className="text-sm text-accent hover:text-accent/80 font-medium transition-colors"
        >
          View all activity →
        </button>
      </div>
    </div>
  );
}
