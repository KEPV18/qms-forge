import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { QMSRecord } from "@/lib/googleSheets";
import { copyDriveFile } from "@/lib/driveService";
import { Loader2, FilePlus, ExternalLink, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AddRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    templates: QMSRecord[];
    onSuccess: () => void;
}

export function AddRecordModal({ isOpen, onClose, templates, onSuccess }: AddRecordModalProps) {
    const [selectedCode, setSelectedCode] = useState<string>("");
    const [isCreating, setIsCreating] = useState(false);
    const [createdFile, setCreatedFile] = useState<{ name: string; link: string } | null>(null);
    const { toast } = useToast();

    const selectedTemplate = templates.find(t => t.code === selectedCode);

    const calculateNextSerial = (template: QMSRecord) => {
        if (template.nextSerial) return template.nextSerial;

        // Fallback logic if nextSerial isn't in sheet
        const lastSerial = template.lastSerial || `${template.code}-000`;
        const match = lastSerial.match(/(\d+)$/);
        if (!match) return `${template.code}-001`;

        const num = parseInt(match[1]) + 1;
        return `${template.code}-${num.toString().padStart(3, '0')}`;
    };

    const handleCreate = async () => {
        if (!selectedTemplate) return;

        setIsCreating(true);
        try {
            const nextSerial = calculateNextSerial(selectedTemplate);
            const newName = nextSerial;

            const result = await copyDriveFile(
                selectedTemplate.templateLink,
                selectedTemplate.folderLink,
                newName
            );

            if (result) {
                setCreatedFile({ name: result.name, link: result.webViewLink });
                toast({
                    title: "Record Created Successfully",
                    description: `Generated ${newName}`,
                });
            }
        } catch (error: any) {
            toast({
                title: "Creation Failed",
                description: error.message || "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleReset = () => {
        setSelectedCode("");
        setCreatedFile(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleReset}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FilePlus className="w-5 h-5 text-sidebar-primary" />
                        Create New Record
                    </DialogTitle>
                </DialogHeader>

                {!createdFile ? (
                    <div className="space-y-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="template">Select Form Template</Label>
                            <Select value={selectedCode} onValueChange={setSelectedCode}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Choose a form..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {templates.map((t) => (
                                        <SelectItem key={t.code} value={t.code}>
                                            <span className="font-mono text-xs mr-2 text-sidebar-primary">{t.code}</span>
                                            {t.recordName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedTemplate && (
                            <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Target Folder</p>
                                        <p className="text-xs font-semibold truncate">Module Folder</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">Next Serial</p>
                                        <p className="text-xs font-bold text-sidebar-primary">{calculateNextSerial(selectedTemplate)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <h3 className="font-bold text-xl">System Ready</h3>
                        <p className="text-muted-foreground text-sm">
                            The record <span className="text-foreground font-semibold">{createdFile.name}</span> has been generated and is ready for data entry.
                        </p>
                        <Button
                            className="w-full gap-2"
                            onClick={() => {
                                window.open(createdFile.link, '_blank');
                                handleReset();
                                onSuccess();
                            }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            Open & Fill Record
                        </Button>
                    </div>
                )}

                {!createdFile && (
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={handleReset}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!selectedCode || isCreating}
                            className="gap-2"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <FilePlus className="w-4 h-4" />
                                    Generate Record
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
