// ============================================================================
// QMS Forge — Projects Page (Supabase-connected)
// Extracts unique project names from record formData.
// ============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { StateScreen } from "@/components/ui/StateScreen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, FileText, Layers, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectInfo {
  name: string;
  recordCount: number;
  formCodes: Set<string>;
  latestRecord: string;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useRecords();

  const projects = useMemo(() => {
    if (!records) return [];
    const map = new Map<string, ProjectInfo>();

    records.forEach(r => {
      const fd = (r.formData as Record<string, unknown>) || {};
      const name = (fd.project_name || fd.client_name) as string;
      if (!name) return;

      const existing = map.get(name);
      if (existing) {
        existing.recordCount++;
        existing.formCodes.add(r.formCode as string);
        if ((r._createdAt as string || '') > existing.latestRecord) {
          existing.latestRecord = r._createdAt as string || '';
        }
      } else {
        map.set(name, {
          name,
          recordCount: 1,
          formCodes: new Set([r.formCode as string]),
          latestRecord: r._createdAt as string || '',
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.recordCount - a.recordCount);
  }, [records]);

  if (isLoading) return <StateScreen state="loading" title="Loading projects…" />;
  if (error) return <StateScreen state="error" title="Failed to load" message={error.message} />;

  return (
    <AppShell breadcrumbs={[{ label: "Dashboard", path: "/" }, { label: "Projects" }]}>
      <PageHeader icon={Briefcase} title="Projects" description={`${projects.length} projects from QMS records`} />

      {projects.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="p-8 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No projects found in records.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Projects appear when records have project_name or client_name fields.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {projects.map(proj => (
            <Card
              key={proj.name}
              className="cursor-pointer hover:border-primary/30 transition-all group"
              onClick={() => navigate(`/project/${encodeURIComponent(proj.name)}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <h3 className="text-sm font-semibold truncate">{proj.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        <FileText className="w-3 h-3 mr-1" /> {proj.recordCount} records
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        <Layers className="w-3 h-3 mr-1" /> {proj.formCodes.size} forms
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}