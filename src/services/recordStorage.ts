// ============================================================================
// QMS Forge — Record Storage Service
// Google Sheets is the ONLY source of truth. Cache is a temporary optimization.
// No write without validation. No bypass paths.
// ============================================================================

import { getAccessToken } from '../lib/auth';
import { preWriteValidation, serializeRecordToRow, parseRowToRecord } from './preWriteValidation';
import { getFormSchema } from '../data/formSchemas';
import { getNextSerial, isSerialUnique } from '../schemas/serialAndDate';
import { appendAuditLog, computeDiff } from './auditLog';
import type { RecordData } from '../components/forms/DynamicFormRenderer';

// ============================================================================
// Constants
// ============================================================================

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || '';
const SHEET_NAME = 'ForgeRecords';
const HEADER_ROW = 1; // Row 1 is headers

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
  // Also log to console for development debug
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
  conflict?: boolean; // concurrent modification detected
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
// Sheets API helpers
// ============================================================================

async function getAccessTokenOrThrow(): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new RecordStorageError(
      'No access token available. Please log in.',
      'NETWORK'
    );
  }
  return token;
}

/**
 * Fetch all rows from ForgeRecords sheet (excluding header).
 * Google Sheets is the ONLY source of truth.
 */
async function fetchAllRows(): Promise<string[][]> {
  const token = await getAccessTokenOrThrow();
  const range = `'${SHEET_NAME}'!A2:J`;

  const response = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?access_token=${token}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new RecordStorageError(
      `Failed to fetch records: ${err.error?.message || response.statusText}`,
      'NETWORK',
      err
    );
  }

  const data = await response.json();
  return (data.values || []) as string[][];
}

/**
 * Append a single row to ForgeRecords sheet.
 * Returns the row number (1-indexed, including header) of the new row.
 */
async function appendRow(row: string[]): Promise<number> {
  const token = await getAccessTokenOrThrow();
  const range = `'${SHEET_NAME}'!A:J`;

  const response = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&access_token=${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new RecordStorageError(
      `Failed to append record: ${err.error?.message || response.statusText}`,
      'NETWORK',
      err
    );
  }

  const result = await response.json();
  // The update response includes the range, parse the row number
  const updatedRange = result.updates?.updatedRange || '';
  const rowMatch = updatedRange.match(/(\d+)/);
  return rowMatch ? parseInt(rowMatch[1], 10) : 0;
}

/**
 * Update a specific row in ForgeRecords sheet.
 * Uses the row number to address the range directly.
 */
async function updateRow(rowNumber: number, row: string[]): Promise<void> {
  const token = await getAccessTokenOrThrow();
  const range = `'${SHEET_NAME}'!A${rowNumber}:J${rowNumber}`;

  const response = await fetch(
    `${SHEETS_API_BASE}/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        values: [row],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new RecordStorageError(
      `Failed to update record: ${err.error?.message || response.statusText}`,
      'NETWORK',
      err
    );
  }
}

// ============================================================================
// Row index tracking (for updates)
// ============================================================================

// Cache the row-number index: serial → rowNumber
let rowIndexCache: Map<string, number> = new Map();
let rowIndexCacheTime: number = 0;
const ROW_CACHE_TTL = 30_000; // 30 seconds — short, because updates change things

async function buildRowIndex(): Promise<Map<string, number>> {
  // Return cached if fresh
  if (rowIndexCache.size > 0 && Date.now() - rowIndexCacheTime < ROW_CACHE_TTL) {
    return rowIndexCache;
  }

  const rows = await fetchAllRows();
  const index = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row && row[0]) {
      // Row number in Sheets = array index + 2 (1 for header row, 1 for 0-indexed)
      index.set(row[0], i + 2);
    }
  }

  rowIndexCache = index;
  rowIndexCacheTime = Date.now();
  return index;
}

function invalidateRowCache(): void {
  rowIndexCache = new Map();
  rowIndexCacheTime = 0;
}

// ============================================================================
// Public API — Read operations
// ============================================================================

/**
 * Get all records from Google Sheets.
 * Google Sheets is the ONLY source of truth.
 */
export async function getRecords(formCode?: string): Promise<RecordData[]> {
  const rows = await fetchAllRows();
  const records: RecordData[] = [];

  for (const row of rows) {
    const record = parseRowToRecord(row);
    if (record) {
      // Rebuild row index cache as a side effect
      records.push(record);
    }
  }

  // Filter by form code if provided
  if (formCode) {
    return records.filter(r => r.formCode === formCode);
  }

  return records;
}

/**
 * Get a single record by serial number.
 * Fetches from Sheets — no local cache for correctness.
 */
export async function getRecord(serial: string): Promise<RecordData | null> {
  const records = await getRecords();
  return records.find(r => r.serial === serial) || null;
}

/**
 * Get all serial numbers for a specific form code.
 * Used by duplicate prevention.
 */
export async function getExistingSerials(formCode: string): Promise<string[]> {
  const records = await getRecords(formCode);
  return records.map(r => r.serial as string).filter(Boolean);
}

// ============================================================================
// Public API — Write operations (ALL go through preWriteValidation)
// ============================================================================

/**
 * Create a new record.
 * 1. Pre-write Zod validation
 * 2. Fetch existing serials from Sheets (source of truth)
 * 3. Generate next serial
 * 4. Re-check uniqueness BEFORE write
 * 5. Append to Sheets
 * 6. Return created record
 */
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

  // 2. Fetch existing serials from Sheets (ONLY source of truth)
  const existingSerials = await getExistingSerials(formCode);

  // 3. Generate next serial
  let serial: string;
  const providedSerial = String(data.serial ?? '');
  if (providedSerial && providedSerial !== 'auto') {
    serial = providedSerial;
  } else {
    serial = getNextSerial(formCode, existingSerials);
  }

  // 4. Re-check uniqueness BEFORE write (defense in depth)
  if (existingSerials.includes(serial)) {
    // Regenerate with a higher number
    const higherSerials = existingSerials.map(s => {
      const match = s.match(/F\/\d+-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    });
    const maxNum = Math.max(...higherSerials, 0);
    const formNum = formCode.replace('F/', '');
    serial = `F/${formNum}-${String(maxNum + 1).padStart(3, '0')}`;

    // Still duplicate? This should be impossible but check anyway
    if (existingSerials.includes(serial)) {
      return {
        success: false,
        error: `Cannot generate unique serial for ${formCode}. All serials exist.`,
        duplicateSerial: true,
      };
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

  // 6. Serialize and append
  const row = serializeRecordToRow(data);

  try {
    await appendRow(row);
    invalidateRowCache();
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 7. Audit log: log full initial state on create
    const allFields = Object.entries(data)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key]) => key);
    const newFieldValues: Record<string, unknown> = {};
    for (const key of allFields) {
      newFieldValues[key] = data[key];
    }
    appendAuditLog(serial, 'create', data._createdBy as string || 'unknown', allFields, {}, newFieldValues).catch(err => {
      console.error('[recordStorage] Audit log append failed (non-blocking):', err);
    });

    return { success: true, record: data };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'create', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

/**
 * Update an existing record.
 * 1. Fetch current record from Sheets (source of truth)
 * 2. Compare _lastModifiedAt for optimistic locking
 * 3. Pre-write validation on merged data
 * 4. Update row in Sheets
 * 5. Return updated record
 */
export async function updateRecord(
  serial: string,
  changes: RecordData,
  modificationReason?: string
): Promise<StorageResult> {
  const startTime = performance.now();

  // 1. Fetch current record
  const currentRecord = await getRecord(serial);
  if (!currentRecord) {
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode: '?', success: false, error: 'Record not found', durationMs: Math.round(performance.now() - startTime) });
    return { success: false, error: `Record ${serial} not found.`, conflict: false };
  }

  const formCode = String(currentRecord.formCode || '?');

  // 2. Optimistic locking — use _editCount as version number
  // _editCount is always present and monotonically increasing, making it a reliable version token
  const currentEditCount = Number(currentRecord._editCount) || 0;
  const clientEditCount = changes._editCount !== undefined ? Number(changes._editCount) : -1;

  // If the client sent an editCount that doesn't match current, someone else edited first
  if (clientEditCount >= 0 && clientEditCount !== currentEditCount) {
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: `Optimistic lock conflict: client=${clientEditCount}, current=${currentEditCount}`, conflict: true, durationMs: Math.round(performance.now() - startTime) });
    return {
      success: false,
      error: `Record ${serial} was modified by another user (version ${currentEditCount}, you had ${clientEditCount}). Please reload and try again.`,
      conflict: true,
    };
  }

  // 3. Merge current data with changes
  const merged: RecordData = {
    ...currentRecord,
    ...changes,
    // Identity fields are ALWAYS preserved
    serial: currentRecord.serial,
    formCode: currentRecord.formCode,
    formName: currentRecord.formName,
    _createdAt: currentRecord._createdAt,
    _createdBy: currentRecord._createdBy,
    // Bump edit tracking
    _lastModifiedAt: new Date().toISOString(),
    _lastModifiedBy: 'akh.dev185@gmail.com',
    _editCount: currentEditCount + 1,
    _modificationReason: modificationReason || null,
  };

  // 4. Pre-write validation
  const validation = preWriteValidation(currentRecord.formCode as string, merged, 'update', serial);
  if (!validation.valid || !validation.sanitizedData) {
    console.error('[recordStorage] Pre-write validation failed on update:', validation.errors);
    return {
      success: false,
      error: `Validation failed: ${validation.errors.map(e => `${e.field}: ${e.message}`).join('; ')}`,
    };
  }

  const validatedData = validation.sanitizedData;

  // 5. Find row number and update
  try {
    const rowIndex = await buildRowIndex();
    const rowNumber = rowIndex.get(serial);

    if (!rowNumber) {
      return { success: false, error: `Row for ${serial} not found in sheet.` };
    }

    // 5b. Double-check: re-fetch record right before writing to catch race conditions
    const recheckRecord = await getRecord(serial);
    if (recheckRecord) {
      const recheckEditCount = Number(recheckRecord._editCount) || 0;
      if (recheckEditCount !== currentEditCount) {
        logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: `Race condition: editCount changed ${currentEditCount}→${recheckEditCount} during edit`, conflict: true, durationMs: Math.round(performance.now() - startTime) });
        return {
          success: false,
          error: `Record ${serial} was modified by another user during your edit (version changed from ${currentEditCount} to ${recheckEditCount}). Please reload and try again.`,
          conflict: true,
        };
      }
    }

    const row = serializeRecordToRow(validatedData);
    await updateRow(rowNumber, row);
    invalidateRowCache();
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: true, durationMs: Math.round(performance.now() - startTime) });

    // 6. Audit log: log only changed fields
    const diff = computeDiff(currentRecord, validatedData);
    if (diff.changedFields.length > 0) {
      appendAuditLog(
        serial,
        'update',
        validatedData._lastModifiedBy as string || 'unknown',
        diff.changedFields,
        diff.previousValues,
        diff.newValues
      ).catch(err => {
        console.error('[recordStorage] Audit log append failed (non-blocking):', err);
      });
    }

    return { success: true, record: validatedData };
  } catch (err) {
    const errorMsg = err instanceof RecordStorageError ? err.message : `Unexpected error: ${(err as Error).message}`;
    logOperation({ timestamp: new Date().toISOString(), operation: 'update', serial, formCode, success: false, error: errorMsg, durationMs: Math.round(performance.now() - startTime) });
    if (err instanceof RecordStorageError) {
      return { success: false, error: err.message };
    }
    return { success: false, error: `Unexpected error: ${(err as Error).message}` };
  }
}

// ============================================================================
// Export cache invalidation for external use
// ============================================================================

export { invalidateRowCache };