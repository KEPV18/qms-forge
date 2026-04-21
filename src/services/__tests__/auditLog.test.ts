// ============================================================================
// QMS Forge — Audit Log Service Tests
// ============================================================================

import { describe, it, expect } from 'vitest';
import { computeDiff } from '../auditLog';

describe('auditLog', () => {
  describe('computeDiff', () => {
    it('should detect no changes between identical records', () => {
      const prev = { name: 'Test', status: 'Open', date: '2026-01-01' };
      const curr = { name: 'Test', status: 'Open', date: '2026-01-01' };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields).toEqual([]);
      expect(diff.previousValues).toEqual({});
      expect(diff.newValues).toEqual({});
    });

    it('should detect a single field change', () => {
      const prev = { name: 'Test', status: 'Open' };
      const curr = { name: 'Test', status: 'Closed' };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields).toEqual(['status']);
      expect(diff.previousValues).toEqual({ status: 'Open' });
      expect(diff.newValues).toEqual({ status: 'Closed' });
    });

    it('should detect multiple field changes', () => {
      const prev = { name: 'Old', status: 'Open', date: '2026-01-01' };
      const curr = { name: 'New', status: 'Closed', date: '2026-02-01' };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields.sort()).toEqual(['date', 'name', 'status']);
      expect(diff.previousValues).toEqual({ name: 'Old', status: 'Open', date: '2026-01-01' });
      expect(diff.newValues).toEqual({ name: 'New', status: 'Closed', date: '2026-02-01' });
    });

    it('should detect new fields added in current', () => {
      const prev = { name: 'Test' };
      const curr = { name: 'Test', status: 'Open' };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields).toEqual(['status']);
      expect(diff.previousValues).toEqual({ status: null });
      expect(diff.newValues).toEqual({ status: 'Open' });
    });

    it('should detect fields removed in current', () => {
      const prev = { name: 'Test', status: 'Open' };
      const curr = { name: 'Test' };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields).toEqual(['status']);
      expect(diff.previousValues).toEqual({ status: 'Open' });
      expect(diff.newValues).toEqual({ status: null });
    });

    it('should exclude metadata fields from diff', () => {
      const prev = {
        name: 'Test',
        status: 'Open',
        serial: 'F/12-001',
        formCode: 'F/12',
        formName: 'Non-Conforming',
        _createdAt: '2026-04-20',
        _createdBy: 'user@test.com',
        _lastModifiedAt: '2026-04-20',
        _lastModifiedBy: 'user@test.com',
        _editCount: 0,
        _modificationReason: '',
      };
      const curr = {
        name: 'Test',
        status: 'Closed',
        serial: 'F/12-001',
        formCode: 'F/12',
        formName: 'Non-Conforming',
        _createdAt: '2026-04-20',
        _createdBy: 'user@test.com',
        _lastModifiedAt: '2026-04-21',
        _lastModifiedBy: 'other@test.com',
        _editCount: 1,
        _modificationReason: 'Status update',
      };
      const diff = computeDiff(prev, curr);
      // Only 'status' changed in non-metadata fields
      expect(diff.changedFields).toEqual(['status']);
      expect(diff.previousValues).toEqual({ status: 'Open' });
      expect(diff.newValues).toEqual({ status: 'Closed' });
    });

    it('should handle empty objects', () => {
      const diff = computeDiff({}, {});
      expect(diff.changedFields).toEqual([]);
      expect(diff.previousValues).toEqual({});
      expect(diff.newValues).toEqual({});
    });

    it('should handle all fields changed from empty to values', () => {
      const prev = {};
      const curr = { name: 'New Record', status: 'Open', date: '2026-04-21' };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields.sort()).toEqual(['date', 'name', 'status']);
    });

    it('should handle deep comparison via JSON stringify', () => {
      const prev = { tags: ['a', 'b'] };
      const curr = { tags: ['a', 'c'] };
      const diff = computeDiff(prev, curr);
      expect(diff.changedFields).toEqual(['tags']);
      expect(diff.previousValues).toEqual({ tags: ['a', 'b'] });
      expect(diff.newValues).toEqual({ tags: ['a', 'c'] });
    });

    it('should treat undefined and null equivalently', () => {
      // When a key exists in prev but not in curr (or is undefined),
      // JSON.stringify(prev[key]) and JSON.stringify(curr[key]) both produce same result
      const prev = { name: 'Test' };
      const curr = { name: 'Test', value: undefined };
      const diff = computeDiff(prev, curr);
      // undefined is serialized as null (via ?? null), prev[key] is also null (missing)
      // So no actual change detected for 'value' — both are null
      expect(diff.changedFields).toEqual([]);
    });
  });
});