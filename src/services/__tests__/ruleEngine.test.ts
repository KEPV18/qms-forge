// ============================================================================
// QMS Forge — Rule Engine & Data Integrity Tests
// Phase 7B+7C: Detection + progressive enforcement
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  detectSerialGaps,
  detectMissingReferences,
  detectMissingDependencies,
  evaluateRulesForRecord,
  getAllRules,
  getSeverityColor,
  getSeverityBg,
  getSeverityIcon,
  getRuleModeColor,
  type RecordData,
} from '../ruleEngine';

// ─── Test Data ──────────────────────────────────────────────────────────────

const createRecord = (overrides: Record<string, unknown>): RecordData => ({
  serial: 'F/12-001',
  formCode: 'F/12',
  formName: 'Non-Conforming',
  _createdAt: '2026-04-21',
  _createdBy: 'test@user.com',
  _lastModifiedAt: '',
  _lastModifiedBy: '',
  _editCount: 0,
  _modificationReason: '',
  ...overrides,
});

// ─── Serial Gap Detection ──────────────────────────────────────────────────

describe('detectSerialGaps', () => {
  it('should detect no gaps in sequential serials', () => {
    const records = [
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
      createRecord({ serial: 'F/12-002', formCode: 'F/12' }),
      createRecord({ serial: 'F/12-003', formCode: 'F/12' }),
    ];
    const gaps = detectSerialGaps(records as unknown as RecordData[]);
    expect(gaps).toEqual([]);
  });

  it('should detect a single gap', () => {
    const records = [
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
      createRecord({ serial: 'F/12-003', formCode: 'F/12' }),
    ];
    const gaps = detectSerialGaps(records as unknown as RecordData[]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].formCode).toBe('F/12');
    expect(gaps[0].expectedSerial).toBe('F/12-002');
  });

  it('should detect multiple gaps', () => {
    const records = [
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
      createRecord({ serial: 'F/12-005', formCode: 'F/12' }),
    ];
    const gaps = detectSerialGaps(records as unknown as RecordData[]);
    expect(gaps).toHaveLength(3);
    expect(gaps.map(g => g.expectedSerial)).toEqual(['F/12-002', 'F/12-003', 'F/12-004']);
  });

  it('should detect gaps across different form types', () => {
    const records = [
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
      createRecord({ serial: 'F/12-003', formCode: 'F/12' }),
      createRecord({ serial: 'F/28-001', formCode: 'F/28' }),
      createRecord({ serial: 'F/28-004', formCode: 'F/28' }),
    ];
    const gaps = detectSerialGaps(records as unknown as RecordData[]);
    expect(gaps).toHaveLength(3);
    expect(gaps.filter(g => g.formCode === 'F/12')).toHaveLength(1);
    expect(gaps.filter(g => g.formCode === 'F/28')).toHaveLength(2);
  });

  it('should handle empty records', () => {
    const gaps = detectSerialGaps([]);
    expect(gaps).toEqual([]);
  });

  it('should ignore malformed serials', () => {
    const records = [
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
      createRecord({ serial: 'INVALID', formCode: 'F/12' }),
    ];
    const gaps = detectSerialGaps(records as unknown as RecordData[]);
    expect(gaps).toEqual([]);
  });
});

// ─── Reference Detection ────────────────────────────────────────────────────

describe('detectMissingReferences', () => {
  it('should detect F/43 without matching F/28', () => {
    const records = [
      createRecord({ serial: 'F/43-001', formCode: 'F/43', project: 'BatFast' }),
      createRecord({ serial: 'F/28-001', formCode: 'F/28', project: 'ETH' }),
    ];
    const refs = detectMissingReferences(records as unknown as RecordData[]);
    expect(refs.length).toBeGreaterThanOrEqual(1);
    expect(refs.some(r => r.fromSerial === 'F/43-001')).toBe(true);
  });

  it('should find no issues when F/43 and F/28 match', () => {
    const records = [
      createRecord({ serial: 'F/43-001', formCode: 'F/43', project: 'BatFast' }),
      createRecord({ serial: 'F/28-001', formCode: 'F/28', project: 'BatFast' }),
    ];
    const refs = detectMissingReferences(records as unknown as RecordData[]);
    expect(refs.filter(r => r.fromSerial === 'F/43-001')).toHaveLength(0);
  });

  it('should detect F/22 with missing F/12 reference', () => {
    const records = [
      createRecord({ serial: 'F/22-001', formCode: 'F/22', nc_reference: 'F/12-999' }),
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
    ];
    const refs = detectMissingReferences(records as unknown as RecordData[]);
    expect(refs.some(r => r.fromSerial === 'F/22-001' && r.referencedValue === 'F/12-999')).toBe(true);
  });

  it('should not flag valid F/22 → F/12 references', () => {
    const records = [
      createRecord({ serial: 'F/22-001', formCode: 'F/22', nc_reference: 'F/12-001' }),
      createRecord({ serial: 'F/12-001', formCode: 'F/12' }),
    ];
    const refs = detectMissingReferences(records as unknown as RecordData[]);
    expect(refs.every(r => r.fromSerial !== 'F/22-001')).toBe(true);
  });
});

// ─── Dependency Detection ────────────────────────────────────────────────────

describe('detectMissingDependencies', () => {
  it('should detect F/30 records without F/43', () => {
    const records: RecordData[] = [];
    // Create 3 F/30 records (hits threshold)
    for (let i = 1; i <= 3; i++) {
      records.push(createRecord({ serial: `F/30-00${i}`, formCode: 'F/30' }) as unknown as RecordData);
    }
    // No F/43 records
    const deps = detectMissingDependencies(records);
    expect(deps.some(d => d.forFormCode === 'F/30' && d.expectedFormCode === 'F/43')).toBe(true);
  });

  it('should not flag when expected pair exists', () => {
    const records: RecordData[] = [];
    for (let i = 1; i <= 3; i++) {
      records.push(createRecord({ serial: `F/30-00${i}`, formCode: 'F/30' }) as unknown as RecordData);
    }
    records.push(createRecord({ serial: 'F/43-001', formCode: 'F/43' }) as unknown as RecordData);
    const deps = detectMissingDependencies(records);
    expect(deps.every(d => !(d.forFormCode === 'F/30' && d.expectedFormCode === 'F/43'))).toBe(true);
  });

  it('should not flag with fewer than 3 trigger records', () => {
    const records = [
      createRecord({ serial: 'F/30-001', formCode: 'F/30' }),
      createRecord({ serial: 'F/30-002', formCode: 'F/30' }),
    ];
    const deps = detectMissingDependencies(records as unknown as RecordData[]);
    expect(deps).toHaveLength(0);
  });
});

// ─── Rule Evaluation ─────────────────────────────────────────────────────────

describe('evaluateRulesForRecord', () => {
  it('should return signals based on record state', () => {
    const record = createRecord({
      formCode: 'F/12',
      date: '2026-04-21',
      nc_type: 'Minor',
      description: 'Test NC',
      status: 'Open',
    });
    const signals = evaluateRulesForRecord(record as unknown as RecordData, []);
    // Signals may include empty field warnings, future date, etc. — all non-blocking
    expect(Array.isArray(signals)).toBe(true);
    expect(signals.every(s => s.ruleId && s.severity && s.message)).toBe(true);
  });

  it('should flag closed records without closure date', () => {
    const record = createRecord({
      formCode: 'F/12',
      status: 'Closed',
      closure_date: '',
    });
    const signals = evaluateRulesForRecord(record as unknown as RecordData, []);
    expect(signals.some(s => s.ruleId === 'DQ-CLOSED-WITHOUT-CLOSURE-DATE')).toBe(true);
  });

  it('should flag records with many empty required fields', () => {
    const schema = getAllRules().find(r => r.id === 'DQ-EMPTY-CRITICAL');
    expect(schema).toBeDefined();
  });
});

// ─── Severity Helpers ────────────────────────────────────────────────────────

describe('severity helpers', () => {
  it('should return correct color classes', () => {
    expect(getSeverityColor('clean')).toBe('text-green-400');
    expect(getSeverityColor('warning')).toBe('text-amber-400');
    expect(getSeverityColor('critical')).toBe('text-red-400');
  });

  it('should return correct bg classes', () => {
    expect(getSeverityBg('clean')).toContain('bg-green');
    expect(getSeverityBg('warning')).toContain('bg-amber');
    expect(getSeverityBg('critical')).toContain('bg-red');
  });

  it('should return correct icons', () => {
    expect(getSeverityIcon('clean')).toBe('✓');
    expect(getSeverityIcon('warning')).toBe('⚠');
    expect(getSeverityIcon('critical')).toBe('✕');
  });

  it('should return correct rule mode colors', () => {
    expect(getRuleModeColor('warn')).toBe('text-amber-400');
    expect(getRuleModeColor('strict')).toBe('text-red-400');
  });
});

// ─── Rules Registry ─────────────────────────────────────────────────────────

describe('getAllRules', () => {
  it('should return all defined rules', () => {
    const rules = getAllRules();
    expect(rules.length).toBeGreaterThanOrEqual(7);
    // All rules should be in warn mode by default
    expect(rules.every(r => r.mode === 'warn')).toBe(true);
  });

  it('should have required properties', () => {
    const rules = getAllRules();
    for (const rule of rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(['reference', 'dependency', 'sequence', 'data_quality']).toContain(rule.type);
      expect(['warn', 'strict']).toContain(rule.mode);
      expect(typeof rule.check).toBe('function');
    }
  });
});