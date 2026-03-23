import { useState, useEffect, useCallback, useMemo } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProceduresData } from "@/hooks/useProceduresData";
import { toast } from "sonner";

const API_KEY = "AIzaSyDltPnR5hhwfDrjlwi7lS78R_kDIZbQpWo";
const PROCEDURES_FOLDER_ID = "1PU8pLn43kH0fLy7gmCm_qt3B-2-CHqmr";

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
  if (mimeType.includes("folder")) return <Folder className="w-5 h-5 text-accent" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <TableIcon className="w-5 h-5 text-success" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileText className="w-5 h-5 text-primary" />;
  if (mimeType.includes("pdf")) return <FileCode className="w-5 h-5 text-destructive" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <FileText className="w-5 h-5 text-warning" />;
  return <FileText className="w-5 h-5 text-muted-foreground" />;
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
  const [activeModule, setActiveModule] = useState("procedures");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
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
  const [driveMode, setDriveMode] = useState<"preview" | "edit">("preview");
  const [driveSearch, setDriveSearch] = useState("");
  const [debouncedDriveSearch, setDebouncedDriveSearch] = useState("");
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([
    { id: PROCEDURES_FOLDER_ID, name: "02. Procedures" }
  ]);

  useEffect(() => {
    if (digitalLoaded && !selectedProcId && digitalProcedures.length > 0) {
      setSelectedProcId(digitalProcedures[0].id);
    }
  }, [digitalLoaded, digitalProcedures, selectedProcId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDriveSearch(driveSearch), 500);
    return () => clearTimeout(timer);
  }, [driveSearch]);

  useEffect(() => {
    const handler = (e: CustomEvent) => setSidebarCollapsed(e.detail);
    window.addEventListener('qms-sidebar-toggle', handler as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handler as EventListener);
  }, []);

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
      console.error("Failed to load procedures:", err);
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
    <div className="min-h-screen flex bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarCollapsed ? "md:ml-[60px]" : "md:ml-60")}>
        <Header />
        <main className="flex-1 flex flex-col min-h-0">
          
          <div className="border-b bg-card px-4 md:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileCode className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Quality Procedures</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Standard Operating Procedures (SOP)</p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/40 backdrop-blur-sm">
                <TabsTrigger value="digital" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Library className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Digital Procedures</span> <span className="sm:hidden">Digital</span>
                </TabsTrigger>
                <TabsTrigger value="archive" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Archive className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Google Drive Archive</span> <span className="sm:hidden">Archive</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === "digital" ? (
              /* ===== DIGITAL PROCEDURES VIEW ===== */
              <>
                <div className="w-72 border-r bg-muted/20 flex flex-col hidden md:flex">
                  <div className="p-4 space-y-3">
                    <div className="relative group">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input 
                        placeholder="Search procedures..." 
                        className="pl-9 h-9 bg-background/50 border-none group-focus-within:ring-1"
                        value={procSearchQuery}
                        onChange={(e) => setProcSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1 px-2 pb-4">
                    <div className="space-y-1">
                      {filteredDigitalProcedures.map((proc) => (
                        <button
                          key={proc.id}
                          onClick={() => setSelectedProcId(proc.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all text-left",
                            selectedProcId === proc.id 
                              ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <FileText className="w-4 h-4 shrink-0" />
                          <span className="truncate">{proc.title}</span>
                          {selectedProcId === proc.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t bg-muted/50 text-center">
                    <Button 
                      variant={isEditMode ? "default" : "outline"} 
                      size="sm" 
                      className="w-full gap-2 h-9"
                      onClick={() => setIsEditMode(!isEditMode)}
                    >
                      {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                      {isEditMode ? "Exit Edit" : "Edit Procedures"}
                    </Button>
                    {isEditMode && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full gap-2 h-8 mt-2 text-destructive text-[10px]"
                        onClick={() => confirm("Reset all procedures?") && resetToDefault()}
                      >
                        <RotateCcw className="w-3 h-3" /> Reset all
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
                  <ScrollArea className="flex-1">
                    <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
                      {activeProcedure && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                          <div className="space-y-4">
                            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest">
                              <span>Standard Procedure</span>
                              <ArrowRight className="w-3 h-3" />
                            </div>
                            {isEditMode ? (
                              <Input 
                                value={activeProcedure.title}
                                onChange={(e) => updateProcedure(activeProcedure.id, { title: e.target.value })}
                                className="text-3xl font-bold h-14"
                              />
                            ) : (
                              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">{activeProcedure.title}</h2>
                            )}
                            <div className="h-1.5 w-20 bg-primary rounded-full" />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card className="bg-muted/30 border-none shadow-none">
                              <CardHeader className="py-4">
                                <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                                  <Info className="w-4 h-4 text-primary" /> Purpose & Scope
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Purpose</Label>
                                  {isEditMode ? (
                                    <Input value={activeProcedure.purpose} onChange={(e) => updateProcedure(activeProcedure.id, { purpose: e.target.value })} className="bg-background mt-1" />
                                  ) : (
                                    <p className="text-sm font-medium">{activeProcedure.purpose}</p>
                                  )}
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground uppercase font-bold">Scope</Label>
                                  {isEditMode ? (
                                    <Input value={activeProcedure.scope} onChange={(e) => updateProcedure(activeProcedure.id, { scope: e.target.value })} className="bg-background mt-1" />
                                  ) : (
                                    <p className="text-sm font-medium">{activeProcedure.scope}</p>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                            <Card className="bg-muted/30 border-none shadow-none">
                              <CardHeader className="py-4">
                                <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
                                  <User className="w-4 h-4 text-primary" /> Responsibilities
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                {isEditMode ? (
                                  <Textarea value={activeProcedure.responsibilities} onChange={(e) => updateProcedure(activeProcedure.id, { responsibilities: e.target.value })} className="bg-background mt-1 min-h-[100px]" />
                                ) : (
                                  <p className="text-sm font-medium leading-relaxed">{activeProcedure.responsibilities}</p>
                                )}
                              </CardContent>
                            </Card>
                          </div>

                          <div className={cn(
                            "p-8 rounded-2xl border border-border shadow-sm bg-card",
                            isEditMode && "ring-2 ring-primary/20 bg-primary/5"
                          )}>
                            <div className="flex items-center justify-between mb-6">
                              <h3 className="text-xl font-bold flex items-center gap-2">
                                <Layers className="w-5 h-5 text-primary" /> Step-by-Step Procedure
                              </h3>
                              {isEditMode && <Badge variant="outline" className="bg-primary/5 text-primary">Editing Mode</Badge>}
                            </div>
                            
                            {isEditMode ? (
                              <Textarea 
                                value={activeProcedure.procedureText}
                                onChange={(e) => updateProcedure(activeProcedure.id, { procedureText: e.target.value })}
                                className="min-h-[400px] text-lg leading-relaxed bg-background border-primary/10"
                                placeholder="Enter procedure steps..."
                              />
                            ) : (
                              <div className="prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-loose">
                                {activeProcedure.procedureText}
                              </div>
                            )}
                          </div>

                          <div className="pt-8 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1"><History className="w-3 h-3" /> Rev: 01</span>
                              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> DOC: P-SOP-{activeProcedure.id.toUpperCase()}</span>
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
              <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
                <div className="flex justify-between items-start sm:items-center gap-3 mb-4 flex-col sm:flex-row">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {folderStack.length > 1 && <Button variant="ghost" size="sm" onClick={() => setFolderStack(prev => prev.slice(0, -1))} className="gap-1.5"><ArrowLeft className="w-4 h-4" /> Back</Button>}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {folderStack.map((f, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <ChevronRight className="w-3 h-3" />}
                          <span className={cn(i === folderStack.length - 1 ? "text-foreground font-semibold" : "cursor-pointer hover:text-foreground")} onClick={() => i < folderStack.length - 1 && setFolderStack(prev => prev.slice(0, i + 1))}>
                            {f.name}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
                    <div className="relative w-full sm:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" /><Input placeholder="Search archive..." value={driveSearch} onChange={(e) => setDriveSearch(e.target.value)} className="pl-9 h-8 text-xs bg-muted/20" /></div>
                    <Button variant="ghost" size="icon" onClick={loadDriveFiles} className="h-8 w-8"><RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")} className="h-8 w-8">{viewMode === "list" ? <Grid className="w-4 h-4" /> : <List className="w-4 h-4" />}</Button>
                  </div>
                </div>

                {selectedDriveFile ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Button variant="outline" size="sm" onClick={() => setSelectedIndex(null)} className="h-8 gap-1.5"><ArrowLeft className="w-4 h-4" /> Files</Button>
                        <div className="flex items-center gap-2 truncate">
                          {getFileIcon(selectedDriveFile.mimeType)}
                          <h2 className="text-xs font-bold truncate">{selectedDriveFile.name}</h2>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedIndex(selectedIndex! > 0 ? selectedIndex! - 1 : 0)} disabled={selectedIndex === 0}><ChevronLeft className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setSelectedIndex(selectedIndex! < nonFolderFiles.length - 1 ? selectedIndex! + 1 : selectedIndex!)} disabled={selectedIndex === nonFolderFiles.length - 1}><ChevronRight className="w-4 h-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => window.open(getEditUrl(selectedDriveFile), '_blank')}><ExternalLink className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border overflow-hidden bg-card flex-1"><iframe key={selectedDriveFile.id} src={getPreviewUrl(selectedDriveFile)} className="w-full h-full" title={selectedDriveFile.name} sandbox="allow-scripts allow-same-origin allow-popups allow-forms" /></div>
                  </div>
                ) : (
                  loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> :
                  <div className="rounded-xl border border-border overflow-hidden bg-card flex-1">
                    <ScrollArea className="h-full">
                      {files.map((file) => (
                        <div key={file.id} onClick={() => file.mimeType.includes("folder") ? setFolderStack(prev => [...prev, { id: file.id, name: file.name }]) : setSelectedIndex(nonFolderFiles.findIndex(f => f.id === file.id))} className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 cursor-pointer border-b border-border/30 last:border-0 transition-colors">
                          <div className="flex items-center gap-3 truncate">
                            {getFileIcon(file.mimeType)}
                            <span className="text-xs font-medium truncate">{file.name}</span>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                            <Badge variant="outline" className={cn("text-[9px]", getFileTypeBadge(file.mimeType).color)}>{getFileTypeBadge(file.mimeType).label}</Badge>
                            <span className="text-[10px] text-muted-foreground w-20 text-right">{new Date(file.modifiedTime).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}

