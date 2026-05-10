// ============================================================================
// Operational KPI Data — ISO 9001:2015 Clause 9.1 (Performance Evaluation)
// Type definitions and KPI status model for management review auto-queue.
// ============================================================================

export type KPIStatus = 'on_track' | 'warning' | 'critical';
export type KPICategory = 'quality' | 'delivery' | 'customer' | 'process' | 'financial';

export interface KPIEntry {
  id: string;
  name: string;
  category: KPICategory;
  currentValue: number;
  targetValue: number;
  unit: string;
  status: KPIStatus;
  measuredAt: string; // ISO timestamp
  reportMonth: string; // YYYY-MM format
}

/**
 * Determine KPI status from current vs target values.
 * Business rules:
 * - >= 100% target → on_track
 * - >= 80% target  → warning
 * - < 80% target   → critical
 */
export function computeKPIStatus(current: number, target: number): KPIStatus {
  if (target === 0) return 'on_track';
  const ratio = current / target;
  if (ratio >= 1.0) return 'on_track';
  if (ratio >= 0.8) return 'warning';
  return 'critical';
}

/**
 * Check if any KPI in a list has critical status.
 * Used by useManagementReviewQueue to trigger F/21 draft generation.
 */
export function hasCriticalKPI(kpis: KPIEntry[]): boolean {
  return kpis.some(k => k.status === 'critical');
}

/**
 * Get all critical KPIs from a list.
 */
export function getCriticalKPIs(kpis: KPIEntry[]): KPIEntry[] {
  return kpis.filter(k => k.status === 'critical');
}