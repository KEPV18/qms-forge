import React, { useState, useCallback, useMemo } from 'react';
import {
  FormSchema,
  FieldSchema,
  FieldType,
  FORM_SCHEMAS,
  getFormSchema,
  getFormSections,
} from '../../data/formSchemas';

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
  <div className={`form-field col-span-2`}>
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
}> = ({ field, rows, onChange, readOnly }) => {
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

  return (
    <div className="col-span-2">
      <label className="block text-sm font-medium text-slate-300 mb-2">
        {field.label}
      </label>
      <div className="overflow-x-auto rounded-lg border border-slate-600">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700">
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
                <td colSpan={columns.length + (readOnly ? 0 : 1)} className="px-3 py-4 text-center text-slate-500">
                  No rows added yet
                </td>
              </tr>
            )}
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-slate-800' : 'bg-slate-800/50'}>
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
// Main Dynamic Form Renderer
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

  // Reset form when code changes
  React.useEffect(() => {
    setFormData(initialData || {});
    setErrors({});
    setSubmitted(false);
  }, [formCode]);

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

  const validate = useCallback((): boolean => {
    if (!schema) return false;
    const newErrors: FormErrors = {};

    schema.fields.forEach(field => {
      if (field.type === 'heading') return;
      if (field.type === 'table') {
        if (field.required && (!formData[field.key] || (formData[field.key] as RecordData[]).length === 0)) {
          newErrors[field.key] = `${field.label} is required — add at least one row`;
        }
        return;
      }
      const val = formData[field.key];
      if (field.required && (val === undefined || val === null || val === '')) {
        newErrors[field.key] = `${field.label} is required`;
      }
      if (field.validation?.pattern && typeof val === 'string') {
        const re = new RegExp(field.validation.pattern);
        if (!re.test(val)) {
          newErrors[field.key] = field.validation.message || 'Invalid format';
        }
      }
    });

    setErrors(newErrors);
    setSubmitted(true);
    return Object.keys(newErrors).length === 0;
  }, [schema, formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
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
            value={val as string || ''}
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
            value={val as string || ''}
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
          />
        );
      case 'heading':
        return <HeadingField key={field.key} field={field} />;
      default:
        return null;
    }
  };

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
          </div>

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
          <p className="text-sm text-slate-500">Choose a form code from the sidebar to begin filling a record.</p>
        </div>
      )}
    </div>
  );
};

export default DynamicFormRenderer;