import { QMSRecord, normalizeCategory } from "@/lib/googleSheets";
import { AlertCircle, CalendarClock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PendingActionsProps {
    records: QMSRecord[];
    isLoading?: boolean;
}

export function PendingActions({ records, isLoading = false }: PendingActionsProps) {
    const navigate = useNavigate();
    // Filter for overdue records
    const overdueRecords = records.filter(r => r.isOverdue);
    // Upcoming within next 5 days (not overdue)
    const upcomingRecords = records.filter(r =>
        !r.isOverdue &&
        typeof r.daysUntilNextFill === "number" &&
        r.daysUntilNextFill > 0 &&
        r.daysUntilNextFill <= 5
    );

    if (isLoading) return null; // Let skeleton loaders in other components handle visual loading state

    if (overdueRecords.length === 0 && upcomingRecords.length === 0) return null; // Don't show if nothing pending

    return (
        <div className="bg-card border border-border rounded-lg p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-foreground" />
                <h3 className="font-semibold text-foreground">Pending Actions</h3>
            </div>

            {overdueRecords.length > 0 && (
                <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-destructive">Overdue</span>
                        <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                            {overdueRecords.length}
                        </span>
                    </div>
                    {overdueRecords.slice(0, 5).map(record => (
                        <div key={record.rowIndex} className="flex items-center justify-between bg-background p-3 rounded-md border border-border shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-destructive/10 rounded-full shrink-0">
                                    <CalendarClock className="w-4 h-4 text-destructive" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-foreground">{record.recordName}</h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{record.code}</span>
                                        <span>•</span>
                                        <span>Due: {record.fillFrequency}</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0 h-8 gap-1"
                                onClick={() => {
                                    const mod = normalizeCategory(record.category);
                                    if (mod?.id) navigate(`/module/${mod.id}`);
                                }}
                            >
                                Open
                                <ArrowRight className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                    {overdueRecords.length > 5 && (
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            + {overdueRecords.length - 5} more overdue items
                        </p>
                    )}
                </div>
            )}

            {upcomingRecords.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-warning">Upcoming (≤ 5 days)</span>
                        <span className="bg-muted text-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                            {upcomingRecords.length}
                        </span>
                    </div>
                    {upcomingRecords.slice(0, 5).map(record => (
                        <div key={record.rowIndex} className="flex items-center justify-between bg-background p-3 rounded-md border border-border shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-muted rounded-full shrink-0">
                                    <CalendarClock className="w-4 h-4 text-foreground" />
                                </div>
                                <div>
                                    <h4 className="font-medium text-sm text-foreground">{record.recordName}</h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{record.code}</span>
                                        <span>•</span>
                                        <span>In {record.daysUntilNextFill} days</span>
                                    </div>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="shrink-0 h-8 gap-1"
                                onClick={() => {
                                    const mod = normalizeCategory(record.category);
                                    if (mod?.id) navigate(`/module/${mod.id}`);
                                }}
                            >
                                Open
                                <ArrowRight className="w-3 h-3" />
                            </Button>
                        </div>
                    ))}
                    {upcomingRecords.length > 5 && (
                        <p className="text-center text-xs text-muted-foreground mt-2">
                            + {upcomingRecords.length - 5} more upcoming items
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
