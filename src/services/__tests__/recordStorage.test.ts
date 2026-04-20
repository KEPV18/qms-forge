// ============================================================================
// QMS Forge — Unit Tests for Record Storage & Pre-Write Validation
// Tests: Zod validation, serial generation, duplicate detection, serialization
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================================
// Pre-Write Validation Tests
// ============================================================================

import { preWriteValidation, serializeRecordToRow, parseRowToRecord, getValidationLog } from '../preWriteValidation';
import { validateFormData, FORM_ZOD_SCHEMAS } from '../../schemas/formValidation';
import { generateSerial, isSerialUnique, checkPreCreationGate, getNextSerial, registerSerials } from '../../schemas/serialAndDate';

// Helper: valid F/12 data template (matches F12Schema exactly)
const validF12 = () => ({
  serial: 'auto' as const,
  date: '2026-04-20',
  project_name: 'ETH AI Model Testing',
  nc_type: 'Major' as const,
  description: 'Agent failed accuracy check threshold',
  root_cause: 'Insufficient training on edge cases',
  corrective_action: 'Retraining session scheduled',
  status: 'Open' as const,
  reported_by: 'Ahmed Khaled',
});

// Helper: valid F/11 data template (matches F11Schema)
const validF11 = () => ({
  serial: 'auto' as const,
  date: '2026-04-20',
  month: 'April' as const,
  year: 2026,
  projects: [
    { name: 'BatFast', client: 'BatFast', status: 'Active', notes: 'Annotation work' },
  ],
  prepared_by: 'Ahmed Khaled',
  approved_by: 'Ahmed Khaled',
});

describe('preWriteValidation', () => {
  describe('valid data', () => {
    it('should pass validation for a valid F/12 record', () => {
      const result = preWriteValidation('F/12', validF12(), 'create');
      if (!result.valid) {
        console.log('F/12 PreWrite errors:', JSON.stringify(result.errors, null, 2));
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedData).toBeDefined();
    });

    it('should pass validation for a valid F/11 record with table field', () => {
      const result = preWriteValidation('F/11', validF11(), 'create');
      if (!result.valid) {
        console.log('F/11 PreWrite errors:', JSON.stringify(result.errors, null, 2));
      }
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid data', () => {
    it('should reject data missing required fields', () => {
      const data = {
        date: '2026-04-20',
        // missing nc_type, description, corrective_action, status, reported_by
      };

      const result = preWriteValidation('F/12', data, 'create');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject data with invalid enum values', () => {
      const data = {
        ...validF12(),
        nc_type: 'SuperCritical',  // Invalid — should be Major/Minor/Critical (enum)
      };

      const result = preWriteValidation('F/12', data, 'create');
      expect(result.valid).toBe(false);
    });

    it('should accept DD/MM/YYYY dates (normalizes to ISO before validation)', () => {
      const data = {
        ...validF12(),
        date: '20/04/2026',  // DD/MM/YYYY — preWrite normalizes to YYYY-MM-DD
      };

      const result = preWriteValidation('F/12', data, 'create');
      expect(result.valid).toBe(true);
      // The normalized date should be stored as YYYY-MM-DD
      expect(result.sanitizedData?.date).toBe('2026-04-20');
    });

    it('should reject truly invalid date format', () => {
      const data = {
        ...validF12(),
        date: 'not-a-date',  // Neither ISO nor DD/MM/YYYY
      };

      const result = preWriteValidation('F/12', data, 'create');
      expect(result.valid).toBe(false);
    });

    it('should reject data for unknown form code', () => {
      const data = { date: '2026-04-20' };
      const result = preWriteValidation('F/99', data, 'create');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('custom');
    });

    it('should require serial for update operation', () => {
      const data = validF12();
      // Pass undefined serial — update requires a real serial
      const result = preWriteValidation('F/12', data, 'update', undefined);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'serial')).toBe(true);
    });
  });

  describe('auto-fill metadata', () => {
    it('should auto-fill _createdAt if missing on create', () => {
      const result = preWriteValidation('F/12', validF12(), 'create');
      expect(result.valid).toBe(true);
      if (result.sanitizedData) {
        expect(result.sanitizedData._createdAt).toBeDefined();
      }
    });

    it('should auto-fill _createdBy if missing on create', () => {
      const result = preWriteValidation('F/12', validF12(), 'create');
      expect(result.valid).toBe(true);
      if (result.sanitizedData) {
        expect(result.sanitizedData._createdBy).toBe('akh.dev185@gmail.com');
      }
    });
  });

  describe('validation log', () => {
    it('should log failed validations for debugging', () => {
      const data = { date: '' }; // Will fail — missing required fields
      preWriteValidation('F/12', data, 'create');
      const log = getValidationLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[log.length - 1].formCode).toBe('F/12');
      expect(log[log.length - 1].operation).toBe('create');
    });
  });
});

// ============================================================================
// Serialization Tests
// ============================================================================

describe('serializeRecordToRow / parseRowToRecord', () => {
  it('should serialize and parse back correctly', () => {
    const data: Record<string, unknown> = {
      serial: 'F/12-001',
      formCode: 'F/12',
      formName: 'Non-Conforming Report',
      _createdAt: '2026-04-20T10:00:00Z',
      _createdBy: 'test@example.com',
      _lastModifiedAt: '',
      _lastModifiedBy: '',
      _editCount: 0,
      _modificationReason: '',
      date: '2026-04-20',
      project_name: 'ETH',
      nc_type: 'Major',
      description: 'Test NC',
      status: 'Open',
    };

    const row = serializeRecordToRow(data);
    expect(row).toHaveLength(10);
    expect(row[0]).toBe('F/12-001'); // serial
    expect(row[1]).toBe('F/12');      // formCode
    expect(row[9]).toContain('"project_name":"ETH"'); // formData JSON

    const parsed = parseRowToRecord(row);
    expect(parsed).not.toBeNull();
    expect(parsed!.serial).toBe('F/12-001');
    expect(parsed!.formCode).toBe('F/12');
    expect(parsed!.project_name).toBe('ETH');
    expect(parsed!.nc_type).toBe('Major');
  });

  it('should handle null/empty row gracefully', () => {
    expect(parseRowToRecord(null as any)).toBeNull();
    expect(parseRowToRecord([] as any)).toBeNull();
  });

  it('should handle malformed JSON in formData', () => {
    const row = ['F/12-001', 'F/12', 'NC Report', '2026-04-20', 'test@example.com', '', '', '0', '', 'NOT VALID JSON'];
    const parsed = parseRowToRecord(row);
    // Should still return record, just with empty formData
    expect(parsed).not.toBeNull();
    expect(parsed!.serial).toBe('F/12-001');
  });

  it('should preserve metadata fields during serialization', () => {
    const data: Record<string, unknown> = {
      serial: 'F/43-001',
      formCode: 'F/43',
      formName: 'Employee Qualification',
      _createdAt: '2026-04-20T10:00:00Z',
      _createdBy: 'test@example.com',
      _lastModifiedAt: '2026-04-21T12:00:00Z',
      _lastModifiedBy: 'other@example.com',
      _editCount: 2,
      _modificationReason: 'Corrected department name',
      employee_name: 'Test Employee',
    };

    const row = serializeRecordToRow(data);
    expect(row[0]).toBe('F/43-001');
    expect(row[5]).toBe('2026-04-21T12:00:00Z');
    expect(row[6]).toBe('other@example.com');
    expect(row[7]).toBe('2');
    expect(row[8]).toBe('Corrected department name');
  });
});

// ============================================================================
// Serial Generation Tests
// ============================================================================

describe('serial generation', () => {
  beforeEach(() => {
    // Clear cache before each test
    registerSerials('F/12', []);
    registerSerials('F/43', []);
  });

  describe('generateSerial', () => {
    it('should generate F/12-001 for empty existing serials', () => {
      expect(generateSerial('F/12', [])).toBe('F/12-001');
    });

    it('should increment from highest existing serial', () => {
      expect(generateSerial('F/12', ['F/12-001', 'F/12-002'])).toBe('F/12-003');
    });

    it('should handle gaps in serial numbers', () => {
      expect(generateSerial('F/12', ['F/12-001', 'F/12-003'])).toBe('F/12-004');
    });

    it('should handle different form codes', () => {
      expect(generateSerial('F/43', ['F/43-039', 'F/43-040'])).toBe('F/43-041');
    });
  });

  describe('isSerialUnique', () => {
    it('should return true for unique serial with empty cache', () => {
      registerSerials('F/12', []);
      expect(isSerialUnique('F/12', 'F/12-001')).toBe(true);
    });

    it('should return false for existing serial', () => {
      registerSerials('F/12', ['F/12-001', 'F/12-002']);
      expect(isSerialUnique('F/12', 'F/12-001')).toBe(false);
    });
  });

  describe('getNextSerial', () => {
    it('should start from 001 when cache is empty', () => {
      registerSerials('F/50', []);
      expect(getNextSerial('F/50')).toBe('F/50-001');
    });

    it('should increment from cached serials', () => {
      registerSerials('F/12', ['F/12-001', 'F/12-002']);
      expect(getNextSerial('F/12')).toBe('F/12-003');
    });
  });
});

// ============================================================================
// Pre-Creation Gate Tests
// ============================================================================

describe('Pre-Creation Gate', () => {
  it('should pass with valid answers', () => {
    const result = checkPreCreationGate('F/12', 'On event', {
      needReason: 'New non-conformance detected in project',
      businessEvent: 'Quality audit finding',
      frequencyConfirmed: true,
    });
    expect(result.pass).toBe(true);
  });

  it('should fail with short need reason', () => {
    const result = checkPreCreationGate('F/12', 'On event', {
      needReason: 'Short',
      businessEvent: 'Quality audit',
      frequencyConfirmed: true,
    });
    expect(result.pass).toBe(false);
    expect(result.reasons!.length).toBeGreaterThan(0);
  });

  it('should fail when frequency not confirmed', () => {
    const result = checkPreCreationGate('F/12', 'On event', {
      needReason: 'New non-conformance detected during review',
      businessEvent: 'Quality finding',
      frequencyConfirmed: false,
    });
    expect(result.pass).toBe(false);
  });
});

// ============================================================================
// Zod Form Schema Coverage Tests
// ============================================================================

describe('Zod form schemas', () => {
  it('should have schemas for all 35 forms', () => {
    expect(Object.keys(FORM_ZOD_SCHEMAS).length).toBe(35);
  });

  it('should validate a complete F/12 record', () => {
    const data = validF12();
    const result = validateFormData('F/12', data);
    if (!result.success) {
      console.log('F/12 Zod errors:', JSON.stringify(result.errors, null, 2));
    }
    expect(result.success).toBe(true);
  });

  it('should reject empty required fields', () => {
    const data = {
      date: '',
      project_name: '',
    };

    const result = validateFormData('F/12', data);
    expect(result.success).toBe(false);
  });
});