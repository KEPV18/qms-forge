import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listFolderFiles, parseSerialFromFilename, extractFolderId, moveFileToArchive } from "@/lib/driveService";
import { parseStatusFromAuditField } from "@/lib/statusService";
import type { DriveFile } from "@/lib/driveService";
import type { QMSRecord } from "@/lib/googleSheets";
import { ExternalLink, FileText, Loader2, FolderOpen, Settings, Trash2, Briefcase, CalendarClock, UserCheck, CalendarDays } from "lucide-react";
import { formatTimeAgo } from "@/lib/googleSheets";
import { EditMetadataModal } from "./EditMetadataModal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications, getAdminUserIds } from "@/hooks/useNotifications";

interface RecordBrowserProps {
    record: QMSRecord;
    isFlat?: boolean;
}

export function RecordBrowser({ record, isFlat = false }: RecordBrowserProps) {
    const [files, setFiles] = useState<DriveFile[]>(record.files || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(isFlat || false);
    const [error, setError] = useState<string | null>(null);
    const [editingFile, setEditingFile] = useState<{ id: string; name: string } | null>(null);
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { addNotification } = useNotifications();

    const handleArchive = async (fileId: string, fileName: string) => {
        if (!window.confirm(`Are you sure you want to archive "${fileName}"? It will be moved to the archive folder for 30 days.`)) return;

        setIsLoading(true);
        try {
            const folderId = extractFolderId(record.folderLink);
            if (!folderId) throw new Error("Could not find folder ID");

            await moveFileToArchive(fileId, folderId);

            // Notify all admins
            const adminIds = await getAdminUserIds();
            if (adminIds.length > 0) {
                await addNotification({
                    type: 'archive',
                    title: 'File Deleted',
                    message: `"${fileName}" from ${record.recordName} (${record.code}) was deleted.`,
                    link: '/archive',
                    data: { fileId, originalParentId: folderId, recordCode: record.code },
                    targetUserIds: adminIds,
                });
            }

            toast({
                title: "Record Archived",
                description: `Moved ${fileName} to the archive folder.`,
            });
            await loadFiles();
            queryClient.invalidateQueries({ queryKey: ["qms-data"] });
        } catch (err: unknown) {
            toast({
                title: "Archive Failed",
                description: err.message || "Failed to archive record",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Auto-expand if there are pending files or in flat mode
        const hasPending = record.files?.some(file => {
            const review = record.fileReviews?.[file.id];
            return !review || (review.status !== 'approved' && review.status !== 'rejected');
        });

        if (hasPending || isFlat) {
            setIsExpanded(true);
        }

        if (isExpanded && files.length === 0 && !record.files) {
            loadFiles();
        }
    }, [isExpanded, record.files, record.fileReviews, isFlat]);

    const loadFiles = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const driveFiles = await listFolderFiles(record.folderLink);
            setFiles(driveFiles);
        } catch (err) {
            setError("Failed to load files from Drive");
            console.error("Error");
        } finally {
            setIsLoading(false);
        }
    };

    const recordStatus = parseStatusFromAuditField(record.auditStatus);

    return (
        <div className={cn(
            isFlat ? "" : "bg-card rounded-xl border border-border p-4 space-y-3"
        )}>
            {!isFlat && (
                <>
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{record.recordName}</h3>
                                <span className="text-sm text-muted-foreground">({record.code})</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{record.description}</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                        <div>
                            <div className="text-xs text-muted-foreground">Total Records</div>
                            <div className="text-2xl font-bold">{record.actualRecordCount || 0}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Last Serial</div>
                            <div className="text-lg font-semibold">{record.lastSerial || "N/A"}</div>
                        </div>
                        <div>
                            <div className="text-xs text-muted-foreground">Last Updated</div>
                            <div className="text-sm font-medium">
                                {record.lastFileDate ? formatTimeAgo(record.lastFileDate) : "Never"}
                            </div>
                        </div>
                    </div>

                    {/* View Records Button */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExpanded(!isExpanded)}
                            disabled={!record.folderLink || record.folderLink.includes("No Files Yet")}
                            className="flex-1"
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            {isExpanded ? "Hide Records" : `View ${record.actualRecordCount || 0} Records`}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(record.folderLink, '_blank')}
                            disabled={!record.folderLink || record.folderLink.includes("No Files Yet")}
                        >
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                    </div>
                </>
            )}

            {/* Records List */}
            {isExpanded && (
                <div className={isFlat ? "space-y-2" : "border-t pt-3 space-y-2"}>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Loading files...</span>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-sm text-destructive">
                            {error}
                        </div>
                    ) : files.length === 0 ? (
                        <div className="text-center py-8 text-sm text-muted-foreground">
                            No files found in this folder
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-muted-foreground mb-2">
                                {files.length} file{files.length !== 1 ? 's' : ''} found
                            </div>
                            {files.map((file) => {
                                const serial = parseSerialFromFilename(file.name);

                                return (
                                    <div
                                        key={file.id}
                                        className="group relative bg-card/40 backdrop-blur-xl border border-border/40 hover:border-sidebar-primary/40 rounded-3xl p-5 md:p-6 transition-all duration-500 shadow-sm hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                                    >
                                        {/* Subtle Background Glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                        
                                        <div className="relative z-10">
                                            {/* Header */}
                                            <div className="flex flex-col md:flex-row md:items-start justify-between gap-5 mb-6">
                                                <div className="flex items-start gap-4 flex-1 min-w-0">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sidebar-primary/20 to-sidebar-primary/5 flex items-center justify-center shrink-0 shadow-inner border border-sidebar-primary/10 group-hover:scale-105 transition-transform duration-500">
                                                        <FileText className="w-6 h-6 text-sidebar-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0 pt-0.5">
                                                        <h4 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-sidebar-primary transition-colors duration-300">{file.name}</h4>
                                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                            {serial && <span className="text-[10px] font-mono font-bold bg-background/80 shadow-sm px-2 py-0.5 rounded-md border border-border/50">{serial}</span>}
                                                            {(() => {
                                                                const review = record.fileReviews?.[file.id] || { status: 'pending_review' };
                                                                return <StatusBadge status={review.status} size="sm" />;
                                                            })()}
                                                            <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                                <CalendarDays className="w-3 h-3" />
                                                                {formatTimeAgo(file.createdTime)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Actions */}
                                                <div className="flex items-center gap-2 shrink-0 self-start bg-background/50 rounded-xl p-1 border border-border/40 shadow-sm transition-opacity opacity-80 group-hover:opacity-100">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 gap-1.5 text-xs font-semibold hover:bg-sidebar-primary/10 hover:text-sidebar-primary rounded-lg transition-colors"
                                                        onClick={() => window.open(file.webViewLink, '_blank')}
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                        Open
                                                    </Button>
                                                    <div className="w-px h-4 bg-border/50 mx-0.5" />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                                        onClick={() => handleArchive(file.id, file.name)}
                                                        disabled={isLoading}
                                                        title="Delete File"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Metadata Grid (Premium Style) */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/20 rounded-2xl p-4 border border-border/40 relative overflow-hidden">
                                                <div className="absolute inset-0 bg-background/20 backdrop-blur-3xl pointer-events-none" />
                                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-lg bg-sidebar-primary/10 flex items-center justify-center shrink-0">
                                                        <Briefcase className="w-4 h-4 text-sidebar-primary" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Project</p>
                                                        <p className="text-xs font-bold text-foreground truncate">
                                                            {record.fileReviews?.[file.id]?.project || "General"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                                                        <CalendarClock className="w-4 h-4 text-info" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Target Period</p>
                                                        <p className="text-xs font-bold text-foreground">
                                                            M{record.fileReviews?.[file.id]?.targetMonth || "—"} / {record.fileReviews?.[file.id]?.targetYear || "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                                                        <UserCheck className="w-4 h-4 text-success" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Reviewed By</p>
                                                        <p className="text-xs font-bold text-foreground truncate">
                                                            {record.fileReviews?.[file.id]?.reviewedBy || record.reviewedBy || "—"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background/80 transition-colors relative z-10 border border-transparent hover:border-border/50 shadow-sm hover:shadow">
                                                    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                                                        <CalendarDays className="w-4 h-4 text-warning" />
                                                    </div>
                                                    <div className="min-w-0 pt-0.5">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-0.5">Review Date</p>
                                                        <p className="text-xs font-bold text-foreground">
                                                            {(() => {
                                                                const review = record.fileReviews?.[file.id];
                                                                const rawDate = review?.reviewDate || review?.date || record.reviewDate;
                                                                if (!rawDate) return "—";
                                                                const d = new Date(rawDate);
                                                                if (isNaN(d.getTime())) return rawDate;
                                                                return d.toLocaleDateString();
                                                            })()}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Audit Notes & Settings */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 mt-5 border-t border-border/40">
                                                <div className="flex-1 min-w-0 relative">
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10 rounded-full" />
                                                    <div className="pl-4">
                                                        <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest mb-1.5 flex items-center gap-1.5">
                                                            <FileText className="w-3 h-3 text-primary/70" />
                                                            Audit Notes
                                                        </p>
                                                        <p className="text-sm text-foreground/90 leading-relaxed font-medium line-clamp-2">
                                                            {record.fileReviews?.[file.id]?.comment?.trim() || <span className="text-muted-foreground italic font-normal">No additional notes provided.</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-10 px-4 gap-2 text-xs shrink-0 font-bold bg-background shadow-sm hover:shadow-md text-primary border-primary/20 hover:border-primary/50 hover:bg-primary/5 self-start sm:self-center transition-all rounded-xl"
                                                    onClick={() => setEditingFile({ id: file.id, name: file.name })}
                                                >
                                                    <Settings className="w-4 h-4" />
                                                    Edit Metadata
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
            {editingFile && (
                <EditMetadataModal
                    isOpen={!!editingFile}
                    onClose={() => setEditingFile(null)}
                    record={record}
                    fileId={editingFile.id}
                    fileName={editingFile.name}
                    onSuccess={() => {
                        loadFiles();
                    }}
                />
            )}
        </div>
    );
}
