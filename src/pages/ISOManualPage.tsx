import { useState, useMemo, useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Menu, 
  ChevronRight, 
  BookOpen, 
  FileText, 
  History, 
  User, 
  Calendar,
  Layers,
  Info,
  ExternalLink,
  Printer,
  ChevronDown,
  ArrowRight,
  Pencil,
  Save,
  X,
  RotateCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { MANNUAL_METADATA, type ManualSection } from "@/lib/ManualContent";
import { useManualData } from "@/hooks/useManualData";
import { toast } from "sonner";

export default function ISOManualPage() {
  const [activeModule, setActiveModule] = useState("iso-manual");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(localStorage.getItem('sidebarCollapsed') === 'true');
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data, updateSection, updateSubsection, resetToDefault, isLoaded } = useManualData();

  useEffect(() => {
    if (isLoaded && !selectedSectionId && data.length > 0) {
      setSelectedSectionId(data[0].id);
    }
  }, [isLoaded, data, selectedSectionId]);

  useEffect(() => {
    const handler = (e: CustomEvent) => setSidebarCollapsed(e.detail);
    window.addEventListener('qms-sidebar-toggle', handler as EventListener);
    return () => window.removeEventListener('qms-sidebar-toggle', handler as EventListener);
  }, []);

  const filteredContent = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(section => 
      section.title.toLowerCase().includes(query) || 
      section.content.toLowerCase().includes(query) ||
      section.subsections?.some(sub => sub.title.toLowerCase().includes(query) || sub.content.toLowerCase().includes(query))
    );
  }, [searchQuery, data]);

  const activeSection = useMemo(() => 
    data.find(s => s.id === selectedSectionId) || data[0]
  , [selectedSectionId, data]);

  const handleSaveSection = (title: string, content: string) => {
    updateSection(selectedSectionId, { title, content });
    toast.success("Section updated successfully");
  };

  const handleSaveSubsection = (subId: string, content: string) => {
    updateSubsection(selectedSectionId, subId, content);
    toast.success("Subsection updated successfully");
  };

  if (!isLoaded || !activeSection) return null;

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar activeModule={activeModule} onModuleChange={setActiveModule} />
      <div className={cn("flex-1 flex flex-col transition-all duration-300", sidebarCollapsed ? "md:ml-[60px]" : "md:ml-60")}>
        <Header />
        
        <main className="flex-1 flex flex-col h-[calc(100vh-64px)]">
          {/* Dashboard-style Top Header */}
          <div className="border-b bg-card px-4 md:px-6 py-4 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">ISO 9001:2015 Manual</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    {MANNUAL_METADATA.documentNo}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                    Revision {MANNUAL_METADATA.revisionNo} • {MANNUAL_METADATA.updateDate}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative group sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Search clauses..." 
                  className="pl-9 h-9 bg-muted/50 border-none group-focus-within:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex items-center gap-1 border-l pl-2 ml-1">
                <Button 
                  variant={isEditMode ? "default" : "outline"} 
                  size="sm" 
                  className="gap-2 h-9"
                  onClick={() => setIsEditMode(!isEditMode)}
                >
                  {isEditMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                  {isEditMode ? "Exit Edit" : "Edit Manual"}
                </Button>
                
                {isEditMode && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2 h-9 text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (confirm("Are you sure you want to reset the manual to its original text? This cannot be undone.")) {
                        resetToDefault();
                        toast.info("Manual reset to default");
                      }
                    }}
                  >
                    <RotateCcw className="w-4 h-4" /> Reset
                  </Button>
                )}
                
                {!isEditMode && (
                  <Button variant="outline" size="sm" className="hidden sm:flex gap-2 h-9">
                    <Printer className="w-4 h-4" /> Print
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* Native Navigation Sidebar */}
            <div className={cn(
              "w-72 border-r bg-muted/20 flex flex-col transition-all z-20",
              "fixed inset-y-0 left-0 bg-background md:relative md:bg-transparent md:translate-x-0",
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            )}>
              <div className="p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Table of Contents</span>
                <Menu className="w-4 h-4 md:hidden" onClick={() => setMobileMenuOpen(false)} />
              </div>
              <ScrollArea className="flex-1 px-2 pb-4">
                <div className="space-y-1">
                  {filteredContent.map((section) => (
                    <div key={section.id}>
                      <button
                        onClick={() => {
                          setSelectedSectionId(section.id);
                          setMobileMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all text-left",
                          selectedSectionId === section.id 
                            ? "bg-primary text-primary-foreground font-medium shadow-sm" 
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span className="truncate">{section.title}</span>
                        {selectedSectionId === section.id && <ChevronRight className="w-4 h-4 ml-auto" />}
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Document Metadata Footer */}
              <div className="p-4 border-t bg-muted/50 text-[10px] space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1"><User className="w-3 h-3" /> Prepared</span>
                  <span className="font-medium text-foreground">{MANNUAL_METADATA.preparedBy}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span className="flex items-center gap-1"><History className="w-3 h-3" /> Approved</span>
                  <span className="font-medium text-foreground">{MANNUAL_METADATA.approvedBy}</span>
                </div>
                <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/50">
                  <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> Status</span>
                  <Badge variant="outline" className="h-4 px-1 text-[8px] bg-green-500/10 text-green-600 border-green-200">ACTIVE</Badge>
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col bg-background/50 relative overflow-hidden">
              <ScrollArea className="flex-1">
                <div className="max-w-4xl mx-auto px-6 py-8 md:py-12">
                  {/* Section Title Header */}
                  <div className="mb-10 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest">
                      <span>ISO 9001:2015 Clause</span>
                      <ArrowRight className="w-3 h-3" />
                    </div>
                    {isEditMode ? (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-muted-foreground">Section Title</Label>
                        <Input 
                          value={activeSection.title}
                          onChange={(e) => updateSection(activeSection.id, { title: e.target.value })}
                          className="text-2xl font-bold h-12"
                        />
                      </div>
                    ) : (
                      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground transition-all">
                        {activeSection.title}
                      </h2>
                    )}
                    <div className="h-1.5 w-20 bg-primary rounded-full" />
                  </div>

                  <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                    {/* Main Section Content Area */}
                    <div className={cn(
                      "text-lg leading-relaxed bg-card p-6 rounded-2xl border border-border shadow-sm transition-all",
                      isEditMode ? "ring-2 ring-primary/20 bg-primary/5" : "text-slate-700 dark:text-slate-300 font-medium"
                    )}>
                      {isEditMode ? (
                        <div className="space-y-4">
                           <Label className="text-xs uppercase text-muted-foreground">Clause Description</Label>
                           <Textarea 
                              value={activeSection.content}
                              onChange={(e) => updateSection(activeSection.id, { content: e.target.value })}
                              className="min-h-[200px] text-lg bg-background border-primary/20 focus-visible:ring-primary"
                           />
                           <div className="flex justify-end">
                              <Badge className="bg-primary/10 text-primary border-primary/20 pointer-events-none">Auto-saving to cloud...</Badge>
                           </div>
                        </div>
                      ) : (
                        activeSection.content.split('\n').map((line, i) => (
                          <p key={i} className="mb-4 last:mb-0">
                            {line.startsWith('- ') ? (
                              <span className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                                <span>{line.substring(2)}</span>
                              </span>
                            ) : line}
                          </p>
                        ))
                      )}
                    </div>

                    {/* Subsections rendering */}
                    {activeSection.subsections && activeSection.subsections.length > 0 && (
                      <div className="grid gap-6 mt-12">
                        <div className="flex items-center gap-2 mb-2">
                           <Layers className="w-4 h-4 text-primary" />
                           <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Sub-Clauses</h3>
                        </div>
                        {activeSection.subsections.map((sub) => (
                          <Card key={sub.id} className={cn(
                            "overflow-hidden border-none shadow-md bg-card/60 backdrop-blur-sm group transition-all",
                            isEditMode ? "ring-1 ring-primary/30" : "hover:bg-card"
                          )}>
                            <div className={cn("h-1 bg-muted group-hover:bg-primary transition-all duration-500", isEditMode && "bg-primary")} />
                            <CardContent className="p-6">
                              <div className="flex items-center justify-between mb-4 border-b pb-3 border-border/50">
                                <h3 className="text-xl font-bold flex items-center gap-2">
                                  <span className="text-primary/40 text-sm font-mono">{sub.id.toUpperCase()}</span>
                                  {sub.title}
                                </h3>
                                {isEditMode && <Badge variant="outline" className="bg-primary/5 text-primary">Sub-section</Badge>}
                              </div>
                              
                              {isEditMode ? (
                                <Textarea 
                                  value={sub.content}
                                  onChange={(e) => updateSubsection(activeSection.id, sub.id, e.target.value)}
                                  className="min-h-[150px] bg-background border-primary/10"
                                />
                              ) : (
                                <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                  {sub.content}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom Navigation */}
                  <div className="mt-16 pt-8 border-t flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground italic">
                      <div className="flex items-center gap-1.5">
                        <Info className="w-4 h-4" />
                        <span>Confidential Property of {MANNUAL_METADATA.company}</span>
                      </div>
                    </div>
                    <Button variant="ghost" className="gap-2 text-primary" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                      Back to top <ChevronDown className="w-4 h-4 rotate-180" />
                    </Button>
                  </div>
                </div>
              </ScrollArea>

              {/* Mobile Menu Trigger */}
              <Button 
                variant="default" 
                size="icon" 
                className={cn(
                   "fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-xl md:hidden z-50 ring-4 ring-primary/20 transition-all",
                   mobileMenuOpen && "scale-0"
                )}
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


