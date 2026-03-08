import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { listFolderFiles, parseSerialFromFilename, extractFolderId, moveFileToArchive } from "@/lib/driveService";
import { parseStatusFromAuditField } from "@/lib/statusService";
import type { DriveFile } from "@/lib/driveService";
import type { QMSRecord } from "@/lib/googleSheets";
import { ExternalLink, FileText, Loader2, FolderOpen, Settings, Trash2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/googleSheets";
import { EditMetadataModal } from "./EditMetadataModal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/hooks/useNotifications";

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

            // Add notification
            addNotification({
                type: 'archive',
                title: 'Record Archived',
                message: `${fileName} moved to archive. Click to manage archived files.`,
                link: '/archive',
                data: { fileId, originalParentId: folderId }
            });

            toast({
                title: "Record Archived",
                description: `Moved ${fileName} to the archive folder.`,
            });
            await loadFiles();
            queryClient.invalidateQueries({ queryKey: ["qms-data"] });
        } catch (err: any) {
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
            console.error(err);
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
                                        className="flex flex-col p-4 bg-card rounded-xl border border-border/50 hover:border-sidebar-primary/30 transition-all gap-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-4 h-4 text-foreground" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="font-bold text-sm truncate">{file.name}</span>
                                                        {(() => {
                                                            const review = record.fileReviews?.[file.id] || { status: 'pending_review' };
                                                            return <StatusBadge status={review.status as any} size="sm" />;
                                                        })()}
                                                    </div>
                                                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 font-medium">
                                                        {serial && <span className="text-sidebar-primary font-mono">{serial}</span>}
                                                        <span>•</span>
                                                        <span>Added {formatTimeAgo(file.createdTime)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-sidebar-primary/10 hover:text-sidebar-primary"
                                                    onClick={() => window.open(file.webViewLink, '_blank')}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50"
                                                    onClick={() => handleArchive(file.id, file.name)}
                                                    disabled={isLoading}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Audit Details */}
                                        <div className="grid grid-cols-2 gap-4 px-3 py-2 bg-muted/20 rounded-lg border border-border/30">
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Reviewed By</p>
                                                <p className="text-xs font-semibold">{record.fileReviews?.[file.id]?.reviewedBy || record.reviewedBy || "—"}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Review Date</p>
                                                <p className="text-xs font-semibold">
                                                    {record.fileReviews?.[file.id]?.reviewDate ? new Date(record.fileReviews[file.id].reviewDate).toLocaleDateString() : 
                                                     record.reviewDate ? new Date(record.reviewDate).toLocaleDateString() : "—"}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-2 bg-muted/10 rounded-lg border border-border/30">
                                            <p className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Audit Notes</p>
                                            <p className="text-xs font-medium break-words">
                                                {record.fileReviews?.[file.id]?.comment?.trim() || "—"}
                                            </p>
                                        </div>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1 h-8 text-[11px] font-bold gap-2"
                                                onClick={() => setEditingFile({ id: file.id, name: file.name })}
                                            >
                                                <Settings className="w-3 h-3" />
                                                Edit Metadata
                                            </Button>
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
