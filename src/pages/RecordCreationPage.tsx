import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FORM_SCHEMAS, getFormSchema, getFormSections } from '../data/formSchemas';
import { DynamicFormRenderer, RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Record Creation Page
// ============================================================================

const RecordCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCode, setSelectedCode] = useState<string>('');
  const [created, setCreated] = useState<{ code: string; serial: string; data: RecordData } | null>(null);
  const [search, setSearch] = useState('');

  const sections = getFormSections();
  const schema = selectedCode ? getFormSchema(selectedCode) : null;

  const filteredForms = FORM_SCHEMAS.filter(f =>
    f.code.toLowerCase().includes(search.toLowerCase()) ||
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = (data: RecordData) => {
    if (!schema) return;

    // For now, show success. Later this will save to Sheets/Drive
    const serial = data.serial || `${schema.code}-NEW`;
    setCreated({ code: schema.code, serial, data });
    console.log('Record created:', { code: schema.code, serial, data });
  };

  if (created) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-900 rounded-xl border border-green-500/30 p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Record Created</h2>
          <div className="mb-6">
            <span className="px-3 py-1 text-sm bg-green-500/20 text-green-400 rounded font-mono">
              {created.code}-{created.serial}
            </span>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 text-left mb-6 max-h-64 overflow-y-auto">
            <pre className="text-xs text-slate-300 whitespace-pre-wrap">
              {JSON.stringify(created.data, null, 2)}
            </pre>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setCreated(null)}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
            >
              Create Another
            </button>
            <button
              onClick={() => navigate('/records')}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
            >
              View Records
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Form Selector Sidebar */}
      <div className="w-80 flex-shrink-0 bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100 mb-3">Create Record</h2>
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {sections.map(section => {
            const sectionForms = filteredForms.filter(f => f.section === section.number);
            if (sectionForms.length === 0) return null;

            return (
              <div key={section.number} className="mb-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {section.name}
                </h3>
                {sectionForms.map(form => (
                  <button
                    key={form.code}
                    onClick={() => setSelectedCode(form.code)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors text-sm ${
                      selectedCode === form.code
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs opacity-60">{form.code}</span>
                      <span className="truncate">{form.name}</span>
                    </div>
                    <div className="flex gap-2 mt-0.5 text-xs opacity-50">
                      <span>{form.frequency}</span>
                      <span>·</span>
                      <span className={
                        form.importance === 'Critical' ? 'text-red-400' :
                        form.importance === 'High' ? 'text-amber-400' : ''
                      }>
                        {form.importance}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Renderer */}
      <div className="flex-1 overflow-y-auto">
        <DynamicFormRenderer
          formCode={selectedCode}
          onSubmit={handleSubmit}
          onCancel={() => setSelectedCode('')}
        />
      </div>
    </div>
  );
};

export default RecordCreationPage;