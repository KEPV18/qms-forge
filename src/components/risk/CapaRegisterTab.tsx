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

export interface CapaItem {
    id: string;
    type: string;
    description: string;
    reference: string;
    rootCause: string;
    correctiveAction: string;
    preventiveAction: string;
    responsible: string;
    targetDate: string;
    status: "Open" | "In Progress" | "Closed" | "Verified";
    effectivenessCheck: string;
    effectivenessDate: string;
    closureApproval: string;
    relatedRisk: string;
}

const initialData: CapaItem[] = [];

export function CapaRegisterTab() {
    const [capas, setCapas] = useState<CapaItem[]>(initialData);
    const [editingCapa, setEditingCapa] = useState<CapaItem | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);

    const handleEditClick = (capa: CapaItem) => {
        setEditingCapa({ ...capa });
        setIsEditOpen(true);
    };

    const handleSave = () => {
        if (!editingCapa) return;
        setCapas(prev => prev.map(c => c.id === editingCapa.id ? editingCapa : c));
        setIsEditOpen(false);
        setEditingCapa(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center p-6 rounded-2xl bg-muted/20 border-border/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full blur-2xl" />
                <div className="relative z-10">
                    <h3 className="font-bold text-xl font-heading text-foreground">CAPA Register</h3>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] opacity-60">Track Corrective and Preventive Actions.</p>
                </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-card overflow-hidden shadow-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/30 border-b border-border/50">
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[100px]">Reference</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Type</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 max-w-[250px]">Description & Root Cause</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 max-w-[200px]">Actions (CA/PA)</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Responsible</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Target Date</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Status</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4">Effectiveness</TableHead>
                            <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-4 w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {capas.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-20 text-muted-foreground">
                                    <div className="flex flex-col items-center gap-4 opacity-40">
                                        <Plus className="w-12 h-12 stroke-[1px]" />
                                        <p className="text-sm font-medium">No CAPA records found. Awaiting identification of non-conformities.</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            capas.map((capa) => (
                                <TableRow key={capa.id} className="hover:bg-primary/5 transition-colors border-b border-border/10">
                                    <TableCell className="font-bold font-heading">{capa.reference}</TableCell>
                                    <TableCell className="text-sm font-medium">{capa.type}</TableCell>
                                    <TableCell>
                                        <div className="text-sm font-bold">{capa.description}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5 opacity-60">RC: {capa.rootCause}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-xs text-muted-foreground"><span className="font-bold text-foreground">CA:</span> {capa.correctiveAction}</div>
                                        <div className="text-xs text-muted-foreground mt-1"><span className="font-bold text-foreground">PA:</span> {capa.preventiveAction}</div>
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">{capa.responsible}</TableCell>
                                    <TableCell className="text-xs font-bold text-muted-foreground">{capa.targetDate}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-bold uppercase tracking-wider text-[9px]">{capa.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-[10px] font-medium text-muted-foreground">{capa.effectivenessCheck}</TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary transition-colors" onClick={() => handleEditClick(capa)}>
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto glass-card border-border/50">
                    <DialogHeader>
                        <DialogTitle className="font-heading font-bold text-2xl">Edit CAPA {editingCapa?.id}</DialogTitle>
                    </DialogHeader>
                    {editingCapa && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">ID</Label>
                                    <Input value={editingCapa.id} disabled className="bg-muted/30" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Reference</Label>
                                    <Input
                                        value={editingCapa.reference}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, reference: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</Label>
                                    <Input
                                        value={editingCapa.type}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, type: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description of Issue</Label>
                                <Textarea
                                    value={editingCapa.description}
                                    onChange={(e) => setEditingCapa({ ...editingCapa, description: e.target.value })}
                                    className="rounded-xl min-h-[80px]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Root Cause Analysis</Label>
                                <Textarea
                                    value={editingCapa.rootCause}
                                    onChange={(e) => setEditingCapa({ ...editingCapa, rootCause: e.target.value })}
                                    className="rounded-xl min-h-[60px]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Corrective Action</Label>
                                    <Textarea
                                        value={editingCapa.correctiveAction}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, correctiveAction: e.target.value })}
                                        className="rounded-xl min-h-[60px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Preventive Action</Label>
                                    <Textarea
                                        value={editingCapa.preventiveAction}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, preventiveAction: e.target.value })}
                                        className="rounded-xl min-h-[60px]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Responsible</Label>
                                    <Input
                                        value={editingCapa.responsible}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, responsible: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Date</Label>
                                    <Input
                                        value={editingCapa.targetDate}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, targetDate: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</Label>
                                    <Select
                                        value={editingCapa.status}
                                        onValueChange={(val: any) => setEditingCapa({ ...editingCapa, status: val })}
                                    >
                                        <SelectTrigger className="rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Open">Open</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Verified">Verified</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Effectiveness Check</Label>
                                    <Input
                                        value={editingCapa.effectivenessCheck}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, effectivenessCheck: e.target.value })}
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Effectiveness Date</Label>
                                    <Input
                                        value={editingCapa.effectivenessDate}
                                        onChange={(e) => setEditingCapa({ ...editingCapa, effectivenessDate: e.target.value })}
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
