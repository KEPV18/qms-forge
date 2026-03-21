import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Loader2, FileText, Check, AlertTriangle, FileX, PlayCircle, Save } from "lucide-react";
import { QMSRecord, updateSheetCell } from "@/lib/googleSheets";
import { renameDriveFile } from "@/lib/driveService";
import { runAutomatedAudit, AuditRecordResult } from "@/lib/auditCheckService";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AutomatedAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: QMSRecord[];
}

export function AutomatedAuditModal({ isOpen, onClose, records }: AutomatedAuditModalProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentCode: "" });
  const [results, setResults] = useState<AuditRecordResult[] | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set());
  const [isFixing, setIsFixing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setTimeout(() => {
        setIsRunning(false);
        setProgress({ current: 0, total: 0, currentCode: "" });
        setResults(null);
      }, 300);
    }
  }, [isOpen]);

  const handleStartAudit = async () => {
    setIsRunning(true);
    setResults(null);
    try {
      const auditResults = await runAutomatedAudit(records, (current, total, recordCode) => {
        setProgress({ current, total, currentCode: recordCode });
      });
      setResults(auditResults);
    } catch (error) {
      console.error("Audit failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleApplyResults = async () => {
    if (!results) return;
    setIsApplying(true);
    
    try {
      const recordsWithIssues = results.filter(r => r.suggestedStatus === 'rejected');
      const cleanRecords = results.filter(r => r.suggestedStatus === 'approved');
      let updatedCount = 0;
      
      // Only update "clean" records if they currently have an 'auditIssues' field (meaning they were previously flagged)
      const recordsToClear = cleanRecords.filter(cr => {
        const original = records.find(r => r.code === cr.recordCode);
        const reviews = original?.fileReviews as any;
        return reviews?.recordStatus === 'rejected';
      });

      if (recordsWithIssues.length === 0 && recordsToClear.length === 0) {
        toast({ title: "Audit Status Synchronized", description: "No new issues to apply, and no old issues need clearing." });
        setIsApplying(false);
        return;
      }

      // 1. Mark Issues
      for (const res of recordsWithIssues) {
        const original = records.find(r => r.code === res.recordCode);
        if (!original) continue;
        
        const currentReviews = original.fileReviews || {};
        const updatedMetadata = {
          ...currentReviews,
          recordStatus: 'rejected',
          lastAuditDate: new Date().toISOString(),
          auditIssues: res.issues
        };
        
        await updateSheetCell(original.rowIndex, 'P', JSON.stringify(updatedMetadata));
        updatedCount++;
      }

      // 2. Clear resolved issues
      for (const res of recordsToClear) {
        const original = records.find(r => r.code === res.recordCode);
        if (!original) continue;
        
        const currentReviews = { ...(original.fileReviews as any) };
        delete (currentReviews as any).recordStatus;
        delete (currentReviews as any).auditIssues;
        (currentReviews as any).lastAuditDate = new Date().toISOString();
        
        await updateSheetCell(original.rowIndex, 'P', JSON.stringify(currentReviews));
        updatedCount++;
      }

      toast({ title: "Dashboard Synchronized", description: `Updated ${updatedCount} forms with latest audit findings.` });
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      onClose();
    } catch (error: any) {
      console.error("Failed to apply audit results:", error);
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  const handleFixNames = async () => {
    if (selectedFixes.size === 0 || !results) return;
    setIsFixing(true);
    let successCount = 0;
    
    try {
      const fixesToApply = results.flatMap(r => r.suggestedFixes || [])
                                 .filter(f => selectedFixes.has(f.id));
      
      for (const fix of fixesToApply) {
        const success = await renameDriveFile(fix.id, fix.suggestedName);
        if (success) successCount++;
      }
      
      toast({ 
        title: "Renaming Complete", 
        description: `Successfully renamed ${successCount} items. Syncing with Drive...` 
      });
      
      // Invalidate the records cache to reflect new names eventually
      queryClient.invalidateQueries({ queryKey: ["qms-data"] });
      
      // Add a 2.5 second delay so Google Drive API has time to index the new names
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Clear selection and re-run audit to verify
      setSelectedFixes(new Set());
      await handleStartAudit();
    } catch (error: any) {
      toast({ title: "Fix Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsFixing(false);
    }
  };

  const toggleFixSelection = (id: string) => {
    const next = new Set(selectedFixes);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFixes(next);
  };

  const getPercentage = () => {
    if (progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const issuesCount = results ? results.filter(r => r.issues.length > 0).length : 0;
  const compliantCount = results ? results.filter(r => r.issues.length === 0).length : 0;
  
  // Exclude empty sequences from broken sequence count or count them separately
  const brokenSequenceCount = results ? results.filter(r => r.sequenceStatus === 'broken').length : 0;
  const invalidLinksCount = results ? results.filter(r => r.templateStatus === 'invalid' || r.folderStatus === 'invalid').length : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isRunning && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
        <div className="p-6 border-b border-border bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="w-5 h-5 text-primary" />
              Automated System Audit
            </DialogTitle>
            <DialogDescription>
              Validate template links, record folders, and verify sequential serial numbers across all {records.length} registered QMS documents.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col relative min-h-0">
          {!isRunning && !results && (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <PlayCircle className="w-10 h-10 text-primary" />
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold">Ready to Start Audit</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  This process will individually check every template file and folder in Google Drive. It will fetch all records to ensure there are no missing files in your serial sequences (e.g. F/XX-001, 002, 004). This might take 1-3 minutes depending on your internet connection and API limits.
                </p>
              </div>
              <Button onClick={handleStartAudit} className="h-12 px-8 text-base bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <PlayCircle className="w-5 h-5" /> Start Automated Audit
              </Button>
            </div>
          )}

          {isRunning && (
            <div className="flex-1 p-12 flex flex-col items-center justify-center text-center space-y-8">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                  {getPercentage()}%
                </div>
              </div>
              
              <div className="w-full max-w-md space-y-3">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-muted-foreground">Scanning Google Drive...</span>
                  <span className="font-mono text-primary">{progress.currentCode}</span>
                </div>
                <div className="h-3 bg-muted/50 rounded-full overflow-hidden w-full border border-border">
                  <div 
                    className="h-full bg-primary transition-all duration-300 rounded-full"
                    style={{ width: `${getPercentage()}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Processed {progress.current} of {progress.total} forms
                </p>
              </div>
            </div>
          )}

          {results && (
            <div className="flex-1 flex flex-col min-h-0 bg-muted/10">
              <div className="p-6 grid grid-cols-5 gap-3 bg-card border-b border-border">
                <div className="p-3 rounded-xl border border-border bg-background flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-heading">{compliantCount}</h4>
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Compliant</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <FileX className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-heading">{results ? results.filter(r => r.templateStatus !== 'valid').length : 0}</h4>
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Link Issues</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-heading">{results ? results.filter(r => r.folderStatus === 'wrong_name').length : 0}</h4>
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Name Issues</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-heading">{results ? results.filter(r => r.templateStatus === 'duplicate' || r.folderStatus === 'duplicate').length : 0}</h4>
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Duplicates</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl border border-border bg-background flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold font-heading">{brokenSequenceCount}</h4>
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Seq Gaps</p>
                  </div>
                </div>
              </div>

              <ScrollArea className="flex-1 h-full p-6">
                <div className="space-y-4">
                  {results.filter(r => r.issues.length > 0).length === 0 ? (
                    <div className="text-center p-12 bg-background rounded-xl border border-border">
                      <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                      <h3 className="text-xl font-bold">Audit Completed Successfully</h3>
                      <p className="text-muted-foreground mt-2">All Phase 1 (Links/Names) and Phase 2 (Sequences) are fully intact.</p>
                    </div>
                  ) : (
                    results.filter(r => r.issues.length > 0).map(result => {
                      const originalRecord = records.find(r => r.code === result.recordCode);
                      const isAlreadyLogged = originalRecord?.auditStatus === "Rejected";
                      
                      return (
                      <div key={result.recordCode} className="p-5 rounded-xl border border-border bg-card shadow-sm space-y-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-mono font-bold bg-muted border border-border px-2 py-1 rounded">{result.recordCode}</span>
                             <h4 className="font-bold text-foreground truncate">{result.recordName}</h4>
                             {isAlreadyLogged && (
                                <Badge variant="secondary" className="ml-2 h-5 text-[9px] bg-muted/80 text-muted-foreground border-transparent">
                                  ✅ Logged in Dashboard
                                </Badge>
                             )}
                          </div>
                          <div className="flex gap-1">
                              {result.templateStatus !== 'valid' && <Badge variant="destructive" className="h-4 text-[7px]">PHASE 1: LINK</Badge>}
                              {result.folderStatus === 'wrong_name' && <Badge variant="secondary" className="h-4 text-[7px] bg-orange-100 text-orange-700 border-orange-200">PHASE 1: NAME</Badge>}
                              {result.sequenceStatus === 'broken' && <Badge variant="outline" className="h-4 text-[7px] border-orange-500 text-orange-600">PHASE 2: SEQ</Badge>}
                          </div>
                        </div>
                        
                        <ul className="space-y-2 pl-2">
                          {result.issues.map((issue, idx) => {
                            const isWarning = issue.startsWith("Warning:");
                            const isMissingSeq = issue.includes("Missing records in sequence");
                            
                            return (
                              <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                                {isWarning ? (
                                  <AlertTriangle className="w-4 h-4 mt-0.5 text-warning shrink-0" />
                                ) : isMissingSeq ? (
                                  <div className="w-4 h-4 mt-0.5 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                                    <span className="text-[8px] font-bold text-orange-600">SEQ</span>
                                  </div>
                                ) : (
                                  <AlertCircle className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                                )}
                                <div className="flex-1">
                                    <span>{issue}</span>
                                    {result.suggestedFixes?.find(f => issue.includes(f.currentName)) && (
                                        <div className="mt-2 p-2 bg-background border border-border rounded flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedFixes.has(result.suggestedFixes.find(f => issue.includes(f.currentName))!.id)}
                                                    onChange={() => toggleFixSelection(result.suggestedFixes!.find(f => issue.includes(f.currentName))!.id)}
                                                    className="w-4 h-4 accent-primary"
                                                />
                                                <div className="text-xs">
                                                    <span className="text-muted-foreground line-through block italic">{result.suggestedFixes.find(f => issue.includes(f.currentName))?.currentName}</span>
                                                    <span className="text-primary font-bold block mt-1">➜ {result.suggestedFixes.find(f => issue.includes(f.currentName))?.suggestedName}</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] h-4">SUGGESTED NAME</Badge>
                                        </div>
                                    )}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                   })
                  )}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-muted/20 flex justify-between items-center">
          <div className="text-[10px] text-muted-foreground max-w-sm">
            {results && results.filter(r => r.suggestedStatus === 'rejected').length > 0 && (
                <p>Found manual discrepancies. Clicking "Apply" will mark these forms as having issues in your main dashboard.</p>
            )}
          </div>
          <div className="flex gap-2">
            {selectedFixes.size > 0 && (
                <Button 
                    variant="default" 
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                    onClick={handleFixNames}
                    disabled={isFixing}
                >
                    {isFixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Fix Selected ({selectedFixes.size})
                </Button>
            )}
            {results && results.length > 0 && (results.some(r => r.suggestedStatus === 'rejected') || results.some(r => {
                const original = records.find(rec => rec.code === r.recordCode);
                const reviews = original?.fileReviews as any;
                return reviews?.recordStatus === 'rejected' && r.suggestedStatus === 'approved';
            })) && (
                <Button 
                    variant="default" 
                    className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    onClick={handleApplyResults}
                    disabled={isApplying || isFixing}
                >
                    {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Apply Audit Results
                </Button>
            )}
            {results && results.length > 0 && (
                <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => {
                        setResults(null);
                        handleStartAudit();
                    }}
                    disabled={isRunning || isApplying}
                >
                    <PlayCircle className="w-4 h-4" />
                    Re-run Audit
                </Button>
            )}
            <Button variant="outline" onClick={onClose} disabled={isRunning || isApplying}>
                Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
