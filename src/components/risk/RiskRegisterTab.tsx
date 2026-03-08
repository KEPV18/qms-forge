import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RiskItem {
    id: string;
    department: string;
    description: string;
    cause: string;
    likelihood: number;
    impact: number;
    score: number;
    action: string;
    owner: string;
    status: "Open" | "Controlled" | "Closed";
    reviewDate: string;
    linkedCapa: string;
}

const initialData: RiskItem[] = [
    { id: "R-01", department: "Operations", description: "High workload due to sudden increase in task volume from clients", cause: "Delay in delivery and pressure on teams", likelihood: 3, impact: 3, score: 9, action: "Daily workload monitoring, team redistribution, priority handling", owner: "Operations Manager", status: "Controlled", reviewDate: "31/01/2026", linkedCapa: "N/A" },
    { id: "R-02", department: "Operations / SLA", description: "Failure to meet SLA timelines", cause: "High volume and time-sensitive tasks", likelihood: 3, impact: 4, score: 12, action: "Real-time monitoring, escalation to team leaders, dedicated SLA teams", owner: "Operations Lead", status: "Controlled", reviewDate: "31/01/2026", linkedCapa: "N/A" },
    { id: "R-03", department: "Quality", description: "Inconsistent quality output across agents", cause: "Different experience levels and skill gaps", likelihood: 3, impact: 3, score: 9, action: "QA sampling, clear guidelines, refresher training", owner: "Quality Lead", status: "Open", reviewDate: "31/01/2026", linkedCapa: "May require CAPA if repeated" },
    { id: "R-04", department: "Training", description: "New agents assigned before full training completion", cause: "Urgent operational demand", likelihood: 2, impact: 3, score: 6, action: "Mandatory training validation before task assignment", owner: "Training Lead", status: "Controlled", reviewDate: "31/01/2026", linkedCapa: "N/A" },
    { id: "R-05", department: "Resources / HR", description: "Agent turnover impacting productivity", cause: "Attrition and workload pressure", likelihood: 3, impact: 3, score: 9, action: "Backup staffing, staggered onboarding, team leader support", owner: "HR / Operations", status: "Open", reviewDate: "31/01/2026", linkedCapa: "N/A" },
    { id: "R-06", department: "Data Security", description: "Mishandling of customer data", cause: "Human error or unauthorized access", likelihood: 2, impact: 5, score: 10, action: "NDA enforcement, access control, client-secured platforms", owner: "Management", status: "Controlled", reviewDate: "31/01/2026", linkedCapa: "N/A" },
];

export function RiskRegisterTab() {
    const [risks, setRisks] = useState<RiskItem[]>(initialData);
    const [editingRisk, setEditingRisk] = useState<RiskItem | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Controlled": return "default";
            case "Open": return "destructive";
            case "Closed": return "secondary";
            default: return "outline";
        }
    };

    const handleEditClick = (risk: RiskItem) => {
        setEditingRisk({ ...risk });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingRisk) return;

        const updatedRisk = {
            ...editingRisk,
            score: editingRisk.likelihood * editingRisk.impact
        };

        setRisks(prev => prev.map(r => r.id === updatedRisk.id ? updatedRisk : r));
        setIsEditOpen(false);
        setEditingRisk(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-6 rounded-2xl bg-muted/20 border-border/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl" />
                <div className="relative z-10">
                    <h3 className="font-bold text-xl font-heading text-foreground">Risk Register</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Identify, assess, and monitor potential risks.</p>
                </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[80px]">ID</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Dept</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 max-w-[200px]">Description</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 text-center">Score</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Action / Control</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Owner</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Linked CAPA</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {risks.map((risk) => (
                            <TableRow key={risk.id} className="hover:bg-primary/5 transition-colors border-b border-border/10">
                                <TableCell className="font-bold font-heading">{risk.id}</TableCell>
                                <TableCell className="text-sm font-medium">{risk.department}</TableCell>
                                <TableCell className="max-w-[200px]">
                                    <div className="font-bold text-sm truncate" title={risk.description}>{risk.description}</div>
                                    <div className="text-[10px] text-muted-foreground truncate opacity-60" title={risk.cause}>{risk.cause}</div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center">
                                        <Badge variant="outline" className="font-bold bg-background/50">{risk.score}</Badge>
                                        <span className="text-[9px] text-muted-foreground font-medium">({risk.likelihood}x{risk.impact})</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs truncate max-w-[150px] text-muted-foreground" title={risk.action}>{risk.action}</TableCell>
                                <TableCell className="text-xs font-medium">{risk.owner}</TableCell>
                                <TableCell>
                                    <Badge variant={getStatusColor(risk.status) as any} className="font-bold uppercase tracking-wider text-[9px]">{risk.status}</Badge>
                                </TableCell>
                                <TableCell className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{risk.linkedCapa}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary transition-colors" onClick={() => handleEditClick(risk)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="font-heading font-bold text-2xl">Edit Risk {editingRisk?.id}</DialogTitle>
                    </DialogHeader>
                    {editingRisk && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Risk ID</Label>
                                    <Input value={editingRisk.id} disabled className="bg-muted/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Department</Label>
                                    <Input
                                        value={editingRisk.department}
                                        onChange={(e) => setEditingRisk({ ...editingRisk, department: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</Label>
                                <Textarea
                                    value={editingRisk.description}
                                    onChange={(e) => setEditingRisk({ ...editingRisk, description: e.target.value })}
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cause</Label>
                                <Textarea
                                    value={editingRisk.cause}
                                    onChange={(e) => setEditingRisk({ ...editingRisk, cause: e.target.value })}
                                    className="rounded-xl min-h-[60px]"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Likelihood (1-5)</Label>
                                    <Input
                                        type="number"
                                        min="1" max="5"
                                        value={editingRisk.likelihood}
                                        onChange={(e) => setEditingRisk({ ...editingRisk, likelihood: parseInt(e.target.value) || 0 })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Impact (1-5)</Label>
                                    <Input
                                        type="number"
                                        min="1" max="5"
                                        value={editingRisk.impact}
                                        onChange={(e) => setEditingRisk({ ...editingRisk, impact: parseInt(e.target.value) || 0 })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Score</Label>
                                    <div className="flex h-10 w-full rounded-xl border border-input bg-muted/20 px-3 py-2 text-sm font-bold text-primary">
                                        {editingRisk.likelihood * editingRisk.impact}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Action / Control</Label>
                                <Textarea
                                    value={editingRisk.action}
                                    onChange={(e) => setEditingRisk({ ...editingRisk, action: e.target.value })}
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Owner</Label>
                                    <Input
                                        value={editingRisk.owner}
                                        onChange={(e) => setEditingRisk({ ...editingRisk, owner: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                                    <Select
                                        value={editingRisk.status}
                                        onValueChange={(val: any) => setEditingRisk({ ...editingRisk, status: val })}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="Controlled">Controlled</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Review Date</Label>
                                    <Input
                                        value={editingRisk.reviewDate}
                                        onChange={(e) => setEditingRisk({ ...editingRisk, reviewDate: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Linked CAPA</Label>
                                    <Input
                                        value={editingRisk.linkedCapa}
                                        onChange={(e) => setEditingRisk({ ...editingRisk, linkedCapa: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
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
