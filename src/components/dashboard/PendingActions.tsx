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
  const overdueRecords = records.filter(r => r.isOverdue);
  const upcomingRecords = records.filter(r => !r.isOverdue && typeof r.daysUntilNextFill === "number" && r.daysUntilNextFill > 0 && r.daysUntilNextFill <= 5);

  if (isLoading || (overdueRecords.length === 0 && upcomingRecords.length === 0)) return null;

  return (
    <div className="bg-card rounded-sm border border-border overflow-hidden accent-line-top">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-foreground" />
        <h3 className="text-sm font-bold text-foreground">Pending Actions</h3>
      </div>

      <div className="p-4 space-y-3">
        {overdueRecords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">Overdue</span>
              <span className="bg-destructive/10 text-destructive text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm">{overdueRecords.length}</span>
            </div>
            {overdueRecords.slice(0, 4).map(record => (
              <div key={record.rowIndex} className="flex items-center justify-between py-2 px-3 rounded-sm bg-destructive/5 border border-destructive/10">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarClock className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{record.recordName}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{record.code}</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={() => { const mod = normalizeCategory(record.category); if (mod?.id) navigate(`/module/${mod.id}`); }}>
                  Open <ArrowRight className="w-2.5 h-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {upcomingRecords.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-warning uppercase tracking-wider">Due Soon</span>
              <span className="bg-warning/10 text-warning text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm">{upcomingRecords.length}</span>
            </div>
            {upcomingRecords.slice(0, 4).map(record => (
              <div key={record.rowIndex} className="flex items-center justify-between py-2 px-3 rounded-sm bg-muted/30 border border-border/50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <CalendarClock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{record.recordName}</p>
                    <p className="text-[9px] text-muted-foreground font-mono">{record.daysUntilNextFill}d left</p>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1 px-2" onClick={() => { const mod = normalizeCategory(record.category); if (mod?.id) navigate(`/module/${mod.id}`); }}>
                  Open <ArrowRight className="w-2.5 h-2.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
