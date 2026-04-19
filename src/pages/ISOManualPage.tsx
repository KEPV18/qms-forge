import { useState, useMemo, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { cn } from "@/lib/utils";
import {
  Search, Menu, ChevronRight, BookOpen, FileText, History, User,
  Layers, Info, ChevronDown, ArrowRight, Pencil, X, RotateCcw, Printer
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
import { Button } from "@/components/ui/button";

export default function ISOManualPage() {
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const { data, updateSection, updateSubsection, resetToDefault, isLoaded } = useManualData();

  useEffect(() => {
    if (isLoaded && !selectedSectionId && data.length > 0) setSelectedSectionId(data[0].id);
  }, [isLoaded, data, selectedSectionId]);

  const filteredContent = useMemo(() => {
    if (!searchQuery) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(section =>
      section.title.toLowerCase().includes(query) ||
      section.content.toLowerCase().includes(query) ||
      section.subsections?.some(sub => sub.title.toLowerCase().includes(query) || sub.content.toLowerCase().includes(query))
    );
  }, [searchQuery, data]);

  const activeSection = useMemo(() => data.find(s => s.id === selectedSectionId) || data[0], [selectedSectionId, data]);

  const currentIndex = data.findIndex(s => s.id === selectedSectionId);
  const prevSection = currentIndex > 0 ? data[currentIndex - 1] : null;
  const nextSection = currentIndex < data.length - 1 ? data[currentIndex + 1] : null;

  if (!isLoaded || !activeSection) return null;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "ISO 9001 Manual" }]} className="!p-0 !max-w-none">
      {/* Top Bar */}
      <div className="border-b border-border/50 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm px-4 md:px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-primary/15 to-primary/5 rounded-sm border border-primary/10">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ISO 9001:2015 Manual</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className="text-[9px] h-5 bg-primary/5 text-primary border-primary/15 font-mono">
                {MANNUAL_METADATA.documentNo}
              </Badge>
              <span className="text-[10px] text-muted-foreground font-medium">
                Rev {MANNUAL_METADATA.revisionNo} • {MANNUAL_METADATA.updateDate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search clauses..."
              className="pl-8 h-8 text-xs bg-muted/40 border-border/50 group-focus-within:ring-1 rounded-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="h-6 w-px bg-border/50 mx-1" />
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            className="gap-1.5 h-8 text-xs rounded-sm"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            {isEditMode ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
            {isEditMode ? "Exit" : "Edit"}
          </Button>
          {isEditMode && (
            <Button
              variant="outline" size="sm"
              className="gap-1.5 h-8 text-xs text-destructive hover:bg-destructive/10 rounded-sm"
              onClick={() => {
                if (confirm("Reset manual to original text?")) { resetToDefault(); toast.info("Manual reset"); }
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          )}
          {!isEditMode && (
            <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5 h-8 text-xs rounded-sm" onClick={() => window.print()}>
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation */}
        <div className={cn(
          "w-64 border-r border-border/40 bg-muted/10 flex flex-col transition-all z-20",
          "fixed inset-y-0 left-0 bg-background md:relative md:bg-transparent md:translate-x-0",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em]">Contents</span>
            <Badge variant="outline" className="h-4 px-1.5 text-[9px] bg-muted/50 border-border/50">{data.length}</Badge>
          </div>
          <ScrollArea className="flex-1 px-2 pb-2">
            <div className="space-y-0.5">
              {filteredContent.map((section, idx) => {
                const isActive = selectedSectionId === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => { setSelectedSectionId(section.id); setMobileMenuOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 text-[12px] rounded-sm transition-all text-left group",
                      isActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/20"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-sm flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-colors",
                      isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground/60"
                    )}>
                      {idx + 1}
                    </span>
                    <span className="truncate">{section.title.replace(/^\d+\.\s*/, '')}</span>
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Metadata Footer */}
          <div className="p-3 border-t border-border/30 bg-muted/20 space-y-1.5 text-[10px]">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1"><User className="w-3 h-3" /> Prepared</span>
              <span className="font-semibold text-foreground">{MANNUAL_METADATA.preparedBy}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="flex items-center gap-1"><History className="w-3 h-3" /> Approved</span>
              <span className="font-semibold text-foreground">{MANNUAL_METADATA.approvedBy}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground pt-1 border-t border-border/30">
              <span>Status</span>
              <Badge variant="outline" className="h-4 px-1.5 text-[8px] bg-success/10 text-success border-success/20">ACTIVE</Badge>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-muted/10 relative overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="max-w-3xl mx-auto px-6 py-8 md:py-10">
              {/* Section Header */}
              <div className="mb-8 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary/70 uppercase tracking-[0.2em]">
                  <div className="w-6 h-px bg-primary/30" />
                  <span>Clause {currentIndex + 1} of {data.length}</span>
                </div>
                {isEditMode ? (
                  <Input
                    value={activeSection.title}
                    onChange={(e) => updateSection(activeSection.id, { title: e.target.value })}
                    className="text-2xl font-bold h-12 border-primary/20"
                  />
                ) : (
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                    {activeSection.title}
                  </h2>
                )}
                <div className="h-1 w-16 bg-gradient-to-r from-primary to-primary/30 rounded-sm" />
              </div>

              {/* Main Content Block */}
              <div className={cn(
                "p-5 rounded-sm border transition-all",
                isEditMode
                  ? "ring-2 ring-primary/20 bg-primary/5 border-primary/15"
                  : "bg-card border-border/50 shadow-sm"
              )}>
                {isEditMode ? (
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Description</Label>
                    <Textarea
                      value={activeSection.content}
                      onChange={(e) => updateSection(activeSection.id, { content: e.target.value })}
                      className="min-h-[180px] text-sm bg-background border-primary/15 focus-visible:ring-primary"
                    />
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
                    {activeSection.content.split('\n').map((line, i) => (
                      <p key={i} className="last:mb-0">
                        {line.startsWith('- ') ? (
                          <span className="flex items-start gap-2.5">
                            <span className="w-1.5 h-1.5 rounded-none bg-primary mt-1.5 flex-shrink-0" />
                            <span className="text-foreground/80">{line.substring(2)}</span>
                          </span>
                            ) : <span className="text-foreground/80">{line}</span>}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Subsections */}
              {activeSection.subsections && activeSection.subsections.length > 0 && (
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-3.5 h-3.5 text-primary/60" />
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60">Sub-Clauses</h3>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                  {activeSection.subsections.map((sub, idx) => (
                    <div
                      key={sub.id}
                      className={cn(
                        "rounded-sm border overflow-hidden transition-all",
                        isEditMode ? "ring-1 ring-primary/20 border-primary/15" : "border-border/40 hover:border-border/60 hover:shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "h-0.5 transition-colors",
                        isEditMode ? "bg-primary" : "bg-gradient-to-r from-primary/20 to-transparent"
                      )} />
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline" className="h-5 px-1.5 text-[9px] font-mono bg-muted/50 text-muted-foreground border-border/50">
                            {currentIndex + 1}.{idx + 1}
                          </Badge>
                          <h4 className="text-sm font-bold text-foreground">{sub.title}</h4>
                        </div>
                        {isEditMode ? (
                          <Textarea
                            value={sub.content}
                            onChange={(e) => updateSubsection(activeSection.id, sub.id, e.target.value)}
                            className="min-h-[120px] text-sm bg-background border-primary/10"
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{sub.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Navigation */}
              <div className="mt-10 pt-6 border-t border-border/40 flex items-center justify-between">
                {prevSection ? (
                  <button
                    onClick={() => setSelectedSectionId(prevSection.id)}
                    className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                  >
                    <ChevronDown className="w-3.5 h-3.5 rotate-90 group-hover:-translate-x-0.5 transition-transform" />
                    <span className="truncate max-w-[200px]">{prevSection.title}</span>
                  </button>
                ) : <div />}
                {nextSection ? (
                  <button
                    onClick={() => setSelectedSectionId(nextSection.id)}
                    className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors font-medium group"
                  >
                    <span className="truncate max-w-[200px]">{nextSection.title}</span>
                    <ChevronDown className="w-3.5 h-3.5 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ) : <div />}
              </div>
            </div>
          </ScrollArea>

          {/* Mobile FAB */}
          <Button
            variant="default" size="icon"
            className={cn(
              "fixed bottom-6 right-6 h-11 w-11 rounded-sm shadow-xl md:hidden z-50 ring-4 ring-primary/15",
              mobileMenuOpen && "scale-0"
            )}
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}