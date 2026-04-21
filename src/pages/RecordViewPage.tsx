// ============================================================================
// QMS Forge — Record View Page
// Read-only by default. Controlled editing with Edit Intent Check.
// Identity fields (serial, _createdAt, formCode) are ALWAYS read-only.
// NOW uses real Google Sheets data via useRecord() and useUpdateRecord().
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, AlertTriangle, Shield, Clock, User,
  FileText, CheckCircle, Lock, Loader2, RefreshCw, History,
} from 'lucide-react';
import { getFormSchema } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import { DynamicFormRenderer, type RecordData } from '../components/forms/DynamicFormRenderer';
import { useRecord, useUpdateRecord } from '../hooks/useRecordStorage';
import { useAuditLog } from '../hooks/useAuditLog';
import { getEditRiskLevel } from '../data/mockRecords';

// ============================================================================
// Identity fields — READ-ONLY always, even in edit mode
// ============================================================================

const IDENTITY_FIELDS = new Set(['serial', '_createdAt', '_createdBy', 'formCode', 'formName']);

// ============================================================================
// Critical fields — require Edit Intent Check (modification reason)
// ============================================================================

const CRITICAL_FIELDS = new Set([
  'date', 'status', 'nc_type', 'closure_date',
  'project_name', 'employee_name', 'employee_id',
  'performance', 'overall_score', 'month', 'year',
]);

// ============================================================================
// Record View Page
// ============================================================================

const RecordViewPage: React.FC = () => {
  const { serial } = useParams<{ serial: string }>();
  const decodedSerial = serial ? decodeURIComponent(serial) : '';
  const navigate = useNavigate();

  // ✅ Real data from Google Sheets
  const { data: originalRecord, isLoading, error, refetch } = useRecord(decodedSerial);
  const updateMutation = useUpdateRecord();

  const schema = originalRecord ? getFormSchema(originalRecord.formCode as string) : null;

  // State
  const [mode, setMode] = useState<'view' | 'edit' | 'intent' | 'history'>('view');
  const [editData, setEditData] = useState<RecordData>({});
  const [modificationReason, setModificationReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Audit log
  const { data: auditEntries, isLoading: auditLoading } = useAuditLog(
    mode === 'history' ? decodedSerial : null
  );

  // ─── Derived state (MUST be before any early returns — Rules of Hooks) ─
  const riskLevel = originalRecord ? getEditRiskLevel(originalRecord as any) : 'none';
  const hasChangedFields = useMemo(() => {
    if (mode !== 'edit' || !editData || !originalRecord) return false;
    return Object.keys(editData).some(key => {
      if (IDENTITY_FIELDS.has(key)) return false;
      const oldVal = String((originalRecord as Record<string, unknown>)[key] ?? '');
      const newVal = String(editData[key] ?? '');
      return oldVal !== newVal;
    });
  }, [editData, originalRecord, mode]);

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
        <p className="text-slate-400">Loading record {decodedSerial}...</p>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl text-slate-300 mb-2">Failed to Load Record</h2>
        <p className="text-slate-500 mb-4">{(error as Error).message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ─── No record found ───────────────────────────────────────────────────
  if (!originalRecord || !schema) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl text-slate-300 mb-2">Record Not Found</h2>
        <p className="text-slate-500 mb-4">No record with serial <code className="text-indigo-400">{decodedSerial}</code></p>
        <button
          onClick={() => navigate('/records')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 mx-auto"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Records
        </button>
      </div>
    );
  }

  // ─── Edit flow ──────────────────────────────────────────────────────────

  const handleStartEdit = () => {
    // Copy current data (without system metadata)
    const data: RecordData = {};
    schema.fields.forEach(field => {
      if (field.type === 'heading') return;
      const key = field.key as string;
      data[key] = (originalRecord as Record<string, unknown>)[key] ?? field.defaultValue ?? '';
    });
    setEditData(data);
    setErrors({});
    setModificationReason('');
    setMode('edit');
  };

  const handleFormSubmit = (data: RecordData) => {
    // Store the latest form data from DynamicFormRenderer
    setEditData(data);

    // If critical fields changed, show intent check before saving
    const criticalChanged = Object.keys(data).some(key => {
      if (!CRITICAL_FIELDS.has(key)) return false;
      const oldVal = String((originalRecord as Record<string, unknown>)[key] ?? '');
      const newVal = String(data[key] ?? '');
      return oldVal !== newVal;
    });

    if (criticalChanged && !modificationReason.trim()) {
      setMode('intent');
      return;
    }

    // Proceed with save (data already Zod-validated by DynamicFormRenderer)
    doSave(data);
  };

  const handleIntentProceed = () => {
    if (modificationReason.trim().length < 5) return;
    setMode('edit');
    doSave(editData);
  };

  const handleIntentCancel = () => {
    setModificationReason('');
    setMode('edit');
  };

  const doSave = (data: RecordData) => {
    if (!schema) return;

    // Include the _editCount from when the user started editing (optimistic locking)
    const dataWithVersion = {
      ...data,
      _editCount: originalRecord._editCount,
    };

    // Submit to Google Sheets via mutation
    updateMutation.mutate(
      {
        serial: originalRecord.serial as string,
        changes: dataWithVersion,
        reason: modificationReason || undefined,
      },
      {
        onSuccess: (result) => {
          if (result.success) {
            setMode('view');
            setModificationReason('');
            setErrors({});
            // Refetch to get latest data from Sheets
            refetch();
          } else {
            // Show conflict/error
            if (result.conflict) {
              setErrors({ _conflict: result.error || 'Concurrent modification detected. Please reload.' });
            } else {
              setErrors({ _save: result.error || 'Failed to save record.' });
            }
          }
        },
        onError: (err: Error) => {
          setErrors({ _save: err.message });
        },
      }
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────
  const isSaving = updateMutation.isPending;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/records')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="w-4 h-4" /> Records
        </button>

        <div className="flex items-center gap-2">
          {mode === 'view' && (
            <button
              onClick={handleStartEdit}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <Edit3 className="w-4 h-4" /> Edit
            </button>
          )}
          {mode === 'edit' && (
            <>
              <button
                onClick={() => { setMode('view'); setErrors({}); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2 text-sm"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              {hasChangedFields && (
                <span className="px-2 py-1 text-xs bg-amber-500/10 text-amber-400 rounded">
                  Unsaved changes
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {/* System metadata — always read-only */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-medium text-slate-400">System Metadata</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500">Serial</span>
            <p className="font-mono text-indigo-400 font-semibold">{originalRecord.serial as string}</p>
          </div>
          <div>
            <span className="text-slate-500">Form</span>
            <p className="text-slate-300">{originalRecord.formCode as string}</p>
          </div>
          <div>
            <span className="text-slate-500">Created</span>
            <p className="text-slate-300">{isoToDisplay(originalRecord._createdAt as string)}</p>
          </div>
          <div>
            <span className="text-slate-500">By</span>
            <p className="text-slate-300 truncate">{originalRecord._createdBy as string}</p>
          </div>
          {(originalRecord._lastModifiedAt || originalRecord._editCount > 0) && (
            <>
              <div>
                <span className="text-slate-500">Last Modified</span>
                <p className="text-slate-300">
                  {originalRecord._lastModifiedAt
                    ? isoToDisplay(originalRecord._lastModifiedAt as string)
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">By</span>
                <p className="text-slate-300 truncate">
                  {(originalRecord._lastModifiedBy as string) || '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 flex items-center gap-1">
                  Edits
                  {riskLevel !== 'none' && <AlertTriangle className="w-3 h-3" />}
                </span>
                <p className={`font-semibold ${
                  riskLevel === 'high' ? 'text-red-400' :
                  riskLevel === 'medium' ? 'text-amber-400' :
                  'text-slate-300'
                }`}>
                  {originalRecord._editCount as number}
                </p>
              </div>
              {originalRecord._modificationReason && (
                <div className="col-span-2">
                  <span className="text-slate-500">Last Reason</span>
                  <p className="text-slate-300 text-xs truncate">{originalRecord._modificationReason as string}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Risk warning */}
        {riskLevel === 'high' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Frequently modified ({originalRecord._editCount as number} edits). Verify data integrity.</span>
          </div>
        )}
        {riskLevel === 'medium' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This record has been edited {originalRecord._editCount as number} time(s).</span>
          </div>
        )}

        {/* View History button */}
        {mode !== 'history' && (
          <button
            onClick={() => { setMode('history'); setErrors({}); }}
            className="mt-3 flex items-center gap-2 px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
          >
            <History className="w-4 h-4" />
            <span>View History ({originalRecord._editCount as number} edits)</span>
          </button>
        )}
      </div>

      {/* Record data — DynamicFormRenderer handles both view and edit */}
      {mode === 'view' ? (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
          <DynamicFormRenderer
            formCode={originalRecord.formCode as string}
            initialData={originalRecord as unknown as RecordData}
            onSubmit={() => {}}
            readOnly={true}
          />
        </div>
      ) : mode === 'history' ? (
        /* ─── Audit History View ──────────────────────────────────────── */
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-slate-100">Change History</h3>
              <span className="text-xs text-slate-500 ml-2">{decodedSerial}</span>
            </div>
            <button
              onClick={() => setMode('view')}
              className="px-3 py-1 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
            >
              Back to Record
            </button>
          </div>

          {auditLoading ? (
            <div className="flex items-center gap-2 py-8 justify-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading history...</span>
            </div>
          ) : !auditEntries || auditEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No history entries found for this record.</p>
              <p className="text-xs mt-1">Audit logging was added in v0.7-alpha. Older edits may not appear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditEntries.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`border rounded-lg p-4 ${
                    entry.action === 'create'
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-indigo-500/5 border-indigo-500/20'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {entry.action === 'create' ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <Edit3 className="w-4 h-4 text-indigo-400" />
                      )}
                      <span className={`text-sm font-medium ${
                        entry.action === 'create' ? 'text-green-400' : 'text-indigo-400'
                      }`}>
                        {entry.action === 'create' ? 'Created' : 'Updated'}
                      </span>
                      <span className="text-xs text-slate-500">#{idx + 1}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {entry.timestamp ? isoToDisplay(entry.timestamp.substring(0, 10)) + ' ' + entry.timestamp.substring(11, 19) : '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {entry.user || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Changed fields */}
                  {entry.action === 'create' ? (
                    <p className="text-xs text-slate-400">
                      Initial record created with {entry.changedFields.length} field{entry.changedFields.length !== 1 ? 's' : ''}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {entry.changedFields.map(field => (
                        <div key={field} className="flex items-start gap-2 text-xs">
                          <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded font-mono shrink-0">
                            {field}
                          </span>
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-red-400/70 line-through truncate">
                              {JSON.stringify(entry.previousValues[field] ?? '')}
                            </span>
                            <span className="text-slate-600">→</span>
                            <span className="text-green-400 truncate">
                              {JSON.stringify(entry.newValues[field] ?? '')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : mode === 'intent' ? (
        /* Edit Intent Check modal */
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 rounded-xl border border-amber-500/30 p-6 max-w-lg w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-semibold text-slate-100">Edit Intent Check</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              You are modifying critical fields on <span className="font-mono text-indigo-400">{originalRecord.serial as string}</span>.
              Please provide a reason for this change.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Reason for modification <span className="text-red-400">*</span>
              </label>
              <textarea
                value={modificationReason}
                onChange={e => setModificationReason(e.target.value)}
                placeholder="e.g. Correcting project name to match official records"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none resize-none"
                rows={3}
              />
              {modificationReason.trim().length > 0 && modificationReason.trim().length < 5 && (
                <p className="text-xs text-red-400 mt-1">Minimum 5 characters required</p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleIntentCancel}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleIntentProceed}
                disabled={modificationReason.trim().length < 5 || isSaving}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 text-sm flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save with Reason
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Edit form */
        <>
          {errors._conflict && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <strong>Conflict:</strong> {errors._conflict}
              <button onClick={() => { setErrors({}); refetch(); }} className="ml-3 underline text-red-300">Reload record</button>
            </div>
          )}
          {errors._save && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              <strong>Error:</strong> {errors._save}
            </div>
          )}
          <DynamicFormRenderer
            formCode={originalRecord.formCode as string}
            initialData={editData}
            onSubmit={handleFormSubmit}
            editMode={true}
          />
        </>
      )}
    </div>
  );
};

export default RecordViewPage;