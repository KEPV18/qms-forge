// ============================================================================
// CAPA Evidence Dashboard — ISO 9001:2015 Clause 10.2
// Displays evidence items for a CAPA with review workflow and closure gate.
// CAPA-001 FIX: Closure requires pending === 0 AND rejected === 0 AND total > 0.
// ============================================================================

import { useState, useMemo } from "react";
import {
  calculateEvidenceStats,
  type CAPAEvidence,
  type EvidenceStatus,
  type EvidenceType,
} from "@/lib/capaRegisterService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCheck2,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldAlert,
} from "lucide-react";

interface CAPAEvidenceDashboardProps {
  capaId: string;
  onCanCloseChange?: (canClose: boolean) => void;
  evidence: CAPAEvidence[];
  onAddEvidence: (input: { capaId: string; type: EvidenceType; description: string }) => void;
  onReviewEvidence: (evidenceId: string, updates: { status: EvidenceStatus; reviewerComment: string }) => void;
}

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  document: "Document",
  photo: "Photo",
  measurement: "Measurement",
  test_result: "Test Result",
  other: "Other",
};

const STATUS_CONFIG: Record<EvidenceStatus, { label: string; icon: React.ReactNode; color: string }> = {
  pending: {
    label: "Pending",
    icon: <Clock className="w-4 h-4" />,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  },
  approved: {
    label: "Approved",
    icon: <CheckCircle className="w-4 h-4" />,
    color: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  rejected: {
    label: "Rejected",
    icon: <XCircle className="w-4 h-4" />,
    color: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

export function CAPAEvidenceDashboard({
  capaId,
  onCanCloseChange,
  evidence,
  onAddEvidence,
  onReviewEvidence,
}: CAPAEvidenceDashboardProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newType, setNewType] = useState<EvidenceType>("document");
  const [newDescription, setNewDescription] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewStatus, setReviewStatus] = useState<EvidenceStatus>("approved");

  const stats = useMemo(() => calculateEvidenceStats(evidence), [evidence]);

  // Notify parent when canClose changes
  useMemo(() => {
    onCanCloseChange?.(stats.canClose);
    return stats.canClose;
  }, [stats.canClose, onCanCloseChange]);

  const handleAdd = () => {
    if (!newDescription.trim()) return;
    onAddEvidence({ capaId, type: newType, description: newDescription });
    setNewDescription("");
    setNewType("document");
    setIsAddOpen(false);
  };

  const handleReview = (evidenceId: string) => {
    onReviewEvidence(evidenceId, { status: reviewStatus, reviewerComment: reviewComment });
    setReviewingId(null);
    setReviewComment("");
    setReviewStatus("approved");
  };

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-indigo-400" />
            CAPA Evidence
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Closure gate indicator */}
            {!stats.canClose && stats.total > 0 && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 gap-1">
                <ShieldAlert className="w-3 h-3" />
                Closure Blocked
              </Badge>
            )}
            {stats.canClose && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 gap-1">
                <CheckCircle className="w-3 h-3" />
                Ready to Close
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => setIsAddOpen(!isAddOpen)}>
              <Plus className="w-3 h-3 mr-1" />
              Add Evidence
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 text-sm text-muted-foreground mt-2">
          <span>Total: <strong className="text-foreground">{stats.total}</strong></span>
          <span>Pending: <strong className="text-yellow-400">{stats.pending}</strong></span>
          <span>Approved: <strong className="text-green-400">{stats.approved}</strong></span>
          <span>Rejected: <strong className="text-red-400">{stats.rejected}</strong></span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add evidence form */}
        {isAddOpen && (
          <div className="flex gap-3 items-end p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={newType} onValueChange={(v) => setNewType(v as EvidenceType)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVIDENCE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-[3] space-y-1">
              <Label className="text-xs">Description</Label>
              <Input
                className="h-8 text-sm"
                placeholder="Describe the evidence..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <Button size="sm" onClick={handleAdd} disabled={!newDescription.trim()}>
              Add
            </Button>
          </div>
        )}

        {/* Rejected evidence warning — CAPA-001 FIX */}
        {stats.rejected > 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-red-500/5 border border-red-500/20 text-red-400 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              <strong>{stats.rejected}</strong> rejected evidence item{stats.rejected > 1 ? "s" : ""} must be
              rectified or replaced before this CAPA can be closed.
            </span>
          </div>
        )}

        {/* Evidence table */}
        {evidence.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">
            No evidence items yet. Add evidence to support CAPA closure.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[180px]">Reviewed</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evidence.map((item) => {
                const statusCfg = STATUS_CONFIG[item.status];
                const isReviewing = reviewingId === item.id;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {EVIDENCE_TYPE_LABELS[item.type as EvidenceType] || item.type}
                    </TableCell>
                    <TableCell className="text-sm">{item.description}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${statusCfg.color}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.reviewedBy && (
                        <>
                          {item.reviewedBy}
                          <br />
                          {item.reviewedAt
                            ? new Date(item.reviewedAt).toLocaleDateString()
                            : ""}
                        </>
                      )}
                      {item.reviewerComment && (
                        <div className="mt-1 italic">{item.reviewerComment}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.status === "pending" && !isReviewing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setReviewingId(item.id)}
                        >
                          Review
                        </Button>
                      )}
                      {isReviewing && (
                        <div className="space-y-1">
                          <Select
                            value={reviewStatus}
                            onValueChange={(v) => setReviewStatus(v as EvidenceStatus)}
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="approved">Approve</SelectItem>
                              <SelectItem value="rejected">Reject</SelectItem>
                            </SelectContent>
                          </Select>
                          <Textarea
                            className="h-14 text-xs"
                            placeholder="Review comment..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                          />
                          <div className="flex gap-1">
                            <Button size="sm" className="h-6 text-xs" onClick={() => handleReview(item.id)}>
                              Submit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setReviewingId(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}