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
  FileText, CheckCircle, Lock, Loader2, RefreshCw,
} from 'lucide-react';
import { getFormSchema } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import { DynamicFormRenderer, type RecordData } from '../components/forms/DynamicFormRenderer';
import { useRecord, useUpdateRecord } from '../hooks/useRecordStorage';
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
  const [mode, setMode] = useState<'view' | 'edit' | 'intent'>('view');
  const [editData, setEditData] = useState<RecordData>({});
  const [modificationReason, setModificationReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

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
              <button onClick={() => refetch()} className="ml-3 underline text-red-300">Reload record</button>
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