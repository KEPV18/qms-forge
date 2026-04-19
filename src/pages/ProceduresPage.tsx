import { useState, useEffect, useCallback, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getAccessToken } from "@/lib/auth";
import {
  FileText, Folder, ChevronLeft, ChevronRight, Maximize2, Minimize2,
  ExternalLink, Loader2, RefreshCw, List, Grid, Eye, Pencil,
  ArrowLeft, FileCode, Table as TableIcon, Search,
  Library, Archive, Save, X, RotateCcw, ArrowRight, Layers, Info, Printer, User, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProceduresData } from "@/hooks/useProceduresData";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || "";
const PROCEDURES_FOLDER_ID = import.meta.env.VITE_PROCEDURES_FOLDER_ID || "";

interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  modifiedTime: string;
  createdTime: string;
  size?: string;
}

function getPreviewUrl(file: DriveItem): string {
  if (file.mimeType.includes("google-apps.document") || file.mimeType.includes("google-apps.spreadsheet") || file.mimeType.includes("google-apps.presentation")) {
    const id = file.id;
    if (file.mimeType.includes("document")) return `https://docs.google.com/document/d/${id}/preview`;
    if (file.mimeType.includes("spreadsheet")) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    if (file.mimeType.includes("presentation")) return `https://docs.google.com/presentation/d/${id}/preview`;
  }
  if (file.mimeType.includes("wordprocessing") || file.mimeType.includes("msword")) return `https://docs.google.com/document/d/${file.id}/preview`;
  if (file.mimeType.includes("spreadsheet") || file.mimeType.includes("ms-excel")) return `https://docs.google.com/spreadsheets/d/${file.id}/preview`;
  if (file.mimeType.includes("presentation") || file.mimeType.includes("ms-powerpoint")) return `https://docs.google.com/presentation/d/${file.id}/preview`;
  if (file.mimeType.includes("pdf")) return `https://drive.google.com/file/d/${file.id}/preview`;
  return `https://drive.google.com/file/d/${file.id}/preview`;
}

function getEditUrl(file: DriveItem): string {
  return file.webViewLink || `https://drive.google.com/file/d/${file.id}/edit`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.includes("folder")) return <Folder className="w-4 h-4 text-accent" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <TableIcon className="w-4 h-4 text-success" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileText className="w-4 h-4 text-primary" />;
  if (mimeType.includes("pdf")) return <FileCode className="w-4 h-4 text-destructive" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <FileText className="w-4 h-4 text-warning" />;
  return <FileText className="w-4 h-4 text-muted-foreground" />;
}

function getFileTypeBadge(mimeType: string) {
  if (mimeType.includes("document") || mimeType.includes("word")) return { label: "DOC", color: "bg-primary/10 text-primary border-primary/20" };
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return { label: "SHEET", color: "bg-success/10 text-success border-success/20" };
  if (mimeType.includes("pdf")) return { label: "PDF", color: "bg-destructive/10 text-destructive border-destructive/20" };
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return { label: "SLIDES", color: "bg-accent/10 text-accent border-accent/20" };
  if (mimeType.includes("folder")) return { label: "FOLDER", color: "bg-muted text-muted-foreground border-border" };
  return { label: "FILE", color: "bg-muted text-muted-foreground border-border" };
}

async function fetchFolderFiles(folderId: string, searchQuery: string = ""): Promise<DriveItem[]> {
  let queryStr = `'${folderId}' in parents and trashed=false`;
  if (searchQuery.trim()) queryStr += ` and fullText contains '${searchQuery.trim()}'`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&fields=files(id,name,mimeType,webViewLink,modifiedTime,createdTime,size)&orderBy=name&key=${API_KEY}&pageSize=100`;
  const token = await getAccessToken();
  const options: RequestInit = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  const res = await fetch(url, options);
  if (!res.ok) throw new Error("Failed to fetch folder");
  const data = await res.json();
  return data.files || [];
}

export default function ProceduresPage() {
  const [activeTab, setActiveTab] = useState("digital");

  // Digital Procedures State
  const { data: digitalProcedures, updateProcedure, resetToDefault, isLoaded: digitalLoaded } = useProceduresData();
  const [selectedProcId, setSelectedProcId] = useState("");
  const [procSearchQuery, setProcSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Drive State
  const [files, setFiles] = useState<DriveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [driveSearch, setDriveSearch] = useState("");
  const [debouncedDriveSearch, setDebouncedDriveSearch] = useState("");
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([
    { id: PROCEDURES_FOLDER_ID, name: "02. Procedures" }
  ]);

  useEffect(() => {
    if (digitalLoaded && !selectedProcId && digitalProcedures.length > 0) setSelectedProcId(digitalProcedures[0].id);
  }, [digitalLoaded, digitalProcedures, selectedProcId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriveSearch(driveSearch), 500);
    return () => clearTimeout(timer);
  }, [driveSearch]);

  const loadDriveFiles = useCallback(async () => {
    setLoading(true);
    try {
      const items = await fetchFolderFiles(folderStack[folderStack.length - 1].id, debouncedDriveSearch);
      items.sort((a, b) => {
        const aFolder = a.mimeType.includes("folder") ? 0 : 1;
        const bFolder = b.mimeType.includes("folder") ? 0 : 1;
        if (aFolder !== bFolder) return aFolder - bFolder;
        return a.name.localeCompare(b.name);
      });
      setFiles(items);
    } catch (err) {
      console.error("Error");
    } finally {
      setLoading(false);
    }
  }, [folderStack, debouncedDriveSearch]);

  useEffect(() => {
    if (activeTab === "archive") loadDriveFiles();
  }, [activeTab, loadDriveFiles]);

  const filteredDigitalProcedures = useMemo(() => {
    if (!procSearchQuery) return digitalProcedures;
    const query = procSearchQuery.toLowerCase();
    return digitalProcedures.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.purpose.toLowerCase().includes(query) ||
      p.procedureText.toLowerCase().includes(query)
    );
  }, [procSearchQuery, digitalProcedures]);

  const activeProcedure = useMemo(() =>
    digitalProcedures.find(p => p.id === selectedProcId) || digitalProcedures[0]
  , [selectedProcId, digitalProcedures]);

  const nonFolderFiles = files.filter(f => !f.mimeType.includes("folder"));
  const selectedDriveFile = selectedIndex !== null ? nonFolderFiles[selectedIndex] : null;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Procedures" }]} className="!p-0 !max-w-none">
      {/* Top Bar */}
      <div className="border-b border-border/50 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm px-4 md:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary/15 to-primary/5 rounded-sm border border-primary/10">
            <FileCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quality Procedures</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.15em] font-medium">Standard Operating Procedures (SOP)</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 bg-muted/30 backdrop-blur-sm rounded-sm">
            <TabsTrigger value="digital" className="gap-1.5 text-xs rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Library className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Digital</span>
            </TabsTrigger>
            <TabsTrigger value="archive" className="gap-1.5 text-xs rounded-sm data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Archive className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Drive Archive</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === "digital" ? (
          <>
            {/* Sidebar */}
            <div className="w-64 border-r border-border/40 bg-muted/10 flex flex-col hidden md:flex">
              <div className="p-3 space-y-2">
                <div className="relative group">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    placeholder="Search..."
                    className="pl-8 h-8 text-xs bg-background/50 border-border/50 group-focus-within:ring-1 rounded-sm"
                    value={procSearchQuery}
                    onChange={(e) => setProcSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <ScrollArea className="flex-1 px-2 pb-2">
                <div className="space-y-0.5">
                  {filteredDigitalProcedures.map((proc, idx) => {
                    const isActive = selectedProcId === proc.id;
                    return (
                      <button
                        key={proc.id}
                        onClick={() => setSelectedProcId(proc.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-sm transition-all text-left group",
                          isActive
                            ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        )}
                      >
                        <span className={cn(
                          "w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold flex-shrink-0",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground/60"
                          )}>
                          {idx + 1}
                        </span>
                        <span className="truncate">{proc.title}</span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
              <div className="p-3 border-t border-border/30 bg-muted/20 space-y-2">
                <Button
                  variant={isEditMode ? "default" : "outline"}
                  size="sm"
                  className="w-full gap-1.5 h-8 text-xs rounded-sm"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  {isEditMode ? "Exit Edit" : "Edit"}
                </Button>
                {isEditMode && (
                  <Button
                    variant="ghost" size="sm"
                    className="w-full gap-1.5 h-7 text-[10px] text-destructive"
                    onClick={() => confirm("Reset all procedures?") && resetToDefault()}
                  >
                    <RotateCcw className="w-3 h-3" /> Reset all
                  </Button>
                )}
              </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/10 relative overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="max-w-3xl mx-auto px-6 py-8 md:py-10">
                  {activeProcedure && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                      {/* Title */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em]">
                          <div className="w-6 h-px bg-primary/30" />
                          <span>Standard Procedure</span>
                        </div>
                        {isEditMode ? (
                          <Input
                            value={activeProcedure.title}
                            onChange={(e) => updateProcedure(activeProcedure.id, { title: e.target.value })}
                            className="text-2xl font-bold h-12 border-primary/20"
                          />
                        ) : (
                          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">{activeProcedure.title}</h2>
                        )}
                        <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/30 rounded-sm" />
                      </div>

                      {/* Purpose & Responsibilities */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className={cn("p-4 rounded-sm border transition-all", isEditMode ? "border-primary/15 bg-primary/5" : "border-border/40 bg-card")}>
                          <div className="flex items-center gap-2 mb-3">
                            <Info className="w-3.5 h-3.5 text-primary/60" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Purpose & Scope</span>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <Label className="text-[9px] text-muted-foreground uppercase font-bold">Purpose</Label>
                              {isEditMode ? (
                                <Input value={activeProcedure.purpose} onChange={(e) => updateProcedure(activeProcedure.id, { purpose: e.target.value })} className="bg-background mt-1 h-8 text-xs" />
                              ) : (
                                <p className="text-xs text-foreground/80 mt-1">{activeProcedure.purpose}</p>
                              )}
                            </div>
                            <div>
                              <Label className="text-[9px] text-muted-foreground uppercase font-bold">Scope</Label>
                              {isEditMode ? (
                                <Input value={activeProcedure.scope} onChange={(e) => updateProcedure(activeProcedure.id, { scope: e.target.value })} className="bg-background mt-1 h-8 text-xs" />
                              ) : (
                                <p className="text-xs text-foreground/80 mt-1">{activeProcedure.scope}</p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={cn("p-4 rounded-sm border transition-all", isEditMode ? "border-primary/15 bg-primary/5" : "border-border/40 bg-card")}>
                          <div className="flex items-center gap-2 mb-3">
                            <User className="w-3.5 h-3.5 text-primary/60" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Responsibilities</span>
                          </div>
                          {isEditMode ? (
                            <Textarea value={activeProcedure.responsibilities} onChange={(e) => updateProcedure(activeProcedure.id, { responsibilities: e.target.value })} className="bg-background mt-1 min-h-[80px] text-xs" />
                          ) : (
                            <p className="text-xs text-foreground/80 leading-relaxed">{activeProcedure.responsibilities}</p>
                          )}
                        </div>
                      </div>

                      {/* Procedure Text */}
                      <div className={cn(
                        "p-5 rounded-sm border transition-all",
                        isEditMode ? "ring-2 ring-primary/20 bg-primary/5 border-primary/15" : "bg-card border-border/50 shadow-sm"
                      )}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-primary/60" />
                            <h3 className="text-sm font-bold">Step-by-Step Procedure</h3>
                          </div>
                          {isEditMode && <Badge variant="outline" className="bg-primary/5 text-primary text-[9px]">Editing</Badge>}
                          </div>

                          {isEditMode ? (
                            <Textarea
                              value={activeProcedure.procedureText}
                              onChange={(e) => updateProcedure(activeProcedure.id, { procedureText: e.target.value })}
                              className="min-h-[350px] text-sm leading-relaxed bg-background border-primary/10"
                            />
                          ) : (
                            <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                              {activeProcedure.procedureText}
                            </div>
                          )}
                        </div>

                      {/* Footer */}
                      <div className="pt-6 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><History className="w-3 h-3" /> Rev: 01</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> P-SOP-{activeProcedure.id.toUpperCase()}</span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                          Back to top
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          /* ===== GOOGLE DRIVE ARCHIVE VIEW ===== */
          <div className="flex-1 flex flex-col p-4 md:p-5 overflow-hidden">
            {/* Breadcrumbs & Controls */}
            <div className="flex justify-between items-center gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                {folderStack.length > 1 && (
                  <Button variant="ghost" size="sm" onClick={() => setFolderStack(prev => prev.slice(0, -1))} className="h-7 gap-1 text-xs px-2">
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </Button>
                )}
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  {folderStack.map((f, i) => (
                    <span key={i} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3" />}
                      <span
                        className={cn(i === folderStack.length - 1 ? "text-foreground font-semibold" : "cursor-pointer hover:text-foreground")}
                        onClick={() => i < folderStack.length - 1 && setFolderStack(prev => prev.slice(0, i + 1))}
                      >
                        {f.name}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input placeholder="Search..." value={driveSearch} onChange={(e) => setDriveSearch(e.target.value)} className="pl-8 h-7 text-xs bg-muted/20 border-border/50 rounded-sm" />
                </div>
                <Button variant="ghost" size="icon" onClick={loadDriveFiles} className="h-7 w-7">
                  <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")} className="h-7 w-7">
                  {viewMode === "list" ? <Grid className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {selectedDriveFile ? (
              /* File Viewer */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between mb-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button variant="outline" size="sm" onClick={() => setSelectedIndex(null)} className="h-7 gap-1 text-xs rounded-sm px-2">
                      <ArrowLeft className="w-3.5 h-3.5" /> Files
                    </Button>
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(selectedDriveFile.mimeType)}
                      <span className="text-xs font-semibold truncate">{selectedDriveFile.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] h-5 font-mono">
                      {(selectedIndex ?? 0) + 1}/{nonFolderFiles.length}
                    </Badge>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setSelectedIndex(selectedIndex! > 0 ? selectedIndex! - 1 : 0)} disabled={selectedIndex === 0}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setSelectedIndex(selectedIndex! < nonFolderFiles.length - 1 ? selectedIndex! + 1 : selectedIndex!)} disabled={selectedIndex === nonFolderFiles.length - 1}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                    <div className="h-5 w-px bg-border/50 mx-0.5" />
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-sm" onClick={() => window.open(getEditUrl(selectedDriveFile), '_blank')}>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className={cn(
                  "rounded-sm border border-border/50 overflow-hidden bg-card flex-1 shadow-sm",
                  isFullscreen ? "h-[calc(100vh-80px)]" : "h-[calc(100vh-140px)]"
                )}>
                  <iframe key={selectedDriveFile.id} src={getPreviewUrl(selectedDriveFile)} className="w-full h-full" title={selectedDriveFile.name} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" />
                </div>
              </div>
            ) : (
              /* File List */
              loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : viewMode === "grid" ? (
                <div className="flex-1 overflow-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {files.map((file) => (
                      <button
                        key={file.id}
                        onClick={() => file.mimeType.includes("folder") ? setFolderStack(prev => [...prev, { id: file.id, name: file.name }]) : setSelectedIndex(nonFolderFiles.findIndex(f => f.id === file.id))}
                        className="flex flex-col items-center gap-2 p-4 rounded-sm border border-border/30 hover:border-border/60 hover:bg-muted/30 transition-all text-center group"
                      >
                        <div className="w-10 h-10 rounded-sm bg-muted/50 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <span className="text-[11px] font-medium truncate w-full">{file.name}</span>
                        <Badge variant="outline" className={cn("text-[8px] h-4", getFileTypeBadge(file.mimeType).color)}>
                          {getFileTypeBadge(file.mimeType).label}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-sm border border-border/40 overflow-hidden bg-card flex-1 shadow-sm">
                  <ScrollArea className="h-full">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => file.mimeType.includes("folder") ? setFolderStack(prev => [...prev, { id: file.id, name: file.name }]) : setSelectedIndex(nonFolderFiles.findIndex(f => f.id === file.id))}
                        className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 cursor-pointer border-b border-border/20 last:border-0 transition-colors group"
                      >
                        <div className="flex items-center gap-3 truncate">
                          {getFileIcon(file.mimeType)}
                          <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">{file.name}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="outline" className={cn("text-[8px] h-4", getFileTypeBadge(file.mimeType).color)}>
                            {getFileTypeBadge(file.mimeType).label}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground w-16 text-right">{new Date(file.modifiedTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}