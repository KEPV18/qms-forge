// ============================================================================
// QMS Forge — Project Detail Page (Supabase-connected)
// Shows all records for a specific project.
// ============================================================================

import { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { useRecords } from "@/hooks/useRecordStorage";
import { FORM_SCHEMAS } from "@/data/formSchemas";
import { StateScreen } from "@/components/ui/StateScreen";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Briefcase, FileText, Layers, ChevronRight, FilePlus,
} from "lucide-react";
import { isoToDisplay } from "@/schemas";

export default function ProjectDetailPage() {
  const { projectName } = useParams<{ projectName: string }>();
  const navigate = useNavigate();
  const { data: records, isLoading, error } = useRecords();

  const decodedName = projectName ? decodeURIComponent(projectName) : "";

  // Filter records belonging to this project
  const projectRecords = useMemo(() => {
    if (!records || !decodedName) return [];
    return records.filter(r => {
      const fd = (r.formData as Record<string, unknown>) || {};
      const projName = (fd.project_name || fd.client_name) as string;
      return projName === decodedName;
    }).sort((a, b) => (b._createdAt as string || '').localeCompare(a._createdAt as string || ''));
  }, [records, decodedName]);

  // Group by form code
  const groupedRecords = useMemo(() => {
    const groups: Record<string, typeof projectRecords> = {};
    projectRecords.forEach(r => {
      const code = r.formCode as string;
      if (!groups[code]) groups[code] = [];
      groups[code].push(r);
    });
    return groups;
  }, [projectRecords]);

  if (isLoading) return <StateScreen state="loading" title="Loading project…" />;
  if (error) return <StateScreen state="error" title="Failed to load" message={error.message} />;

  return (
    <AppShell breadcrumbs={[
      { label: "Dashboard", path: "/" },
      { label: "Projects", path: "/projects" },
      { label: decodedName },
    ]}>
      <PageHeader
        icon={Briefcase}
        title={decodedName}
        description={`${projectRecords.length} records across ${Object.keys(groupedRecords).length} forms`}
        actions={
          <Button size="sm" onClick={() => navigate('/create')}>
            <FilePlus className="w-4 h-4 mr-1" /> Add Record
          </Button>
        }
      />

      {projectRecords.length === 0 ? (
        <Card className="border-border/30">
          <CardContent className="p-8 text-center">
            <Layers className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No records found for this project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4 mt-4">
          {Object.entries(groupedRecords).sort(([a], [b]) => a.localeCompare(b)).map(([formCode, recs]) => {
            const schema = FORM_SCHEMAS.find(s => s.code === formCode);
            return (
              <Card key={formCode} className="border-border/30">
                <CardContent className="p-0">
                  <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">{schema?.name || formCode}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{recs.length} records</Badge>
                  </div>
                  <div className="divide-y divide-border/20">
                    {recs.map(r => (
                      <div
                        key={r.serial as string}
                        className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/records/${encodeURIComponent(r.serial as string)}`)}
                      >
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-mono font-medium">{r.serial as string}</span>
                        <span className="text-xs text-muted-foreground flex-1">
                          Created {isoToDisplay(r._createdAt as string || '')}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}