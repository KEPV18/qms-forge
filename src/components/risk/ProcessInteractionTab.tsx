import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Pencil } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ProcessItem {
    id: string;
    name: string;
    owner: string;
    inputs: string;
    activities: string;
    outputs: string;
    receiver: string;
    kpi: string;
}

const initialData: ProcessItem[] = [
    { id: "P-01", name: "Sales & Customer Service", owner: "Sales/CS Manager", inputs: "Customer Requirements", activities: "1. Receive customer request\n2. Review specs & confirm order\n3. Issue order confirmation", outputs: "F/08 - Order Form\nF/50 - Customer Property Register", receiver: "Operations", kpi: "• Order acceptance rate\n• Response time" },
    { id: "P-02", name: "Design & Development (R&D)", owner: "R&D Head", inputs: "1. F/32 - R&D Request\n2. Market needs", activities: "1. Research & design\n2. Conduct experiments\n3. Verify design", outputs: "F/32 - R&D Request\nF/34 - Design Verification\nF/35 - Design Monitoring\nF/37 - Experiment Data", receiver: "Operations\nQuality", kpi: "• Project success rate\n• Schedule adherence" },
    { id: "P-03", name: "Planning & Production", owner: "Operations Manager", inputs: "1. F/08 - Order\n2. F/34 - Design Specs", activities: "1. Plan resources\n2. Execute project\n3. Monitor progress", outputs: "F/11 - Production Plan\nF/19 - Product Description", receiver: "Quality Control\nCustomer", kpi: "• % Plan vs Actual\n• Rework rate" },
    { id: "P-04", name: "Quality Control & Inspection", owner: "QA Lead", inputs: "1. Production samples\n2. F/17 - Test Request", activities: "1. Conduct quality tests\n2. Identify non-conformities\n3. Issue results", outputs: "F/17 - QA Test Request\nF/12 - Non-Conforming Products", receiver: "Operations\nManagement", kpi: "• Non-conformity rate\n• Defect detection" },
    { id: "P-05", name: "Procurement Management", owner: "Procurement Officer", inputs: "Purchase requisitions", activities: "1. Evaluate suppliers\n2. Issue POs\n3. Inspect goods", outputs: "F/13 - Purchase Order\nF/15 - Approved Vendor List\nF/14 - Incoming Inspection", receiver: "Requesting Dept\nFinance", kpi: "• Supplier performance\n• On-time delivery" },
    { id: "P-06", name: "Customer Complaint & Improvement", owner: "CS/QA Manager", inputs: "Customer complaint", activities: "1. Log complaint\n2. Analyze root cause\n3. Implement corrective action\n4. Close complaint", outputs: "F/09 - Complaint Report\nF/22 - Corrective Action", receiver: "Management\nRelevant Dept", kpi: "• Resolution time\n• Customer satisfaction" },
    { id: "P-07", name: "Internal Audit", owner: "Management Representative", inputs: "1. F/25 - Audit Plan\n2. ISO Standard\n3. F/47 - Checklist", activities: "1. Plan & conduct audit\n2. Record findings\n3. Issue report & follow up", outputs: "F/25 - Audit Plan\nF/47 - Audit Checklist\nF/48 - Audit Report\nF/22 - CAR (if NC)", receiver: "Top Management\nAudited Depts", kpi: "• Audit plan completion\n• NC closure time" },
    { id: "P-08", name: "HR & Training Management", owner: "HR Manager", inputs: "1. Manpower needs\n2. Skills gaps (F/41)\n3. Training requests", activities: "1. Recruitment\n2. Performance appraisal\n3. Training delivery\n4. Update competence", outputs: "F/44 - Job Description\nF/30 - Appraisal\nF/28 - Training Attendance\nF/42 - Annual Program\nF/43 - Revision Log", receiver: "All Staff\nDept Heads", kpi: "• Training completion %\n• Training effectiveness" },
    { id: "P-09", name: "Management Review", owner: "Top Management", inputs: "1. Performance data\n2. F/48 - Audit reports\n3. F/10 - Customer feedback\n4. F/20 - Agenda", activities: "1. Review QMS performance\n2. Assess objectives\n3. Make decisions\n4. Document & follow up", outputs: "F/20 - Agenda\nF/21 - Minutes\nF/24 - Objectives (updated)", receiver: "All Departments", kpi: "• Meetings held as scheduled\n• Decision implementation" },
    { id: "P-10", name: "Document & Record Control", owner: "QMS Document Controller", inputs: "1. New/revised docs\n2. Completed records", activities: "1. Review & approve changes\n2. Distribute copies\n3. Archive & retain", outputs: "F/45 - Master List of Docs\nF/23 - Master List of Records\nF/43 - Revision Log", receiver: "All Departments", kpi: "• Accuracy of master lists\n• Document availability" },
    { id: "P-11", name: "Change Management", owner: "Mgmt Rep / Dept Head", inputs: "Change request", activities: "1. Assess impact\n2. Plan implementation\n3. Approve, implement & follow up", outputs: "F/46 - Change Management Plan", receiver: "Affected Depts\nManagement", kpi: "• Change effectiveness\n• Implementation on time" },
];

export function ProcessInteractionTab() {
    const [processes, setProcesses] = useState<ProcessItem[]>(initialData);
    const [editingProcess, setEditingProcess] = useState<ProcessItem | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleEditClick = (process: ProcessItem) => {
        setEditingProcess({ ...process });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingProcess) return;
        setProcesses(prev => prev.map(p => p.id === editingProcess.id ? editingProcess : p));
        setIsEditOpen(false);
        setEditingProcess(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-6 rounded-2xl bg-muted/20 border-border/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl" />
                <div className="relative z-10">
                    <h3 className="font-bold text-xl font-heading text-foreground">Process Interaction Sheet</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Map of key processes, inputs, outputs, and KPIs.</p>
                </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[180px]">Process Name</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Owner</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Inputs</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Activities</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Outputs (Records)</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Receiver</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">KPI</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processes.map((proc) => (
                            <TableRow key={proc.id} className="align-top hover:bg-primary/5 transition-colors border-b border-border/10">
                                <TableCell className="font-bold font-heading align-top text-sm">{proc.name}</TableCell>
                                <TableCell className="align-top text-xs font-medium">{proc.owner}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-relaxed">{proc.inputs}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-relaxed">{proc.activities}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-primary/80 font-mono leading-relaxed">{proc.outputs}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top text-muted-foreground leading-relaxed">{proc.receiver}</TableCell>
                                <TableCell className="whitespace-pre-wrap text-[11px] align-top font-bold text-foreground/70 leading-relaxed italic">{proc.kpi}</TableCell>
                                <TableCell className="align-top">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary transition-colors" onClick={() => handleEditClick(proc)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto glass-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="font-heading font-bold text-2xl">Edit Process {editingProcess?.id}</DialogTitle>
                    </DialogHeader>
                    {editingProcess && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Process ID</Label>
                                    <Input value={editingProcess.id} disabled className="bg-muted/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Process Name</Label>
                                    <Input
                                        value={editingProcess.name}
                                        onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Owner</Label>
                                <Input
                                    value={editingProcess.owner}
                                    onChange={(e) => setEditingProcess({ ...editingProcess, owner: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Inputs</Label>
                                    <Textarea
                                        value={editingProcess.inputs}
                                        onChange={(e) => setEditingProcess({ ...editingProcess, inputs: e.target.value })}
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Activities</Label>
                                    <Textarea
                                        value={editingProcess.activities}
                                        onChange={(e) => setEditingProcess({ ...editingProcess, activities: e.target.value })}
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Outputs (Records)</Label>
                                    <Textarea
                                        value={editingProcess.outputs}
                                        onChange={(e) => setEditingProcess({ ...editingProcess, outputs: e.target.value })}
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Receiver</Label>
                                    <Textarea
                                        value={editingProcess.receiver}
                                        onChange={(e) => setEditingProcess({ ...editingProcess, receiver: e.target.value })}
                                        className="rounded-xl min-h-[100px]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">KPIs</Label>
                                <Textarea
                                    value={editingProcess.kpi}
                                    onChange={(e) => setEditingProcess({ ...editingProcess, kpi: e.target.value })}
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} className="rounded-xl font-bold bg-primary hover:bg-primary/90">Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
