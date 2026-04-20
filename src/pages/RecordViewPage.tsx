// ============================================================================
// QMS Forge — Record View Page
// Read-only by default. Controlled editing with Edit Intent Check.
// Identity fields (serial, _createdAt, formCode) are ALWAYS read-only.
// Tracks: _lastModifiedAt, _lastModifiedBy, _editCount, _modificationReason
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit3, Save, X, AlertTriangle, Shield, Clock, User,
  FileText, CheckCircle, Lock,
} from 'lucide-react';
import { MOCK_RECORDS, getEditRiskLevel, type QMSRecord } from '../data/mockRecords';
import { getFormSchema } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import { DynamicFormRenderer, type RecordData } from '../components/forms/DynamicFormRenderer';

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

  // Find the record
  const originalRecord = MOCK_RECORDS.find(r => r.serial === decodedSerial);
  const schema = originalRecord ? getFormSchema(originalRecord.formCode) : null;

  // State
  const [mode, setMode] = useState<'view' | 'edit' | 'intent'>('view');
  const [editData, setEditData] = useState<RecordData>({});
  const [modificationReason, setModificationReason] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── No record found ───────────────────────────────────────────────────
  if (!originalRecord || !schema) {
    return (
      <div className="text-center py-16">
        <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
        <h2 className="text-xl text-slate-300 mb-2">Record Not Found</h2>
        <p className="text-slate-500 mb-4">No record with serial <code className="text-indigo-400">{decodedSerial}</code></p>
        <button
          onClick={() => navigate('/records')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg"
        >
          Back to Records
        </button>
      </div>
    );
  }

  const risk = getEditRiskLevel(originalRecord);

  // ─── Detect if critical fields changed ────────────────────────────────────

  const hasCriticalChanges = useMemo(() => {
    if (mode === 'view') return false;
    return Object.keys(editData).some(key => {
      if (!CRITICAL_FIELDS.has(key)) return false;
      const oldVal = String(originalRecord[key as keyof QMSRecord] ?? '');
      const newVal = String(editData[key] ?? '');
      return oldVal !== newVal;
    });
  }, [editData, originalRecord, mode]);

  // ─── Edit flow ──────────────────────────────────────────────────────────

  const handleStartEdit = () => {
    // Copy current data (without system metadata)
    const data: RecordData = {};
    schema.fields.forEach(field => {
      if (field.type === 'heading') return;
      data[field.key] = originalRecord[field.key as keyof QMSRecord] ?? field.defaultValue ?? '';
    });
    setEditData(data);
    setErrors({});
    setModificationReason('');
    setMode('edit');
  };

  const handleFormSubmit = (data: RecordData) => {
    // Store the latest form data from DynamicFormRenderer
    // (DynamicFormRenderer already validated via Zod before calling onSubmit)
    setEditData(data);

    // If critical fields changed, show intent check before saving
    const criticalChanged = Object.keys(data).some(key => {
      if (!CRITICAL_FIELDS.has(key)) return false;
      const oldVal = String(originalRecord[key as keyof QMSRecord] ?? '');
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

    // Data is already Zod-validated by DynamicFormRenderer before onSubmit fires.
    // In production, this would write to Google Sheets + Drive
    console.log('[RecordView] Saving validated data:', {
      serial: originalRecord.serial,
      _editCount: originalRecord._editCount + 1,
      _lastModifiedAt: new Date().toISOString(),
      _lastModifiedBy: 'akh.dev185@gmail.com',
      _modificationReason: modificationReason || null,
      data,
    });

    // Reset to view mode
    setMode('view');
    setModificationReason('');
    setErrors({});
  };

  const handleCancelEdit = () => {
    setMode('view');
    setModificationReason('');
    setErrors({});
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/records')}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100 font-mono">{originalRecord.serial}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                risk === 'high' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                risk === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-slate-500/20 text-slate-400 border border-slate-500/30'
              }`}>
                {originalRecord.formName}
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              Created {isoToDisplay(originalRecord._createdAt.split('T')[0])} by {originalRecord._createdBy}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'view' && (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit Record
            </button>
          )}
          {mode === 'edit' && (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
              {/* Save button is in the DynamicFormRenderer */}
            </>
          )}
        </div>
      </div>

      {/* Integrity Warning — high edit count */}
      {originalRecord._editCount > 3 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-red-300 font-medium">Frequently Modified Record</p>
            <p className="text-xs text-red-400/80">
              This record has been edited {originalRecord._editCount} times. Last modification: {
                originalRecord._lastModifiedAt
                  ? isoToDisplay(originalRecord._lastModifiedAt.split('T')[0])
                  : 'Unknown'
              }
              {originalRecord._modificationReason && (
                <> — Reason: <em className="text-red-300">{originalRecord._modificationReason}</em></>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Edit count notice — low/medium */}
      {originalRecord._editCount > 0 && originalRecord._editCount <= 3 && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
          <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Modified {originalRecord._editCount} time{originalRecord._editCount !== 1 ? 's' : ''}
            {originalRecord._lastModifiedAt && (
              <> · Last: {isoToDisplay(originalRecord._lastModifiedAt.split('T')[0])}</>
            )}
          </p>
        </div>
      )}

      {/* Edit Intent Check Modal — appears when saving with critical field changes */}
      {mode === 'intent' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-amber-500/50 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-100">Edit Intent Check</h3>
                <p className="text-sm text-slate-400">Critical field modification detected</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-2">
              You modified one or more critical fields:
            </p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Object.keys(editData).filter(key => {
                if (!CRITICAL_FIELDS.has(key)) return false;
                const oldVal = String(originalRecord[key as keyof QMSRecord] ?? '');
                const newVal = String(editData[key] ?? '');
                return oldVal !== newVal;
              }).map(key => (
                <span key={key} className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs font-mono">
                  {key}
                </span>
              ))}
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Provide a reason for this change. This will be recorded in the audit trail.
            </p>
            <textarea
              value={modificationReason}
              onChange={e => setModificationReason(e.target.value)}
              placeholder="Reason for modification (min 5 characters)..."
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4 min-h-[80px]"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleIntentCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleIntentProceed}
                disabled={modificationReason.trim().length < 5}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                Save with Reason
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Metadata — always read-only */}
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Lock className="w-3 h-3" />
          System Metadata — Read Only
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Serial Number</p>
            <p className="text-sm font-mono text-indigo-400">{originalRecord.serial}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Form Type</p>
            <p className="text-sm text-slate-200">{originalRecord.formCode} — {originalRecord.formName}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Created</p>
            <p className="text-sm text-slate-200">{isoToDisplay(originalRecord._createdAt.split('T')[0])}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Created By</p>
            <p className="text-sm text-slate-200">{originalRecord._createdBy}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Edit Count</p>
            <p className={`text-sm font-medium ${
              originalRecord._editCount === 0 ? 'text-green-400' :
              originalRecord._editCount <= 3 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {originalRecord._editCount} edit{originalRecord._editCount !== 1 ? 's' : ''}
            </p>
          </div>
          {originalRecord._lastModifiedAt && (
            <>
              <div>
                <p className="text-xs text-slate-500">Last Modified</p>
                <p className="text-sm text-slate-200">{isoToDisplay(originalRecord._lastModifiedAt.split('T')[0])}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Modified By</p>
                <p className="text-sm text-slate-200">{originalRecord._lastModifiedBy}</p>
              </div>
            </>
          )}
          {originalRecord._modificationReason && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-xs text-slate-500">Last Modification Reason</p>
              <p className="text-sm text-slate-300 italic">"{originalRecord._modificationReason}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Form Data — View or Edit */}
      {mode === 'view' ? (
        // ── READ-ONLY VIEW ─────────────────────────────────────────────────
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Record Data
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schema.fields.map(field => {
              if (field.type === 'heading') {
                return (
                  <div key={field.key} className="col-span-2 mt-4 pt-3 border-t border-slate-700">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{field.label}</h4>
                  </div>
                );
              }

              const value = originalRecord[field.key as keyof QMSRecord];
              const isCritical = CRITICAL_FIELDS.has(field.key);

              return (
                <div key={field.key} className={field.width === 'full' ? 'md:col-span-2' : ''}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-slate-500">{field.label}</p>
                    {field.required && <span className="text-red-400 text-xs">*</span>}
                    {isCritical && <Shield className="w-3 h-3 text-amber-400" title="Critical field — requires reason to modify" />}
                  </div>
                  <div className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200">
                    {field.type === 'table' ? (
                      <span className="text-slate-400 italic">
                        {Array.isArray(value) ? `${(value as unknown[]).length} rows` : 'No data'}
                      </span>
                    ) : field.type === 'checkbox' ? (
                      <span className={value ? 'text-green-400' : 'text-red-400'}>
                        {value ? '✓ Yes' : '✗ No'}
                      </span>
                    ) : field.type === 'date' ? (
                      isoToDisplay(String(value || ''))
                    ) : (
                      String(value || '—')
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        // ── EDIT MODE — uses DynamicFormRenderer ──────────────────────────
        <>
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">Edit Mode</span>
            <span className="text-xs text-amber-400/70">— Critical fields (🛡) require reason on save. Serial and metadata are locked.</span>
          </div>
          <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6">
            <DynamicFormRenderer
              formCode={originalRecord.formCode}
              initialData={editData}
              onSubmit={handleFormSubmit}
              onCancel={handleCancelEdit}
              editMode={true}
            />
          </div>

          {/* Validation errors */}
          {Object.keys(errors).length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
              <h4 className="text-sm font-medium text-red-300 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Validation Errors ({Object.keys(errors).length})
              </h4>
              <ul className="space-y-1">
                {Object.entries(errors).map(([field, msg]) => (
                  <li key={field} className="text-xs text-red-300">
                    <span className="font-mono text-red-400">{field}</span>: {msg}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecordViewPage;