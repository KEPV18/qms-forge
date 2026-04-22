import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS, getFormSections } from "@/data/formSchemas";
import { MODULE_CONFIG, type ModuleConfig } from "@/config/modules";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText, FilePlus, Database, AlertTriangle, CheckCircle,
  ChevronRight, ArrowRight, BarChart3, Shield, Clock,
} from "lucide-react";

function getModuleById(id: string): ModuleConfig | undefined {
  return Object.values(MODULE_CONFIG).find(m => m.id === id);
}

export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { data: records } = useRecords();
  const mod = moduleId ? getModuleById(moduleId) : undefined;

  const sectionForms = useMemo(() => {
    if (!mod) return [];
    return FORM_SCHEMAS.filter(f => f.section === mod.section);
  }, [mod]);

  const sectionRecords = useMemo(() => {
    if (!records || !mod) return [];
    const formCodes = new Set(sectionForms.map(f => f.code));
    return records.filter(r => formCodes.has(r.formCode as string));
  }, [records, mod, sectionForms]);

  const formCodesWithRecords = useMemo(() => {
    const codes = new Set(sectionRecords.map(r => r.formCode as string));
    return codes;
  }, [sectionRecords]);

  const gapForms = sectionForms.filter(f => !formCodesWithRecords.has(f.code));
  const completeness = sectionForms.length > 0
    ? Math.round(((sectionForms.length - gapForms.length) / sectionForms.length) * 100)
    : 0;

  if (!mod) {
    return (
      <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Module Not Found" }]}>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="w-12 h-12 text-muted-foreground/40 mb-4" />
          <h2 className="text-xl text-foreground mb-2">Module Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">No module with ID "{moduleId}"</p>
          <Button onClick={() => navigate("/")} variant="outline">Back to Dashboard</Button>
        </div>
      </AppShell>
    );
  }

  const breadcrumbs = [
    { label: "Dashboard", path: "/" },
    { label: mod.name },
  ];

  const recentRecords = [...sectionRecords]
    .sort((a, b) => ((b._createdAt as string) || '').localeCompare((a._createdAt as string) || ''))
    .slice(0, 5);

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center border", mod.moduleClass, "bg-primary/10 border-primary/20")}>
            <mod.icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">{mod.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{mod.description}</p>
            <Badge variant="outline" className="mt-2 text-[10px] font-mono">{mod.isoClause}</Badge>
          </div>
          <Button onClick={() => navigate(`/create?section=${mod.section}`)} className="gap-2">
            <FilePlus className="w-4 h-4" /> Create Record
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-primary/15 bg-primary/5">
            <CardContent className="p-4 flex items-center gap-3">
              <Database className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{sectionRecords.length}</p>
                <p className="text-xs text-muted-foreground">Records</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-indigo-500/15 bg-indigo-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-2xl font-bold">{sectionForms.length}</p>
                <p className="text-xs text-muted-foreground">Forms</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border", gapForms.length > 0 ? "border-amber-500/15 bg-amber-500/5" : "border-emerald-500/15 bg-emerald-500/5")}>
            <CardContent className="p-4 flex items-center gap-3">
              {gapForms.length > 0
                ? <AlertTriangle className="w-5 h-5 text-amber-400" />
                : <CheckCircle className="w-5 h-5 text-emerald-400" />}
              <div>
                <p className="text-2xl font-bold">{gapForms.length}</p>
                <p className="text-xs text-muted-foreground">Empty Forms</p>
              </div>
            </CardContent>
          </Card>
          <Card className={cn("border", completeness >= 80 ? "border-emerald-500/15 bg-emerald-500/5" : completeness >= 50 ? "border-amber-500/15 bg-amber-500/5" : "border-red-500/15 bg-red-500/5")}>
            <CardContent className="p-4 flex items-center gap-3">
              <BarChart3 className={cn("w-5 h-5", completeness >= 80 ? "text-emerald-400" : completeness >= 50 ? "text-amber-400" : "text-red-400")} />
              <div>
                <p className="text-2xl font-bold">{completeness}%</p>
                <p className="text-xs text-muted-foreground">Complete</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {gapForms.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">{gapForms.length} forms have zero records</p>
                <p className="text-xs text-amber-300/70">Required for ISO 9001 compliance under {mod.isoClause}.</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10" onClick={() => navigate(`/create?section=${mod.section}`)}>
                <FilePlus className="w-4 h-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>
        )}

        <SectionHeader icon={FileText} label="Forms in This Section" description={`${sectionForms.length} forms · ${sectionForms.length - gapForms.length} populated`} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sectionForms.map(form => {
            const formRecordCount = sectionRecords.filter(r => r.formCode === form.code).length;
            const hasRecords = formRecordCount > 0;

            return (
              <Card
                key={form.code}
                className={cn(
                  "cursor-pointer hover:border-primary/30 transition-all group",
                  !hasRecords && "border-amber-500/15"
                )}
                onClick={() => navigate(`/records?formCode=${form.code}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-primary">{form.code}</span>
                    <Badge variant="outline" className={cn(
                      "text-[10px]",
                      form.importance === "Critical" ? "border-red-500/30 text-red-400" :
                      form.importance === "High" ? "border-amber-500/30 text-amber-400" :
                      "border-border text-muted-foreground"
                    )}>
                      {form.importance}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{form.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{form.description}</p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30">
                    <span className="text-[10px] text-muted-foreground/60">{form.frequency}</span>
                    <div className="flex items-center gap-1.5">
                      {hasRecords ? (
                        <span className="text-xs text-muted-foreground">{formRecordCount} record{formRecordCount !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Empty
                        </span>
                      )}
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {recentRecords.length > 0 && (
          <>
            <SectionHeader icon={Clock} label="Recent Records" />
            <div className="space-y-2">
              {recentRecords.map(r => (
                <Card
                  key={r.serial as string}
                  className="cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => navigate(`/records/${encodeURIComponent(r.serial as string)}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-mono font-medium">{r.serial as string}</span>
                      <span className="text-xs text-muted-foreground ml-2">{r.formName as string}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.formCode as string}</Badge>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => navigate(`/records?section=${mod.section}`)} className="gap-2">
                View All Records <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate(`/records?section=${mod.section}`)} className="gap-2">
            <Database className="w-4 h-4" /> All Records
          </Button>
          <Button variant="outline" onClick={() => navigate(`/create?section=${mod.section}`)} className="gap-2">
            <FilePlus className="w-4 h-4" /> Create Record
          </Button>
          <Button variant="outline" onClick={() => navigate("/audit")} className="gap-2">
            <Shield className="w-4 h-4" /> Audit Dashboard
          </Button>
          <Button variant="outline" onClick={() => navigate("/integrity")} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Integrity
          </Button>
        </div>
      </div>
    </AppShell>
  );
}