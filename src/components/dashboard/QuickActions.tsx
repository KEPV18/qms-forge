import { useNavigate } from "react-router-dom";
import { Plus, ClipboardCheck, AlertTriangle, Upload, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { addRisk } from "@/lib/riskRegisterService";
import { addCAPA } from "@/lib/capaRegisterService";
import { useQMSData, useAuditSummary } from "@/hooks/useQMSData";
import { searchProjectDrive, DriveSearchResult } from "@/lib/driveService";
import { uploadFileToDrive, createDriveFolder } from "@/lib/driveService";
import { batchUpdateReviewedBy } from "@/lib/googleSheets";
import { cn } from "@/lib/utils";

const quickActionItems = [
  { id: "risk", label: "New Risk", icon: Plus, color: "bg-primary/10 text-primary hover:bg-primary/15 border-primary/15" },
  { id: "audit", label: "Start Audit", icon: ClipboardCheck, color: "bg-success/10 text-success hover:bg-success/15 border-success/15" },
  { id: "capa", label: "Log CAPA", icon: AlertTriangle, color: "bg-warning/10 text-warning hover:bg-warning/15 border-warning/15" },
  { id: "upload", label: "Upload File", icon: Upload, color: "bg-info/10 text-info hover:bg-info/15 border-info/15" },
];

export function QuickActions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: records } = useQMSData();
  const auditSummary = useAuditSummary(records);

  const [riskOpen, setRiskOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [capaOpen, setCapaOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [riskForm, setRiskForm] = useState({
    processDepartment: "",
    riskDescription: "",
    cause: "",
    likelihood: "3",
    impact: "3",
    actionControl: "",
    owner: "",
  });

  const [capaForm, setCapaForm] = useState({
    sourceOfCAPA: "",
    type: "Corrective",
    description: "",
    reference: "",
    rootCauseAnalysis: "",
    correctiveAction: "",
    preventiveAction: "",
    responsiblePerson: "",
    targetCompletionDate: "",
    relatedRisk: "",
  });

  const [uploadTarget, setUploadTarget] = useState<{ folderLink: string; newFolderName: string }>({
    folderLink: "",
    newFolderName: "",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [folderSearchTerm, setFolderSearchTerm] = useState("");
  const [folderResults, setFolderResults] = useState<DriveSearchResult[]>([]);
  const [isSearchingFolders, setIsSearchingFolders] = useState(false);

  const zeroRecordForms = useMemo(() => {
    if (!records) return [];
    return records.filter(r => (r.actualRecordCount || 0) === 0);
  }, [records]);

  const overdueForms = useMemo(() => {
    if (!records) return [];
    return records.filter(r => r.isOverdue);
  }, [records]);

  const nearDueForms = useMemo(() => {
    if (!records) return [];
    return records.filter(r => !r.isOverdue && (r.daysUntilNextFill || 0) <= 7);
  }, [records]);

  const complianceDisplay = Math.max(
    0,
    Math.min(100, auditSummary.complianceRate || 0)
  );

  const handleSearchFolders = async () => {
    if (!folderSearchTerm || folderSearchTerm.length < 2) {
      setFolderResults([]);
      return;
    }
    setIsSearchingFolders(true);
    try {
      const results = await searchProjectDrive(folderSearchTerm);
      const folders = results.filter(r => r.mimeType === "application/vnd.google-apps.folder");
      setFolderResults(folders);
    } catch {
      setFolderResults([]);
    } finally {
      setIsSearchingFolders(false);
    }
  };

  const submitRisk = async () => {
    try {
      await addRisk({
        processDepartment: riskForm.processDepartment,
        riskDescription: riskForm.riskDescription,
        cause: riskForm.cause,
        likelihood: parseInt(riskForm.likelihood, 10),
        impact: parseInt(riskForm.impact, 10),
        actionControl: riskForm.actionControl,
        owner: riskForm.owner,
      });
      toast({ title: "تم إضافة الخطر", description: "تم تسجيل الخطر في Risk Register" });
      setRiskOpen(false);
      navigate("/risk-management");
    } catch (e: any) {
      toast({ title: "فشل إضافة الخطر", description: e.message || "خطأ غير متوقع", variant: "destructive" });
    }
  };

  const submitCAPA = async () => {
    try {
      await addCAPA({
        sourceOfCAPA: capaForm.sourceOfCAPA,
        type: capaForm.type as any,
        description: capaForm.description,
        reference: capaForm.reference,
        rootCauseAnalysis: capaForm.rootCauseAnalysis,
        correctiveAction: capaForm.correctiveAction,
        preventiveAction: capaForm.preventiveAction,
        responsiblePerson: capaForm.responsiblePerson,
        targetCompletionDate: capaForm.targetCompletionDate,
        relatedRisk: capaForm.relatedRisk,
      });
      toast({ title: "تم تسجيل CAPA", description: "تم إضافة الإجراء في CAPA Register" });
      setCapaOpen(false);
      navigate("/risk-management");
    } catch (e: any) {
      toast({ title: "فشل تسجيل CAPA", description: e.message || "خطأ غير متوقع", variant: "destructive" });
    }
  };

  const submitUpload = async () => {
    try {
      let targetFolderLink = uploadTarget.folderLink;
      if (!targetFolderLink && uploadTarget.newFolderName) {
        const created = await createDriveFolder(uploadTarget.newFolderName);
        targetFolderLink = `https://drive.google.com/folders/${created.id}`;
      }
      if (!uploadFile || !targetFolderLink) {
        toast({ title: "بيانات غير مكتملة", description: "يرجى اختيار ملف ومجلد", variant: "destructive" });
        return;
      }
      const uploaded = await uploadFileToDrive(uploadFile, targetFolderLink);
      if (uploaded) {
        toast({ title: "تم الرفع", description: uploaded.name });
        setUploadOpen(false);
        navigate("/archive");
      } else {
        toast({ title: "فشل الرفع", description: "لم يتم رفع الملف", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "فشل الرفع", description: e.message || "خطأ غير متوقع", variant: "destructive" });
    }
  };
  const [isUpdatingReviewer, setIsUpdatingReviewer] = useState(false);

  const handleBatchReviewer = async () => {
    if (!records || records.length === 0) return;
    setIsUpdatingReviewer(true);
    try {
      await batchUpdateReviewedBy(records, "Ahmed khaled");
      toast({ title: "تم التحديث", description: "تم تعيين Ahmed khaled كمراجع لجميع السجلات" });
    } catch (e: any) {
      toast({ title: "فشل التحديث", description: e.message, variant: "destructive" });
    } finally {
      setIsUpdatingReviewer(false);
    }
  };

  const actionHandlers: Record<string, () => void> = {
    risk: () => setRiskOpen(true),
    audit: () => setAuditOpen(true),
    capa: () => setCapaOpen(true),
    upload: () => setUploadOpen(true),
  };

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-bold text-foreground">Quick Actions</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">Common operations</p>
      </div>
      <div className="p-4 grid grid-cols-2 gap-2">
        {quickActionItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={actionHandlers[item.id]}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02]",
                item.color
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
      <div className="px-4 pb-4">
        <button
          onClick={handleBatchReviewer}
          disabled={isUpdatingReviewer}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200 text-[11px] font-semibold"
        >
          <UserCheck className="w-4 h-4" />
          <span>{isUpdatingReviewer ? "جاري التحديث..." : "Set Reviewer: Ahmed khaled"}</span>
        </button>
      </div>

      {/* Dialogs - same as before */}
      <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Risk</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Department / Process</Label>
              <Input value={riskForm.processDepartment} onChange={(e) => setRiskForm({ ...riskForm, processDepartment: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Risk Description</Label>
              <Input value={riskForm.riskDescription} onChange={(e) => setRiskForm({ ...riskForm, riskDescription: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cause</Label>
              <Input value={riskForm.cause} onChange={(e) => setRiskForm({ ...riskForm, cause: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Likelihood (1-5)</Label>
                <Select value={riskForm.likelihood} onValueChange={(v) => setRiskForm({ ...riskForm, likelihood: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Impact (1-5)</Label>
                <Select value={riskForm.impact} onValueChange={(v) => setRiskForm({ ...riskForm, impact: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Control Actions</Label>
              <Input value={riskForm.actionControl} onChange={(e) => setRiskForm({ ...riskForm, actionControl: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input value={riskForm.owner} onChange={(e) => setRiskForm({ ...riskForm, owner: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitRisk}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-md border">
                <div className="text-sm text-muted-foreground">Form Templates</div>
                <div className="text-xl font-semibold">{auditSummary.total}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-sm text-muted-foreground">Filled Records</div>
                <div className="text-xl font-semibold">{records?.reduce((sum, r) => sum + (r.actualRecordCount || 0), 0) || 0}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-sm text-muted-foreground">Compliance</div>
                <div className="text-xl font-semibold">{complianceDisplay}%</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-sm text-muted-foreground">Never Filled</div>
                <div className="text-xl font-semibold">{zeroRecordForms.length}</div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">Templates Without Records</div>
              <div className="space-y-2 max-h-40 overflow-auto">
                {zeroRecordForms.map(f => (
                  <div key={f.code} className="flex justify-between items-center p-2 rounded border">
                    <div className="text-sm">{f.code} — {f.recordName}</div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/record/${encodeURIComponent(f.code)}`)}>View</Button>
                  </div>
                ))}
                {zeroRecordForms.length === 0 && <div className="text-sm text-muted-foreground">None</div>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="font-medium mb-2">Overdue</div>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {overdueForms.map(f => (
                    <div key={f.code} className="flex justify-between items-center p-2 rounded border">
                      <div className="text-sm">{f.code} — {f.recordName}</div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/record/${encodeURIComponent(f.code)}`)}>View</Button>
                    </div>
                  ))}
                  {overdueForms.length === 0 && <div className="text-sm text-muted-foreground">None</div>}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Near Due</div>
                <div className="space-y-2 max-h-32 overflow-auto">
                  {nearDueForms.map(f => (
                    <div key={f.code} className="flex justify-between items-center p-2 rounded border">
                      <div className="text-sm">{f.code} — {f.recordName}</div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/record/${encodeURIComponent(f.code)}`)}>View</Button>
                    </div>
                  ))}
                  {nearDueForms.length === 0 && <div className="text-sm text-muted-foreground">None</div>}
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => navigate("/audit")}>Open Audit Page</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={capaOpen} onOpenChange={setCapaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log CAPA</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Source</Label>
              <Input value={capaForm.sourceOfCAPA} onChange={(e) => setCapaForm({ ...capaForm, sourceOfCAPA: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={capaForm.type} onValueChange={(v) => setCapaForm({ ...capaForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Corrective">Corrective</SelectItem>
                  <SelectItem value="Preventive">Preventive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={capaForm.description} onChange={(e) => setCapaForm({ ...capaForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={capaForm.reference} onChange={(e) => setCapaForm({ ...capaForm, reference: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Root Cause Analysis</Label>
              <Input value={capaForm.rootCauseAnalysis} onChange={(e) => setCapaForm({ ...capaForm, rootCauseAnalysis: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Corrective Action</Label>
                <Input value={capaForm.correctiveAction} onChange={(e) => setCapaForm({ ...capaForm, correctiveAction: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Preventive Action</Label>
                <Input value={capaForm.preventiveAction} onChange={(e) => setCapaForm({ ...capaForm, preventiveAction: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Responsible</Label>
                <Input value={capaForm.responsiblePerson} onChange={(e) => setCapaForm({ ...capaForm, responsiblePerson: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Target Completion Date</Label>
                <Input type="date" value={capaForm.targetCompletionDate} onChange={(e) => setCapaForm({ ...capaForm, targetCompletionDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Related Risk</Label>
              <Input value={capaForm.relatedRisk} onChange={(e) => setCapaForm({ ...capaForm, relatedRisk: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitCAPA}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Search for Folder</Label>
              <div className="flex gap-2">
                <Input placeholder="Search..." value={folderSearchTerm} onChange={e => setFolderSearchTerm(e.target.value)} />
                <Button variant="outline" onClick={handleSearchFolders} disabled={isSearchingFolders}>
                  {isSearchingFolders ? "..." : "Search"}
                </Button>
              </div>
              {folderResults.length > 0 && (
                <div className="border rounded-md max-h-32 overflow-auto">
                  {folderResults.map(f => (
                    <button key={f.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => {
                      setUploadTarget({ ...uploadTarget, folderLink: f.webViewLink });
                      setFolderSearchTerm(f.name);
                      setFolderResults([]);
                    }}>{f.name}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Or Create New Folder</Label>
              <Input placeholder="New folder name..." value={uploadTarget.newFolderName} onChange={e => setUploadTarget({ ...uploadTarget, newFolderName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Select File</Label>
              <Input type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
            </div>
            <div className="flex justify-end">
              <Button onClick={submitUpload}>Upload</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
