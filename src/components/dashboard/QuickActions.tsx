import { useNavigate } from "react-router-dom";
import { Plus, ClipboardCheck, AlertTriangle, Upload } from "lucide-react";
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

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="default"
          className="justify-start gap-2 h-auto py-3"
          onClick={() => setRiskOpen(true)}
        >
          <Plus className="w-4 h-4" />
          <span>New Risk / Process</span>
        </Button>

        <Button
          variant="outline"
          className="justify-start gap-2 h-auto py-3"
          onClick={() => setAuditOpen(true)}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>Start Audit</span>
        </Button>

        <Button
          variant="outline"
          className="justify-start gap-2 h-auto py-3"
          onClick={() => setCapaOpen(true)}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Log CAPA</span>
        </Button>

        <Button
          variant="outline"
          className="justify-start gap-2 h-auto py-3"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="w-4 h-4" />
          <span>Upload Document</span>
        </Button>
      </div>

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
              <Label>Search Folder</Label>
              <div className="flex gap-2">
                <Input placeholder="Type folder name" value={folderSearchTerm} onChange={(e) => setFolderSearchTerm(e.target.value)} />
                <Button variant="outline" onClick={handleSearchFolders}>{isSearchingFolders ? "..." : "Search"}</Button>
              </div>
              <div className="max-h-32 overflow-auto space-y-2">
                {folderResults.map(fr => (
                  <button
                    key={fr.id}
                    className="w-full text-left p-2 rounded border hover:bg-muted"
                    onClick={() => setUploadTarget({ ...uploadTarget, folderLink: `https://drive.google.com/folders/${fr.id}` })}
                  >
                    {fr.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Or create new folder</Label>
              <Input placeholder="New folder name" value={uploadTarget.newFolderName} onChange={(e) => setUploadTarget({ ...uploadTarget, newFolderName: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Choose file</Label>
              <Input type="file" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
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
