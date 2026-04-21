// ============================================================================
// QMS Forge — Record Creation Page (Phase 9 Refined)
// Consistent design system classes, improved hierarchy, better interactions.
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, CheckCircle, XCircle, ArrowLeft, Loader2,
} from 'lucide-react';
import { FORM_SCHEMAS, getFormSchema, getFormSections } from '../data/formSchemas';
import DynamicFormRenderer, { type RecordData } from '../components/forms/DynamicFormRenderer';
import { useCreateRecord } from '../hooks/useRecordStorage';

// ============================================================================
// Record Creation Page
// ============================================================================

const RecordCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateRecord();

  const [selectedCode, setSelectedCode] = useState<string>('');
  const [created, setCreated] = useState<{ code: string; serial: string; data: RecordData } | null>(null);
  const [search, setSearch] = useState('');
  const [gateStep, setGateStep] = useState<'select' | 'gate' | 'form' | 'success'>('select');
  const [createError, setCreateError] = useState<string | null>(null);

  const sections = getFormSections();
  const schema = selectedCode ? getFormSchema(selectedCode) : null;

  const filteredForms = FORM_SCHEMAS.filter(f =>
    f.code.toLowerCase().includes(search.toLowerCase()) ||
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleFormSelect = (code: string) => {
    setSelectedCode(code);
    setGateStep('gate');
  };

  const handleGatePass = () => {
    setGateStep('form');
  };

  const handleSubmit = (data: RecordData) => {
    if (!schema) return;
    setCreateError(null);

    createMutation.mutate(data, {
      onSuccess: (result) => {
        if (result.success && result.record) {
          setCreated({ code: schema.code, serial: result.record.serial as string, data: result.record });
          setGateStep('success');
        } else {
          setCreateError(result.error || 'Failed to create record.');
        }
      },
      onError: (err: Error) => {
        setCreateError(err.message || 'Failed to create record.');
      },
    });
  };

  // ─── Success ──────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="max-w-2xl mx-auto p-6 page-transition">
        <div className="ds-card p-8 text-center border-success/30">
          <div className="w-16 h-16 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Record Created</h2>
          <div className="mb-6">
            <span className="px-3 py-1.5 text-sm bg-success/10 text-success border border-success/20 rounded-sm font-mono font-semibold">
              {created.serial}
            </span>
          </div>
          <div className="bg-secondary/50 border border-border rounded-sm p-4 text-left mb-6 max-h-64 overflow-y-auto">
            <p className="text-xs text-muted-foreground mb-2">Record Data:</p>
            <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
              {JSON.stringify(created.data, null, 2)}
            </pre>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setCreated(null); setSelectedCode(''); setGateStep('select'); setCreateError(null); }}
              className="ds-press ds-focus-ring px-6 py-2 bg-primary text-primary-foreground rounded-sm font-medium"
            >
              Create Another
            </button>
            <button
              onClick={() => navigate(`/records/${encodeURIComponent(created.serial)}`)}
              className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors"
            >
              View Record
            </button>
            <button
              onClick={() => navigate('/records')}
              className="ds-press px-6 py-2 bg-secondary text-secondary-foreground rounded-sm font-medium hover:bg-accent transition-colors"
            >
              All Records
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Create Record</h1>
        <button onClick={() => navigate('/records')} className="ds-press px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-sm hover:bg-accent transition-colors">
          Cancel
        </button>
      </div>

      {/* Error */}
      {createError && (
        <div className="mb-4 p-4 ds-critical-card rounded-sm text-sm text-destructive">
          <strong>Error:</strong> {createError}
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar — Form selector */}
        <div className="w-72 shrink-0">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search forms..."
              className="input-modern w-full pl-10 pr-4 py-2 text-sm"
            />
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {sections.map(section => {
              const sectionForms = filteredForms.filter(f => f.section === section.number);
              if (sectionForms.length === 0) return null;

              return (
                <div key={section.number}>
                  <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {section.name}
                  </h3>
                  <div className="space-y-0.5">
                    {sectionForms.map(form => (
                      <button
                        key={form.code}
                        onClick={() => handleFormSelect(form.code)}
                        className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-colors ds-press ${
                          selectedCode === form.code
                            ? 'bg-primary/10 text-primary border border-primary/30'
                            : 'text-foreground hover:bg-accent border border-transparent'
                        }`}
                      >
                        <span className="font-mono font-semibold">{form.code}</span>
                        <span className="ml-2 text-muted-foreground">{form.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 min-w-0">
          {!selectedCode || !schema ? (
            <div className="flex flex-col items-center justify-center py-20 ds-fade-enter">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h2 className="text-xl text-foreground mb-2">Select a Form</h2>
              <p className="text-sm text-muted-foreground">
                Choose a QMS form from the sidebar to create a new record.
              </p>
            </div>
          ) : (
            <DynamicFormRenderer
              formCode={selectedCode}
              initialData={{ serial: 'auto' }}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordCreationPage;