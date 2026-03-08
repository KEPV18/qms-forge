import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { listAllArchivedFiles, restoreFileFromArchive, permanentlyDeleteDriveFile, checkAndCleanupExpiredArchives } from "@/lib/driveService";
import type { DriveFile } from "@/lib/driveService";
import { Button } from "@/components/ui/button";
import { Trash2, RotateCcw, FileText, ExternalLink, Loader2, Archive, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo } from "@/lib/googleSheets";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

export default function ArchivePage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');

    useEffect(() => {
        const handleToggle = (event: Event) => {
            const customEvent = event as CustomEvent<boolean>;
            setSidebarCollapsed(customEvent.detail);
        };
        window.addEventListener('qms-sidebar-toggle', handleToggle as EventListener);
        return () => window.removeEventListener('qms-sidebar-toggle', handleToggle as EventListener);
    }, []);
    const [archivedFiles, setArchivedFiles] = useState<DriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        loadArchivedFiles();
        // Run lazy cleanup in background
        checkAndCleanupExpiredArchives().then(count => {
            if (count > 0) {
                toast({ title: "Auto-Cleanup", description: `Removed ${count} expired files from archive.` });
                loadArchivedFiles(); // Reload if anything was deleted
            }
        });
    }, []);

    const loadArchivedFiles = async () => {
        setIsLoading(true);
        try {
            const files = await listAllArchivedFiles();
            setArchivedFiles(files);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load archived files",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRestore = async (file: DriveFile) => {
        let originalParentId: string | null = null;

        if (file.description && file.description.includes("originalParentId:")) {
            originalParentId = file.description.split("originalParentId:")[1];
        }

        if (!originalParentId) {
            toast({
                title: "Restore Limited",
                description: "Could not find original folder metadata. Please move the file manually in Google Drive.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true);
        try {
            await restoreFileFromArchive(file.id, originalParentId);
            toast({
                title: "Success",
                description: `${file.name} has been restored to its original folder.`
            });
            await loadArchivedFiles();
            queryClient.invalidateQueries();
        } catch (error) {
            toast({ title: "Error", description: "Failed to restore file", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (file: DriveFile) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY delete "${file.name}"? This action cannot be undone.`)) return;

        setIsLoading(true);
        try {
            await permanentlyDeleteDriveFile(file.id);
            toast({
                title: "Deleted",
                description: "File permanently removed from Google Drive.",
            });
            await loadArchivedFiles();
            queryClient.invalidateQueries();
        } catch (error) {
            toast({
                title: "Delete Failed",
                description: "Failed to permanently delete the file.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const filteredFiles = archivedFiles.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar activeModule="archive" onModuleChange={() => { }} />
            <div className={`flex-1 flex flex-col ml-0 transition-all duration-300 ${sidebarCollapsed ? "md:ml-16" : "md:ml-64"}`}>
                <Header />
                <main className="flex-1">
                    <div className="p-8">
                        <div className="max-w-6xl mx-auto space-y-8">
                            {/* Page Header */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shadow-lg shadow-amber-500/10 border border-amber-500/20">
                                            <Archive className="w-6 h-6 text-amber-500" />
                                        </div>
                                        <h1 className="text-3xl font-bold tracking-tight font-heading">Record Archive</h1>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-60">Manage files that have been moved to archive folders.</p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="relative w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search archive..."
                                            className="pl-9 h-10 bg-background/50 border-border/50 rounded-xl focus:ring-accent/40"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    <Button variant="outline" onClick={loadArchivedFiles} disabled={isLoading} className="h-10 rounded-xl">
                                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                                        Refresh
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="overflow-x-auto glass-card rounded-2xl border border-border/50 shadow-xl overflow-hidden">
                                {isLoading && archivedFiles.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-10 h-10 animate-spin text-sidebar-primary" />
                                        <p className="text-muted-foreground font-medium">Scanning Drive for archived records...</p>
                                    </div>
                                ) : filteredFiles.length > 0 ? (
                                    <div className="divide-y divide-border/30">
                                        {filteredFiles.map((file) => (
                                            <div key={file.id} className="p-5 hover:bg-primary/5 transition-all duration-300 flex items-center justify-between group border-b border-border/10">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
                                                        <FileText className="w-5 h-5 text-foreground group-hover:text-amber-500 transition-colors" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-sm truncate">{file.name}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                                            <span>Archived {formatTimeAgo(file.modifiedTime)}</span>
                                                            <span>•</span>
                                                            <span className="text-amber-600">Retention: 30 Days</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-muted-foreground hover:text-foreground"
                                                        onClick={() => window.open(file.webViewLink, '_blank')}
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-muted-foreground hover:text-sidebar-primary"
                                                        onClick={() => handleRestore(file)}
                                                        disabled={isLoading}
                                                    >
                                                        <RotateCcw className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-muted-foreground hover:text-destructive"
                                                        onClick={() => handleDelete(file)}
                                                        disabled={isLoading}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                            <Archive className="w-8 h-8 text-muted-foreground/30" />
                                        </div>
                                        <h3 className="text-lg font-bold mb-1">No archived files found</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs">
                                            {searchTerm ? `No archived files matching "${searchTerm}"` : "Archived files will appear here until they are permanently deleted."}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Retention Notice */}
                            <div className="p-6 rounded-2xl glass-card bg-amber-500/[0.03] border border-amber-500/20 flex gap-4 items-start relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full blur-2xl" />
                                <Archive className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
                                <div className="relative z-10">
                                    <p className="text-sm font-bold text-amber-600 uppercase tracking-widest font-heading mb-1">Auto-Retention Policy</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                                        Archived files are moved to a specific 'Archive' folder in Google Drive.
                                        This platform lists them for convenience. Please note that permanent deletion from Drive is immediate and cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        </div>
    );
}
