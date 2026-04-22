// ============================================================================
// QMS Forge — Record Storage Service
// Supabase is the ONLY source of truth.
// No write without validation. No bypass paths.
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import { preWriteValidation } from './preWriteValidation';
import { getFormSchema } from '../data/formSchemas';
import { getNextSerial, isSerialUnique } from '../schemas/serialAndDate';
import { appendAuditLog, computeDiff } from './auditLog';
import type { RecordData } from '../components/forms/DynamicFormRenderer';
import type { Tables } from '@/integrations/supabase/types';

type SupabaseRecord = Tables<'records'>;

// ============================================================================
// Operation Log — structured log of all write operations for observability
// ============================================================================

export interface OperationLogEntry {
  timestamp: string;
  operation: 'create' | 'update' | 'delete';
  serial: string;
  formCode: string;
  success: boolean;
  error?: string;
  conflict?: boolean;
  durationMs?: number;
}

const OPERATION_LOG: OperationLogEntry[] = [];
const MAX_LOG_ENTRIES = 200;

function logOperation(entry: OperationLogEntry) {
  OPERATION_LOG.push(entry);
  if (OPERATION_LOG.length > MAX_LOG_ENTRIES) {
    OPERATION_LOG.shift();
  }
  const prefix = entry.success ? '✅' : '❌';
  console.log(`${prefix} [recordStorage] ${entry.operation.toUpperCase()} ${entry.serial} ${entry.success ? 'succeeded' : `failed: ${entry.error}`}${entry.conflict ? ' (CONFLICT)' : ''} (${entry.durationMs}ms)`);
}

export function getOperationLog(): OperationLogEntry[] {
  return [...OPERATION_LOG];
}

// ============================================================================
// Types
// ============================================================================

export interface StorageResult {
  success: boolean;
  record?: RecordData;
  error?: string;
  conflict?: boolean;
  duplicateSerial?: boolean;
}

export class RecordStorageError extends Error {
  public readonly code: 'VALIDATION' | 'DUPLICATE' | 'CONFLICT' | 'NETWORK' | 'PARSE' | 'NOT_FOUND' | 'UNKNOWN';
  public readonly details?: unknown;

  constructor(message: string, code: RecordStorageError['code'], details?: unknown) {
    super(message);
    this.name = 'RecordStorageError';
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Row ↔ RecordData conversion
// ============================================================================

const FIELD_COLUMNS = [
  'serial', 'formCode', 'formName', 'category', 'description',
  '_createdAt', '_createdBy', '_lastModifiedAt', '_lastModifiedBy',
  '_editCount', '_modificationReason', 'formData',
];

function parseRowToRecord(row: SupabaseRecord): RecordData | null {
  if (!row.code) return null;

  const formData = (row.file_reviews || {}) as Record<string, unknown>;
  let parsedFormData: Record<string, unknown> = {};
  if (typeof formData === 'object' && !Array.isArray(formData)) {
    parsedFormData = { ...formData };
  }

  return {
    serial: row.last_serial || row.code,
    formCode: row.code,
    formName: row.record_name || '',
    category: row.category || '',
    description: row.description || '',
    _createdAt: row.created_at || '',
    _createdBy: row.reviewed_by || '',
    _lastModifiedAt: row.updated_at || '',
    _lastModifiedBy: '',
    _editCount: 0,
    _modificationReason: '',
    formData: parsedFormData,
  } as RecordData;
}

function recordToRow(data: RecordData): Partial<SupabaseRecord> {
  return {
    code: data.formCode as string,
    record_name: data.formName as string || '',
    category: data.category as string || '',
    description: data.description as string || '',
    last_serial: data.serial as string,
    audit_status: (data.formData as Record<string, unknown>)?.recordStatus as string || 'pending',
    reviewed: false,
    reviewed_by: data._createdBy as string || '',
    review_date: data._createdAt as string || '',
    file_reviews: (data.formData as Record<string, unknown>) || {},
    record_status: (data.formData as Record<string, unknown>)?.recordStatus as string || 'pending',
  };
}

// ============================================================================
// Supabase query cache invalidation
// ============================================================================

function invalidateRowCache(): void {
  // React Query handles cache — just trigger a refetch via queryClient
  // This function exists for API compatibility
}

// ============================================================================
// Public API — Read operations
// ============================================================================

export async function getRecords(formCode?: string): Promise<RecordData[]> {
  let query = supabase.from('records').select('*').order('row_index', { ascending: true });

  const { data, error } = await query;

  if (error) {
    throw new RecordStorageError(`Failed to fetch records: ${error.message}`, 'NETWORK', error);
  }

  const records = (data as SupabaseRecord[])
    .map(row => parseRowToRecord(row))
    .filter((r): r is RecordData => r !== null);

  if (formCode) {
    return records.filter(r => r.formCode === formCode);
  }

  return records;
}

export async function getRecord(serial: string): Promise<RecordData | null> {
  const { data, error } = await supabase
    .from('records')
    .select('*')
    .eq('last_serial', serial)
    .maybeSingle();

  if (error) {
    throw new RecordStorageError(`Failed to fetch record ${serial}: ${error.message}`, 'NETWORK', error);
  }

  if (!data) {
    // Try matching by code (form code like F/08)
    const { data: dataByCode, error: err2 } = await supabase
      .from('records')
      .select('*')
      .eq('code', serial)
      .maybeSingle();

    if (err2 || !dataByCode) return null;
    return parseRowToRecord(dataByCode as SupabaseRecord);
  }

  return parseRowToRecord(data as SupabaseRecord);
}

export async function getExistingSerials(formCode: string): Promise<string[]> {
  const records = await getRecords(formCode);
  return records.map(r => r.serial as string).filter(Boolean);
}

// ============================================================================
// Public API — Write operations (ALL go through preWriteValidation)
// ============================================================================

export async function createRecord(formData: RecordData): Promise<StorageResult> {
  const startTime = performance.now();
  const formCode = formData.formCode as string;
  if (!formCode) {
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: '?', formCode: '?', success: false, error: 'formCode is required', durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: 'formCode is required for record creation' };
  }

  // 1. Pre-write validation
  const validation = preWriteValidation(formCode, formData, 'create');
  if (!validation.valid || !validation.sanitizedData) {
    console.error('[recordStorage] Pre-write validation failed:', validation.errors);
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial: '?', formCode, success: false, error: `Validation: ${validation.errors.map(e => e.message).join('; ')}`, durationMs: Math.round(performance.now() - startTime) });
    return {
      success: false,
      error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
    };
  }

  const data = validation.sanitizedData;

  // 2. Fetch existing serials from Supabase
  const existingSerials = await getExistingSerials(formCode);

  // 3. Generate next serial
  let serial: string;
  const providedSerial = String(data.serial ?? '');
  if (providedSerial && providedSerial !== 'auto') {
    serial = providedSerial;
  } else {
    serial = getNextSerial(formCode, existingSerials);
  }

  // 4. Re-check uniqueness
  if (existingSerials.includes(serial)) {
    const higherSerials = existingSerials.map(s => {
      const match = s.match(/F\/\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = Math.max(...higherSerials, 0);
    const formNum = formCode.replace('F/', '');
    serial = `F/${formNum}-${String(maxNum + 1).padStart(3, '0')}`;

    if (existingSerials.includes(serial)) {
      return { success: false, error: `Cannot generate unique serial for ${formCode}.`, duplicateSerial: true };
    }
  }

  // 5. Set final metadata
  data.serial = serial;
  data.formCode = formCode;
  const formSchema = getFormSchema(formCode);
  data.formName = formSchema?.name || '';
  data._createdAt = data._createdAt || new Date().toISOString();
  data._createdBy = data._createdBy || 'akh.dev185@gmail.com';
  data._lastModifiedAt = null;
  data._lastModifiedBy = null;
  data._editCount = 0;
  data._modificationReason = null;

  // 6. Insert into Supabase
  try {
    const row = recordToRow(data);
    const { error } = await supabase.from('records').insert(row);

    if (error) {
      throw new RecordStorageError(`Failed to create record: ${error.message}`, 'NETWORK', error);
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 7. Audit log (non-blocking)
    const allFields = Object.keys(data).filter(k => !k.startsWith('_'));
    const newFieldValues: Record<string, unknown> = {};
    for (const key of allFields) { newFieldValues[key] = data[key]; }
    appendAuditLog(serial, 'create', data._createdBy as string || 'unknown', allFields, {}, newFieldValues).catch(err => {
      console.error('[recordStorage] Audit log failed (non-blocking):', err);
    });

    return { success: true, record: data };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) return { success: false, error: err.message };
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

export async function updateRecord(
  serial: string,
  changes: RecordData,
  modificationReason?: string
): Promise<StorageResult> {
  const startTime = performance.now();

  // 1. Fetch current record
  const { data: currentRow, error: fetchError } = await supabase
    .from('records')
    .select('*')
    .eq('last_serial', serial)
    .maybeSingle();

  if (fetchError || !currentRow) {
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode: '?', success: false, error: 'Record not found', durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: `Record ${serial} not found.` };
  }

  const currentRecord = parseRowToRecord(currentRow as SupabaseRecord);
  if (!currentRecord) {
    return { success: false, error: `Failed to parse record ${serial}.` };
  }

  const formCode = String(currentRecord.formCode || '?');

  // 2. Optimistic locking
  const currentEditCount = Number(currentRow.updated_at ? 1 : 0);
  const clientEditCount = changes._editCount !== undefined ? Number(changes._editCount) : -1;

  if (clientEditCount >= 0 && clientEditCount !== currentEditCount) {
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: `Optimistic lock conflict`, conflict: true, durationMs: Math.round(performance.now() - startTime) });
    return {
      success: false,
      error: `Record ${serial} was modified by another user. Please reload and try again.`,
      conflict: true,
    };
  }

  // 3. Merge
  const merged: RecordData = {
    ...currentRecord,
    ...changes,
    serial: currentRecord.serial,
    formCode: currentRecord.formCode,
    formName: currentRecord.formName,
    _createdAt: currentRecord._createdAt,
    _createdBy: currentRecord._createdBy,
    _lastModifiedAt: new Date().toISOString(),
    _lastModifiedBy: 'akh.dev185@gmail.com',
    _editCount: currentEditCount + 1,
    _modificationReason: modificationReason || null,
  };

  // 4. Validation
  const validation = preWriteValidation(currentRecord.formCode as string, merged, 'update', serial);
  if (!validation.valid || !validation.sanitizedData) {
    return { success: false, error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}` };
  }

  // 5. Update in Supabase
  try {
    const updateData = recordToRow(validation.sanitizedData);
    const { error: updateError } = await supabase
      .from('records')
      .update(updateData)
      .eq('last_serial', serial);

    if (updateError) {
      throw new RecordStorageError(`Failed to update record: ${updateError.message}`, 'NETWORK', updateError);
    }

    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 6. Audit log
    const diff = computeDiff(currentRecord, validation.sanitizedData);
    if (diff.changedFields.length > 0) {
      appendAuditLog(serial, 'update', merged._lastModifiedBy as string || 'unknown', diff.changedFields, diff.previousValues, diff.newValues).catch(err => {
        console.error('[recordStorage] Audit log failed (non-blocking):', err);
      });
    }

    return { success: true, record: validation.sanitizedData };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) return { success: false, error: err.message };
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

export { invalidateRowCache };