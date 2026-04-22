import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StateScreen } from "@/components/ui/StateScreen";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { MODULE_CONFIG } from "@/config/modules";
import {
  FileText, AlertTriangle, CheckCircle, Database,
  Layers, TrendingUp, Clock, Shield, FilePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ─── Dashboard page — Supabase-connected ────────────────────────── */
export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useRecords();

  // Compute stats from real Supabase records
  const stats = useMemo(() => {
    const totalRecords = records?.length ?? 0;
    const totalForms = FORM_SCHEMAS.length; // 35 forms from schema registry

    // Records per section
    const sectionCounts: Record<number, number> = {};
    FORM_SCHEMAS.forEach(s => { sectionCounts[s.section] = 0; });
    records?.forEach(r => {
      const schema = FORM_SCHEMAS.find(s => s.code === r.formCode);
      if (schema) sectionCounts[schema.section] = (sectionCounts[schema.section] || 0) + 1;
    });

    // Forms with zero records (gap detection)
    const formCodes = new Set(records?.map(r => r.formCode) || []);
    const unpopulatedForms = FORM_SCHEMAS.filter(s => !formCodes.has(s.code));
    const gaps = unpopulatedForms.length;

    // Project count from record data
    const projects = new Set<string>();
    records?.forEach(r => {
      const fd = (r.formData as Record<string, unknown>) || {};
      const name = fd.project_name || fd.client_name;
      if (name && typeof name === 'string') projects.add(name);
    });

    // Recent records (last 5)
    const recentRecords = (records || [])
      .sort((a, b) => (b._createdAt as string || '').localeCompare(a._createdAt as string || ''))
      .slice(0, 5);

    return { totalRecords, totalForms, sectionCounts, gaps, projects: projects.size, recentRecords, unpopulatedForms };
  }, [records]);

  if (isLoading) return <StateScreen state="loading" title="Loading dashboard…" />;
  if (error) return <StateScreen state="error" title="Failed to load data" message={error.message} action={{ label: "Retry", onClick: () => window.location.reload() }} />;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="space-y-6">
        {/* Stats overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Database} label="Total Records" value={stats.totalRecords} color="cyan" />
          <StatCard icon={Layers} label="Active Forms" value={stats.totalForms} color="indigo" />
          <StatCard icon={AlertTriangle} label="Form Gaps" value={stats.gaps} color={stats.gaps > 10 ? "amber" : "emerald"} />
          <StatCard icon={FileText} label="Projects" value={stats.projects} color="violet" />
        </div>

        {/* Gaps alert */}
        {stats.gaps > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-200">{stats.gaps} forms have zero records</p>
                <p className="text-xs text-amber-300/70">These forms need at least one record for audit compliance.</p>
              </div>
              <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10" onClick={() => navigate('/create')}>
                <FilePlus className="w-4 h-4 mr-1" /> Create
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Module sections with real record counts */}
        <SectionHeader icon={Layers} label="QMS Modules" description={`${FORM_SCHEMAS.length} forms across 7 ISO 9001 sections`} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Object.values(MODULE_CONFIG).map(mod => {
            const count = stats.sectionCounts[mod.section] || 0;
            const formsInSection = FORM_SCHEMAS.filter(s => s.section === mod.section);
            const gapCount = formsInSection.filter(s => !records?.some(r => r.formCode === s.code)).length;

            return (
              <Card
                key={mod.id}
                className={cn("cursor-pointer hover:border-primary/30 transition-all group", mod.moduleClass)}
                onClick={() => navigate(`/module/${mod.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <mod.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{mod.name}</p>
                      <p className="text-xs text-muted-foreground">{mod.isoClause}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-foreground">{count}</p>
                      <p className="text-[9px] text-muted-foreground uppercase">records</p>
                    </div>
                  </div>
                  {gapCount > 0 && (
                    <div className="mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-amber-300">{gapCount} of {formsInSection.length} forms empty</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick actions */}
        <SectionHeader icon={TrendingUp} label="Quick Actions" />
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/create')} className="gap-2">
            <FilePlus className="w-4 h-4" /> Create Record
          </Button>
          <Button variant="outline" onClick={() => navigate('/records')} className="gap-2">
            <Database className="w-4 h-4" /> View All Records
          </Button>
          <Button variant="outline" onClick={() => navigate('/forms')} className="gap-2">
            <Layers className="w-4 h-4" /> Forms Registry
          </Button>
          <Button variant="outline" onClick={() => navigate('/integrity')} className="gap-2">
            <Shield className="w-4 h-4" /> Data Integrity
          </Button>
        </div>

        {/* Recent records */}
        {stats.recentRecords.length > 0 && (
          <>
            <SectionHeader icon={Clock} label="Recent Records" />
            <div className="space-y-2">
              {stats.recentRecords.map(r => (
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    indigo: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    violet: "border-violet-500/20 bg-violet-500/5 text-violet-400",
  };
  return (
    <Card className={cn("border", colorClasses[color] || colorClasses.cyan)}>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="w-5 h-5" />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}