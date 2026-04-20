import React, { useState, useCallback, useMemo } from 'react';
import {
  FormSchema,
  FieldSchema,
  FieldType,
  FORM_SCHEMAS,
  getFormSchema,
  getFormSections,
} from '../../data/formSchemas';
import {
  validateFormData,
  validatePreCreationGate,
  getNextSerial,
  getFrequencyWarning,
  isoToDisplay,
  todayISO,
  type PreCreationGateData,
} from '../../schemas';

// ============================================================================
// Types
// ============================================================================

export interface RecordData {
  [key: string]: string | number | boolean | RecordData[];
}

export interface FormErrors {
  [key: string]: string;
}

interface DynamicFormRendererProps {
  formCode?: string;
  initialData?: RecordData;
  onSubmit: (data: RecordData) => void;
  onCancel?: () => void;
  readOnly?: boolean;
}

// ============================================================================
// Pre-Creation Gate Modal
// ============================================================================

const PreCreationGate: React.FC<{
  formCode: string;
  frequency: string;
  onPass: (answers: PreCreationGateData) => void;
  onBack: () => void;
}> = ({ formCode, frequency, onPass, onBack }) => {
  const [needReason, setNeedReason] = useState('');
  const [businessEvent, setBusinessEvent] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const warning = getFrequencyWarning(formCode, frequency);

  const handlePass = () => {
    const result = validatePreCreationGate({ needReason, businessEvent, frequencyCheck: confirmed ? 'yes' : '' });
    if (result.success) {
      onPass(result.data);
    } else {
      setErrors(result.errors);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl border border-indigo-500/30 p-6 max-w-lg w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🛡️</span>
          <h3 className="text-lg font-semibold text-slate-100">Pre-Creation Gate</h3>
        </div>
        
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-300">{warning}</p>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Every record must be justified. Answer these 3 questions before proceeding.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              1. Why is this record needed? <span className="text-red-400">*</span>
            </label>
            <textarea
              value={needReason}
              onChange={e => setNeedReason(e.target.value)}
              placeholder="e.g. New project starting, monthly plan required for April..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.needReason && <p className="text-red-400 text-xs mt-1">{errors.needReason}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              2. What business event triggers this record? <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={businessEvent}
              onChange={e => setBusinessEvent(e.target.value)}
              placeholder="e.g. Project kickoff, Monthly review, New employee hired..."
              className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {errors.businessEvent && <p className="text-red-400 text-xs mt-1">{errors.businessEvent}</p>}
            {errors.frequencyCheck && <p className="text-red-400 text-xs mt-1">{errors.frequencyCheck}</p>}
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
            />
            <label className="text-sm text-slate-300">
              3. I confirm this record is needed per its frequency schedule
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={handlePass}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            Proceed to Form
          </button>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Field Components
// ============================================================================

const TextField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={readOnly || field.defaultValue === 'auto'}
      className={`w-full px-3 py-2 rounded-lg border ${
        error ? 'border-red-500' : 'border-slate-600'
      } bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
    />
    {field.defaultValue === 'auto' && !readOnly && (
      <p className="text-xs text-slate-500 mt-1">Auto-generated</p>
    )}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const NumberField: React.FC<{
  field: FieldSchema;
  value: number | string;
  onChange: (val: number) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={field.validation?.min}
      max={field.validation?.max}
      disabled={readOnly}
      className={`w-full px-3 py-2 rounded-lg border ${
        error ? 'border-red-500' : 'border-slate-600'
      } bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const DateField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <input
      type="date"
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={readOnly}
      className={`w-full px-3 py-2 rounded-lg border ${
        error ? 'border-red-500' : 'border-slate-600'
      } bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
    />
    <p className="text-xs text-slate-500 mt-0.5">Format: DD/MM/YYYY (stored automatically)</p>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const SelectField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : field.width === 'third' ? '' : 'col-span-1'}`}>
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={readOnly}
      className={`w-full px-3 py-2 rounded-lg border ${
        error ? 'border-red-500' : 'border-slate-600'
      } bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
    >
      <option value="">— Select —</option>
      {field.options?.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const TextareaField: React.FC<{
  field: FieldSchema;
  value: string;
  onChange: (val: string) => void;
  error?: string;
  readOnly?: boolean;
}> = ({ field, value, onChange, error, readOnly }) => (
  <div className="form-field col-span-2">
    <label className="block text-sm font-medium text-slate-300 mb-1">
      {field.label}
      {field.required && <span className="text-red-400 ml-1">*</span>}
    </label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={readOnly}
      rows={3}
      className={`w-full px-3 py-2 rounded-lg border ${
        error ? 'border-red-500' : 'border-slate-600'
      } bg-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const CheckboxField: React.FC<{
  field: FieldSchema;
  value: boolean;
  onChange: (val: boolean) => void;
  readOnly?: boolean;
}> = ({ field, value, onChange, readOnly }) => (
  <div className={`form-field ${field.width === 'full' ? 'col-span-2' : 'col-span-1'}`}>
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={e => onChange(e.target.checked)}
        disabled={readOnly}
        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
      />
      {field.label}
    </label>
  </div>
);

const HeadingField: React.FC<{ field: FieldSchema }> = ({ field }) => (
  <div className="col-span-2 mt-4 pt-2 border-t border-slate-700">
    <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">{field.label}</h3>
  </div>
);

// ============================================================================
// Table Field Component
// ============================================================================

const TableField: React.FC<{
  field: FieldSchema;
  rows: RecordData[];
  onChange: (rows: RecordData[]) => void;
  readOnly?: boolean;
  errors?: Record<string, string>;
}> = ({ field, rows, onChange, readOnly, errors }) => {
  const columns = field.columns || [];

  const addRow = () => {
    const newRow: RecordData = {};
    columns.forEach(col => {
      newRow[col.key] = col.type === 'number' ? 0 : '';
    });
    onChange([...rows, newRow]);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, i) => i !== index));
  };

  const updateCell = (rowIndex: number, colKey: string, value: string | number | boolean) => {
    const updated = rows.map((row, i) => {
      if (i !== rowIndex) return row;
      return { ...row, [colKey]: value };
    });
    onChange(updated);
  };

  const tableError = errors?.[field.key];

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {field.label}
        {field.required && <span className="text-red-400 ml-1">*</span>}
      </label>
      <div className="overflow-x-auto rounded-lg border border-slate-600">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700">
              <th className="px-3 py-2 text-left text-slate-300 font-medium w-8">#</th>
              {columns.map(col => (
                <th key={col.key} className="px-3 py-2 text-left text-slate-300 font-medium">
                  {col.label}
                  {col.required && <span className="text-red-400 ml-1">*</span>}
                </th>
              ))}
              {!readOnly && <th className="px-2 py-2 w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + (readOnly ? 1 : 2)} className="px-3 py-4 text-center text-slate-500">
                  No rows added yet — click "+ Add Row" below
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}>
                <td className="px-3 py-1 text-slate-500 text-xs">{ri + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className="px-2 py-1">
                    {col.type === 'select' ? (
                      <select
                        value={row[col.key] as string || ''}
                        onChange={e => updateCell(ri, col.key, e.target.value)}
                        disabled={readOnly}
                        className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100 text-sm"
                      >
                        <option value="">—</option>
                        {col.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : col.type === 'number' ? (
                      <input
                        type="number"
                        value={row[col.key] as number || ''}
                        onChange={e => updateCell(ri, col.key, Number(e.target.value))}
                        disabled={readOnly}
                        className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100 text-sm"
                      />
                    ) : (
                      <input
                        type="text"
                        value={row[col.key] as string || ''}
                        onChange={e => updateCell(ri, col.key, e.target.value)}
                        disabled={readOnly}
                        className="w-full px-2 py-1 rounded border border-slate-600 bg-slate-800 text-slate-100 text-sm"
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td className="px-2 py-1">
                    <button
                      onClick={() => removeRow(ri)}
                      className="text-red-400 hover:text-red-300 text-sm"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {tableError && <p className="text-red-400 text-xs mt-1">{tableError}</p>}
      {!readOnly && (
        <button
          onClick={addRow}
          className="mt-2 px-3 py-1 text-sm rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-indigo-400 hover:border-indigo-500 transition-colors"
        >
          + Add Row
        </button>
      )}
    </div>
  );
};

// ============================================================================
// Validation Error Banner
// ============================================================================

const ValidationBanner: React.FC<{ errors: Record<string, string>; onDismiss: () => void }> = ({ errors, onDismiss }) => {
  const count = Object.keys(errors).length;
  if (count === 0) return null;

  return (
    <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-red-400 font-semibold text-sm">
          ⚠️ {count} validation error{count > 1 ? 's' : ''}
        </h4>
        <button onClick={onDismiss} className="text-red-400 hover:text-red-300 text-sm">✕</button>
      </div>
      <ul className="text-xs text-red-300 space-y-1">
        {Object.entries(errors).map(([key, msg]) => (
          <li key={key}><span className="font-mono text-red-400">{key}</span>: {msg}</li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// Main Dynamic Form Renderer — now with Pre-Creation Gate + Zod validation
// ============================================================================

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  formCode,
  initialData,
  onSubmit,
  onCancel,
  readOnly = false,
}) => {
  const selectedCode = formCode || '';
  const schema = selectedCode ? getFormSchema(selectedCode) : null;
  const [formData, setFormData] = useState<RecordData>(initialData || {});
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  
  // Pre-Creation Gate state
  const [gatePassed, setGatePassed] = useState(false);
  const [showGate, setShowGate] = useState(false);
  const [gateAnswers, setGateAnswers] = useState<PreCreationGateData | null>(null);

  // Reset form when code changes — pre-fill defaults
  React.useEffect(() => {
    if (selectedCode && schema) {
      const defaults: RecordData = { serial: 'auto' };
      // Pre-fill required date fields with today
      schema.fields.forEach(field => {
        if (field.type === 'date' && field.required) {
          defaults[field.key] = todayISO();
        }
      });
      setFormData(initialData ? { ...defaults, ...initialData } : defaults);
    } else {
      setFormData(initialData || {});
    }
    setErrors({});
    setSubmitted(false);
    setGatePassed(false);
    setGateAnswers(null);
  }, [formCode]);

  // Handle form selection — show gate first
  const handleFormSelect = (code: string) => {
    if (!gatePassed && code !== selectedCode) {
      setShowGate(true);
    }
  };

  // When gate passes, allow form to render
  const handleGatePass = (answers: PreCreationGateData) => {
    setGatePassed(true);
    setGateAnswers(answers);
    setShowGate(false);
  };

  // Handle field change
  const handleFieldChange = useCallback((key: string, value: string | number | boolean | RecordData[]) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (submitted) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, [submitted]);

  // Validate using Zod
  const validate = useCallback((): boolean => {
    if (!schema) return false;
    if (!selectedCode) return false;

    // Convert date fields from YYYY-MM-DD to DD/MM/YYYY for validation
    const dataToValidate = { ...formData };
    // Convert date fields from ISO to DD/MM/YYYY for validation
    schema.fields.forEach(field => {
      if (field.type === 'date' && dataToValidate[field.key]) {
        dataToValidate[field.key] = isoToDisplay(dataToValidate[field.key] as string);
      }
    });
    // Auto-fill serial — replace placeholder with actual next serial
    if (!dataToValidate.serial || dataToValidate.serial === 'auto') {
      dataToValidate.serial = getNextSerial(selectedCode);
    }

    const result = validateFormData(selectedCode, dataToValidate);
    if (result.success) {
      setErrors({});
      return true;
    }
    
    setErrors(result.errors);
    setSubmitted(true);
    return false;
  }, [schema, selectedCode, formData]);

  // Handle submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Convert dates to display format before validating
    const dataToValidate = { ...formData };
    if (schema) {
      schema.fields.forEach(field => {
        if (field.type === 'date' && dataToValidate[field.key]) {
          dataToValidate[field.key] = isoToDisplay(dataToValidate[field.key] as string);
        }
      });
    }

    // Auto-generate serial
    if (!dataToValidate.serial || dataToValidate.serial === 'auto') {
      dataToValidate.serial = getNextSerial(selectedCode);
    }

    // Add creation metadata
    dataToValidate._createdAt = new Date().toISOString();
    dataToValidate._createdBy = 'Ahmed Khaled'; // Will come from auth later
    dataToValidate._creationReason = gateAnswers?.needReason || '';
    dataToValidate._businessEvent = gateAnswers?.businessEvent || '';

    // Validate with Zod
    const result = validateFormData(selectedCode, dataToValidate);
    if (result.success) {
      onSubmit(result.data as RecordData);
    } else {
      setErrors(result.errors);
      setSubmitted(true);
    }
  };

  const renderField = (field: FieldSchema) => {
    const val = formData[field.key];
    const err = errors[field.key];

    switch (field.type) {
      case 'text':
      case 'signature':
        return (
          <TextField
            key={field.key}
            field={field}
            value={val as string || (field.defaultValue === 'auto' ? `Will be: ${getNextSerial(selectedCode)}` : '')}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'number':
        return (
          <NumberField
            key={field.key}
            field={field}
            value={val as number || ''}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'date':
        return (
          <DateField
            key={field.key}
            field={field}
            value={val as string || (field.required ? todayISO() : '')}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'select':
      case 'radio':
        return (
          <SelectField
            key={field.key}
            field={field}
            value={val as string || ''}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'textarea':
        return (
          <TextareaField
            key={field.key}
            field={field}
            value={val as string || ''}
            onChange={v => handleFieldChange(field.key, v)}
            error={err}
            readOnly={readOnly}
          />
        );
      case 'checkbox':
        return (
          <CheckboxField
            key={field.key}
            field={field}
            value={val as boolean || false}
            onChange={v => handleFieldChange(field.key, v)}
            readOnly={readOnly}
          />
        );
      case 'table':
        return (
          <TableField
            key={field.key}
            field={field}
            rows={val as RecordData[] || []}
            onChange={v => handleFieldChange(field.key, v)}
            readOnly={readOnly}
            errors={errors}
          />
        );
      case 'heading':
        return <HeadingField key={field.key} field={field} />;
      default:
        return null;
    }
  };

  // Show the pre-creation gate modal
  if (showGate && schema) {
    return (
      <>
        <PreCreationGate
          formCode={selectedCode}
          frequency={schema.frequency}
          onPass={handleGatePass}
          onBack={() => setShowGate(false)}
        />
        <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-lg text-slate-300 mb-2">Complete the Pre-Creation Gate</h3>
            <p className="text-sm text-slate-500">
              Answer 3 questions before filling the <span className="text-indigo-400">{selectedCode}</span> form.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-6">
      {schema ? (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-2 py-1 text-xs font-bold bg-indigo-500/20 text-indigo-400 rounded">
                {schema.code}
              </span>
              <h2 className="text-xl font-semibold text-slate-100">{schema.name}</h2>
            </div>
            <p className="text-sm text-slate-400">{schema.description}</p>
            <div className="flex gap-4 mt-2 text-xs text-slate-500">
              <span>Section: {schema.sectionName}</span>
              <span>·</span>
              <span>Frequency: {schema.frequency}</span>
              <span>·</span>
              <span className={
                schema.importance === 'Critical' ? 'text-red-400' :
                schema.importance === 'High' ? 'text-amber-400' : 'text-slate-500'
              }>
                {schema.importance}
              </span>
            </div>
            {gateAnswers && (
              <div className="mt-2 text-xs bg-green-500/10 border border-green-500/20 rounded px-3 py-1 text-green-400">
                ✓ Gate passed — Reason: {gateAnswers.needReason.slice(0, 60)}...
              </div>
            )}
          </div>

          {submitted && Object.keys(errors).length > 0 && (
            <ValidationBanner errors={errors} onDismiss={() => setErrors({})} />
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {schema.fields.map(renderField)}
            </div>

            {!readOnly && (
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  Create Record
                </button>
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}
          </form>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-lg text-slate-300 mb-2">Select a Form</h3>
          <p className="text-sm text-slate-500">Choose a form from the sidebar. You'll answer 3 gate questions before filling the form.</p>
        </div>
      )}
    </div>
  );
};

export default DynamicFormRenderer;