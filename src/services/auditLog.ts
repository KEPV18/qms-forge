// ============================================================================
// QMS Forge — Audit Log Service
// Phase 7A: Full traceability for every create/update operation
//
// Storage: Google Sheets "ForgeAuditLog" (append-only)
// Format: id, timestamp, serial, action, user, changedFields, previousValues, newValues
// ============================================================================

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID;
const SHEET_NAME = 'ForgeAuditLog';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  serial: string;
  action: 'create' | 'update';
  user: string;
  changedFields: string;      // JSON array of changed field names
  previousValues: string;      // JSON object of previous values
  newValues: string;           // JSON object of new values
}

export interface AuditLogDiff {
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

// ─── Token Management ───────────────────────────────────────────────────────

async function getAccessTokenOrThrow(): Promise<string> {
  const tokenUrl = '/api/token';
  const response = await fetch(tokenUrl);

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('No access token in response');
  }

  return data.access_token;
}

// ─── Generate Audit ID ─────────────────────────────────────────────────────

function generateAuditId(): string {
  const now = new Date();
  const date = now.toISOString().substring(0, 10).replace(/-/g, '');
  const time = now.toISOString().substring(11, 19).replace(/:/g, '');
  const random = Math.random().toString(36).substring(2, 6);
  return `AUD-${date}-${time}-${random}`;
}

// ─── Compute Diff ───────────────────────────────────────────────────────────

/**
 * Compute the diff between previous and current record data.
 * Returns only fields that changed, with their previous and new values.
 * Excludes metadata fields from the diff (they're tracked separately in ForgeRecords).
 */
export function computeDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): AuditLogDiff {
  const METADATA_KEYS = new Set([
    'serial', 'formCode', 'formName',
    '_createdAt', '_createdBy',
    '_lastModifiedAt', '_lastModifiedBy',
    '_editCount', '_modificationReason',
    '_creationReason', '_businessEvent',
  ]);

  const changedFields: string[] = [];
  const previousValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  // Check all keys in both objects
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of allKeys) {
    if (METADATA_KEYS.has(key)) continue; // Skip metadata fields

    const prevVal = previous[key];
    const currVal = current[key];

    // Compare as JSON strings for deep comparison (handles objects/arrays)
    const prevStr = JSON.stringify(prevVal ?? null);
    const currStr = JSON.stringify(currVal ?? null);

    if (prevStr !== currStr) {
      changedFields.push(key);
      previousValues[key] = prevVal ?? null;
      newValues[key] = currVal ?? null;
    }
  }

  return { changedFields, previousValues, newValues };
}

// ─── Append Audit Log Entry ─────────────────────────────────────────────────

/**
 * Append an audit log entry to the ForgeAuditLog sheet.
 * This is append-only — never edit or delete log entries.
 */
export async function appendAuditLog(
  serial: string,
  action: 'create' | 'update',
  user: string,
  changedFields: string[],
  previousValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): Promise<{ success: boolean; id: string }> {
  const id = generateAuditId();
  const token = await getAccessTokenOrThrow();

  const row: string[] = [
    id,
    new Date().toISOString(),
    serial,
    action,
    user,
    JSON.stringify(changedFields),
    JSON.stringify(previousValues),
    JSON.stringify(newValues),
  ];

  const range = `'${SHEET_NAME}'!A:H`;

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
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
      const errorData = await response.json().catch(() => ({}));
      console.error('[auditLog] Failed to append audit log:', response.status, errorData);
      return { success: false, id };
    }

    console.log(`[auditLog] ${action} logged for ${serial} (id=${id})`);
    return { success: true, id };
  } catch (err) {
    console.error('[auditLog] Error appending audit log:', err);
    return { success: false, id };
  }
}

// ─── Read Audit Log ─────────────────────────────────────────────────────────

export interface AuditLogReadEntry {
  id: string;
  timestamp: string;
  serial: string;
  action: 'create' | 'update';
  user: string;
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  _raw: {
    changedFields: string;
    previousValues: string;
    newValues: string;
  };
}

/**
 * Read all audit log entries for a specific serial.
 * Returns entries in chronological order (oldest first).
 */
export async function getAuditLogForSerial(serial: string): Promise<AuditLogReadEntry[]> {
  const token = await getAccessTokenOrThrow();
  const range = `'${SHEET_NAME}'!A:H`;

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      console.error('[auditLog] Failed to read audit log:', response.status);
      return [];
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row, filter by serial
    const entries: AuditLogReadEntry[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 8) continue;

      const rowSerial = row[2] || '';
      if (rowSerial !== serial) continue;

      let changedFields: string[] = [];
      let previousValues: Record<string, unknown> = {};
      let newValues: Record<string, unknown> = {};

      try {
        changedFields = JSON.parse(row[5] || '[]');
      } catch { /* keep empty */ }

      try {
        previousValues = JSON.parse(row[6] || '{}');
      } catch { /* keep empty */ }

      try {
        newValues = JSON.parse(row[7] || '{}');
      } catch { /* keep empty */ }

      entries.push({
        id: row[0] || '',
        timestamp: row[1] || '',
        serial: rowSerial,
        action: (row[3] === 'create' ? 'create' : 'update') as 'create' | 'update',
        user: row[4] || '',
        changedFields,
        previousValues,
        newValues,
        _raw: {
          changedFields: row[5] || '[]',
          previousValues: row[6] || '{}',
          newValues: row[7] || '{}',
        },
      });
    }

    // Sort chronologically (oldest first)
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return entries;
  } catch (err) {
    console.error('[auditLog] Error reading audit log:', err);
    return [];
  }
}

/**
 * Read all audit log entries (for admin/debugging).
 */
export async function getAllAuditLogs(limit = 100): Promise<AuditLogReadEntry[]> {
  const token = await getAccessTokenOrThrow();
  const range = `'${SHEET_NAME}'!A:H`;

  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      console.error('[auditLog] Failed to read audit log:', response.status);
      return [];
    }

    const data = await response.json();
    const rows = data.values || [];

    const entries: AuditLogReadEntry[] = [];
    for (let i = 1; i < rows.length && entries.length < limit; i++) {
      const row = rows[i];
      if (!row || row.length < 8) continue;

      let changedFields: string[] = [];
      let previousValues: Record<string, unknown> = {};
      let newValues: Record<string, unknown> = {};

      try { changedFields = JSON.parse(row[5] || '[]'); } catch { /* empty */ }
      try { previousValues = JSON.parse(row[6] || '{}'); } catch { /* empty */ }
      try { newValues = JSON.parse(row[7] || '{}'); } catch { /* empty */ }

      entries.push({
        id: row[0] || '',
        timestamp: row[1] || '',
        serial: row[2] || '',
        action: (row[3] === 'create' ? 'create' : 'update') as 'create' | 'update',
        user: row[4] || '',
        changedFields,
        previousValues,
        newValues,
        _raw: {
          changedFields: row[5] || '[]',
          previousValues: row[6] || '{}',
          newValues: row[7] || '{}',
        },
      });
    }

    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first
    return entries;
  } catch (err) {
    console.error('[auditLog] Error reading audit log:', err);
    return [];
  }
}