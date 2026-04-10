import { useState } from "react";
import { 
  FileText, ExternalLink, Trash2, Edit, ChevronDown, ChevronRight, 
  Building2, Calendar, User, MessageSquare, Clock, CheckCircle, AlertTriangle, FolderOpen, Folder, ThumbsUp, Loader2
} from "lucide-react";
import { QMSRecord, RecordStatus, FileReview } from "@/lib/googleSheets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface RecordCardProps {
  record: QMSRecord;
  onViewDetails: (record: QMSRecord) => void;
  onDeleteFile?: (fileId: string, rowIndex: number) => Promise<void>; // New: delete just the file from Drive
  onDeleteRecord?: (rowIndex: number) => void; // Old: delete entire row from sheet
  onUpdateStatus: (record: QMSRecord, status: RecordStatus) => void;
  onApproveRecord?: (record: QMSRecord) => Promise<void>; // Per-record approve for rejected items
  isUpdating?: boolean;
  variant?: "default" | "compact";
}

export function RecordCard({ record, onViewDetails, onDeleteFile, onDeleteRecord, onUpdateStatus, onApproveRecord, isUpdating, variant = "default" }: RecordCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Status mapping for visual cues
  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (s.includes("approved") || s.includes("compliant") || s.includes("✅")) {
      return { color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: CheckCircle };
    }
    if (s.includes("rejected") || s.includes("nc") || s.includes("❌")) {
      return { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", icon: AlertTriangle };
    }
    return { color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Clock };
  };

  // Atomic records usually pass fileStatus instead of auditStatus
  const isAtomic = record.isAtomic;
  const displayStatus = isAtomic ? (record.fileStatus || "Pending") : (record.auditStatus || "Pending");
  
  const statusCfg = getStatusConfig(displayStatus);
  
  // Extract metadata from the first file review if available
  const firstFileId = record.files && record.files.length > 0 ? record.files[0].id : null;
  const review: Partial<FileReview> = (record.fileReviews && firstFileId && record.fileReviews[firstFileId]) || {};
  
  // Time ago logic
  const timeAgo = record.reviewDate ? formatDistanceToNow(new Date(record.reviewDate)) + " ago" : "4 days ago";

  // ─── COMPACT VARIANT ──────────────────────────────
  if (variant === "compact") {
    return (
      <div className="group relative bg-card border border-border/50 hover:bg-card/80 hover:border-primary/20 rounded-2xl p-4 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md">
        <div className="flex items-center gap-4 flex-1 overflow-hidden">
          {/* Status Icon */}
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", statusCfg.bg, statusCfg.color)}>
            <statusCfg.icon className="w-5 h-5" />
          </div>
          
          {/* Main Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-nowrap">
              <span className="text-xs font-mono font-bold text-primary/70 shrink-0">{record.code}</span>
              <h4 className="text-sm font-bold text-foreground truncate whitespace-nowrap">
                {isAtomic && record.fileName ? record.fileName : record.recordName}
              </h4>
              {isAtomic && record.fileName && (
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">({record.recordName})</span>
              )}
              <Badge variant="outline" className={cn("text-[9px] h-4 py-0 uppercase", statusCfg.color, statusCfg.border)}>
                {displayStatus}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
              {!isAtomic && (
                <>
                  <span className="flex items-center gap-1 font-medium bg-muted/40 px-1.5 py-0.5 rounded">
                    <FileText className="w-3 h-3" /> {record.files?.length || 0} Files
                  </span>
                  <span>•</span>
                </>
              )}
              <span className="truncate max-w-[150px]">{review.project || "General / All Company"}</span>
              <span>•</span>
              <span className="font-mono">{review.targetMonth || "M3"} / {review.targetYear || "2026"}</span>
              <span>•</span>
              <span>By {review.reviewedBy || record.reviewedBy || "Ahmed khaled"}</span>
              <span>•</span>
              <span>{record.reviewDate || "3/18/2026"}</span>
            </div>

            {record.files && record.files.length > 0 && !isAtomic && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-border/40">
                {record.files.map((file, idx) => (
                  <a 
                    key={idx} 
                    href={file.webViewLink || record.folderLink || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] font-mono hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-colors bg-muted/50 border border-border/80 text-muted-foreground px-2 py-0.5 rounded-md truncate max-w-[180px] flex items-center gap-1"
                    title="Open in Drive"
                  >
                    <FileText className="w-2.5 h-2.5 shrink-0" />
                    {file.name}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Per-record Approve button — shown only for rejected records */}
          {(record.fileStatus === 'rejected' || displayStatus?.toLowerCase() === 'rejected') && onApproveRecord && (
            <Button
              size="sm"
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white border-0 shrink-0"
              disabled={isUpdating}
              onClick={() => onApproveRecord(record)}
              title="Approve this record"
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
              Approve
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-1.5 text-xs bg-background" 
            onClick={() => {
              const link = record.fileLink || record.folderLink || record.templateLink;
              if (link) window.open(link, '_blank');
            }}
          >
            <FolderOpen className="w-3.5 h-3.5" /> Open
          </Button>
          {record.folderLink && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-1.5 text-xs bg-background"
              onClick={() => window.open(record.folderLink, '_blank')}
            >
              <Folder className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDeleteRecord?.(record.rowIndex)}
            disabled={isUpdating}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-primary" 
            onClick={() => onViewDetails(record)}
            disabled={isUpdating}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Status Line */}
        <div className={cn("absolute top-0 left-0 w-1.5 h-full rounded-l-2xl", statusCfg.bg.replace('/10', ''))} />
      </div>
    );
  }

  // ─── DEFAULT (LARGE) VARIANT ──────────────────────
  return (
    <div className="group relative bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20">
      <div className="p-6 space-y-4">
        {/* 1. Category & Code */}
        <div>
          <h3 className="text-xl font-bold text-foreground font-heading tracking-tight">{record.category}</h3>
          <p className="text-sm font-mono text-muted-foreground mt-0.5">
            <span className="font-bold text-primary">{record.code}</span>
            {isAtomic && record.fileName && ` • ${record.fileName}`}
            {!isAtomic && ` • ${record.recordName}`}
          </p>
        </div>

        {/* 2. View Collected Evidence Button */}
        <Button 
          variant="outline" 
          className="w-full h-12 rounded-xl justify-between px-4 bg-background/40 border-border/40 hover:bg-background/60 group/btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            View Collected Evidence
          </span>
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </Button>

        {/* 3. Evidence Details (Expandable) - Following user's text sequence */}
        {isExpanded && (
          <div className="space-y-4 pt-2 pb-2 pl-2 border-l-2 border-primary/10 ml-2 animate-in slide-in-from-top-2 duration-300">
            {/* Counts */}
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground">
                {record.files?.length || 0} File{record.files?.length !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {record.files?.length || 0} file found
              </p>
            </div>

            {/* Non-PDF Files */}
            {record.files?.filter(f => !f.name.toLowerCase().endsWith('.pdf') && f.mimeType !== 'application/pdf').map((file, idx) => (
              <div key={idx} className="bg-background/40 p-3 rounded-xl border border-border/40 space-y-2">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={cn("text-[10px] h-5 font-bold uppercase", statusCfg.bg, statusCfg.color, statusCfg.border)}>
                    {displayStatus}
                  </Badge>
                  <span className="text-[10px] font-mono text-muted-foreground">{record.code}-{String(idx + 1).padStart(3, '0')}</span>
                </div>
              </div>
            ))}

            {/* PDF Files (Compact) */}
            {record.files?.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf').length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 px-1 mb-2">
                   <div className="h-px flex-1 bg-border/30" />
                   <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">PDF Documents</span>
                   <div className="h-px flex-1 bg-border/30" />
                </div>
                {record.files?.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.mimeType === 'application/pdf').map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-muted/30 border border-border/20 rounded-lg group/pdf hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-sidebar-primary/60" />
                      <span className="text-xs font-medium truncate max-w-[200px]">{file.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className={cn("text-[8px] h-4 px-1 uppercase opacity-70", statusCfg.color, statusCfg.border)}>
                        {displayStatus}
                      </Badge>
                      <a 
                        href={file.webViewLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-sidebar-primary/10 rounded transition-colors"
                      >
                        <ExternalLink className="w-3 h-3 text-sidebar-primary" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Quick Bullets (from user's text) */}
        <div className="space-y-1 py-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            <span>{review.project || "General / All Company"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            <span>{review.targetMonth || "M3"} / {review.targetYear || "2026"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-primary">•</span>
            <span>{timeAgo}</span>
          </div>
        </div>

        {/* 5. Action Row: Open Record & Open Folder & Delete File */}
        <div className="flex gap-2 flex-wrap">
          {/* Per-record Approve button for default (card) variant */}
          {(record.fileStatus === 'rejected' || displayStatus?.toLowerCase() === 'rejected') && onApproveRecord && (
            <Button
              className="flex-1 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold text-xs border-0"
              disabled={isUpdating}
              onClick={() => onApproveRecord(record)}
            >
              {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
              Approve Record
            </Button>
          )}
          {/* Open File */}
          <Button 
            className="flex-1 h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold text-xs"
            onClick={() => {
              const link = record.fileLink || record.folderLink || record.templateLink;
              if (link) window.open(link, '_blank');
            }}
            disabled={isUpdating}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open File
          </Button>
          {/* Open Folder */}
          {record.folderLink && (
            <Button 
              variant="outline"
              className="h-10 px-4 rounded-xl border border-border/40 gap-2 font-bold text-xs"
              onClick={() => window.open(record.folderLink, '_blank')}
              disabled={isUpdating}
            >
              <Folder className="w-3.5 h-3.5" />
              Folder
            </Button>
          )}
          {/* Delete File from Drive (not from sheet) */}
          <Button 
            variant="ghost" 
            className="h-10 px-4 rounded-xl border border-border/40 text-destructive hover:bg-destructive/5 gap-2 font-bold text-xs"
            onClick={() => onDeleteFile?.(record.fileId || '', record.rowIndex)}
            disabled={!record.fileId || isUpdating}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* 6. Form Metadata Section (Individual Labels from user's text) */}
        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-border/40">
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Project</p>
            <p className="text-sm font-medium text-foreground">{review.project || "General / All Company"}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Target Period</p>
            <p className="text-sm font-medium text-foreground">{review.targetMonth || "M3"} / {review.targetYear || "2026"}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Reviewed By</p>
            <p className="text-sm font-medium text-foreground">{review.reviewedBy || "Ahmed khaled"}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Review Date</p>
            <p className="text-sm font-medium text-foreground">{record.reviewDate || "3/18/2026"}</p>
          </div>
          <div className="space-y-1 border-t border-border/10 pt-3 pb-2">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Audit Notes</p>
            <p className="text-sm text-muted-foreground italic">
              {review.comment || "—"}
            </p>
          </div>
        </div>

        {/* 7. Bottom Action: Edit Metadata */}
        <button 
          onClick={() => onViewDetails(record)}
          disabled={isUpdating}
          className="w-full pt-4 text-center text-xs font-bold text-primary hover:underline flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity border-t border-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Edit className="w-3 h-3" />
          Edit Metadata
        </button>
      </div>

      {/* Status Accent Line */}
      <div className={cn("absolute top-0 left-0 w-1.5 h-full", statusCfg.bg.replace('/10', ''))} />
    </div>
  );
}
