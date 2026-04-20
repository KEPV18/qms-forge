// ============================================================================
// QMS Forge — Record Creation Page
// Pre-Creation Gate → Zod Validation → Google Sheets write
// NOW uses real Google Sheets persistence via useCreateRecord().
// ============================================================================

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FORM_SCHEMAS, getFormSchema, getFormSections } from '../data/formSchemas';
import { DynamicFormRenderer, RecordData } from '../components/forms/DynamicFormRenderer';
import { getNextSerial } from '../schemas';
import { useCreateRecord } from '../hooks/useRecordStorage';

// ============================================================================
// Record Creation Page — with Pre-Creation Gate + Zod Validation
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

  // When a form is selected, go to gate step
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

    // Submit to Google Sheets via mutation
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

  // Success screen
  if (created) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 rounded-xl border border-green-500/30 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Record Created</h2>
          <div className="mb-4">
            <span className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded font-mono">
              {created.serial}
            </span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-left mb-6 max-h-64 overflow-y-auto">
            <p className="text-xs text-slate-500 mb-2">Record Data:</p>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap">
              {JSON.stringify(created.data, null, 2)}
            </pre>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setCreated(null);
                setSelectedCode('');
                setGateStep('select');
                setCreateError(null);
              }}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition"
            >
              Create Another
            </button>
            <button
              onClick={() => navigate(`/records/${encodeURIComponent(created.serial)}`)}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
            >
              View Record
            </button>
            <button
              onClick={() => navigate('/records')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
            >
              All Records
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Gate step — handled inside DynamicFormRenderer
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Create Record</h1>
        <button
          onClick={() => navigate('/records')}
          className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg"
        >
          Cancel
        </button>
      </div>

      {/* Error display */}
      {createError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <strong>Error:</strong> {createError}
        </div>
      )}

      <div className="flex gap-6">
        {/* Form selector sidebar */}
        <div className="w-72 shrink-0">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search forms..."
            className="w-full px-3 py-2 mb-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none text-sm"
          />

          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {sections.map(section => {
              const sectionForms = filteredForms.filter(f => f.section === section.number);
              if (sectionForms.length === 0) return null;

              return (
                <div key={section.number}>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    {section.name}
                  </h3>
                  <div className="space-y-1">
                    {sectionForms.map(form => (
                      <button
                        key={form.code}
                        onClick={() => handleFormSelect(form.code)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                          selectedCode === form.code
                            ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                            : 'hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span className="font-mono font-semibold">{form.code}</span>
                        <span className="ml-2 text-slate-500">{form.name}</span>
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
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-xl text-slate-300 mb-2">Select a Form</h2>
              <p className="text-slate-500">
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