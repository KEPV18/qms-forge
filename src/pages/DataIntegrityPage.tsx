// ============================================================================
// QMS Forge — Data Integrity Dashboard
// Phase 7B+7C: Non-blocking detection + progressive enforcement
// Shows missing references, dependency issues, serial gaps, and rule violations
// ============================================================================

import React from 'react';
import {
  Shield, AlertTriangle, CheckCircle, XCircle,
  ChevronRight, RefreshCw, Loader2, FileText,
  ArrowRight, Link2, Hash,
} from 'lucide-react';
import {
  useDataIntegrityReport,
  detectSerialGaps,
  getAllRules,
  getSeverityColor,
  getSeverityBg,
  getSeverityIcon,
  getRuleModeColor,
  type RuleSeverity,
  type IntegritySignal,
  type SerialGap,
  type MissingReference,
  type MissingDependency,
} from '../services/ruleEngine';
import { isoToDisplay } from '../schemas';

// ============================================================================
// Severity Badge
// ============================================================================

const SeverityBadge: React.FC<{ severity: RuleSeverity }> = ({ severity }) => {
  const colors: Record<RuleSeverity, string> = {
    clean: 'bg-green-500/20 text-green-400 border border-green-500/30',
    warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
  };
  const labels: Record<RuleSeverity, string> = {
    clean: 'Clean',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${colors[severity]}`}>
      {severity === 'clean' && <CheckCircle className="w-3 h-3" />}
      {severity === 'warning' && <AlertTriangle className="w-3 h-3" />}
      {severity === 'critical' && <XCircle className="w-3 h-3" />}
      {labels[severity]}
    </span>
  );
};

// ============================================================================
// Data Integrity Dashboard Page
// ============================================================================

const DataIntegrityPage: React.FC = () => {
  const {
    recordsWithIssues,
    serialGaps,
    missingReferences,
    missingDependencies,
    totalRecords,
    cleanRecords,
    warningRecords,
    criticalRecords,
    summary,
    isLoading,
    error,
    refetch,
  } = useDataIntegrityReport();

  const rules = getAllRules();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
        <p className="text-slate-400">Scanning data integrity...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="w-8 h-8 text-red-400 mb-4" />
        <p className="text-red-400">Failed to load integrity data</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-slate-700 rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">Data Integrity</h1>
            <p className="text-xs text-slate-500">
              Detection layer · All rules in WARN mode · No blocking enforcement
            </p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Rescan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-1">Total Records</p>
          <p className="text-2xl font-bold text-slate-100">{summary.total}</p>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
          <p className="text-xs text-green-500/70 mb-1">Clean</p>
          <p className="text-2xl font-bold text-green-400">{summary.clean}</p>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
          <p className="text-xs text-amber-500/70 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-amber-400">{summary.warning}</p>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
          <p className="text-xs text-red-500/70 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{summary.critical}</p>
        </div>
      </div>

      {/* Integrity Bar */}
      {summary.total > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
          <p className="text-xs text-slate-500 mb-2">Integrity Score</p>
          <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden flex">
            {summary.total > 0 && (
              <>
                <div
                  className="bg-green-500 transition-all"
                  style={{ width: `${(summary.clean / summary.total) * 100}%` }}
                />
                <div
                  className="bg-amber-500 transition-all"
                  style={{ width: `${(summary.warning / summary.total) * 100}%` }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(summary.critical / summary.total) * 100}%` }}
                />
              </>
            )}
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{Math.round((summary.clean / summary.total) * 100)}% clean</span>
            <span>{summary.serialGaps} gaps · {summary.missingRefs} missing refs · {summary.missingDeps} missing deps</span>
          </div>
        </div>
      )}

      {/* Serial Gaps */}
      {serialGaps.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Serial Gaps ({serialGaps.length})</h3>
          </div>
          <div className="space-y-2">
            {serialGaps.map((gap, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded">
                <span className="font-mono text-amber-300">{gap.formCode}</span>
                <span className="text-slate-500">Missing:</span>
                <span className="font-mono text-amber-400">{gap.expectedSerial}</span>
                <span className="text-slate-600">(between {gap.afterSerial} and {gap.beforeSerial})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing References */}
      {missingReferences.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Missing References ({missingReferences.length})</h3>
          </div>
          <div className="space-y-2">
            {missingReferences.map((ref, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded">
                <span className="font-mono text-indigo-400">{ref.fromSerial}</span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-slate-400">needs {ref.referencedFormCode}</span>
                <span className="text-slate-600">(field: {ref.fromField})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Missing Dependencies */}
      {missingDependencies.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Dependency Issues ({missingDependencies.length})</h3>
          </div>
          <div className="space-y-2">
            {missingDependencies.map((dep, i) => (
              <div key={i} className="flex items-center gap-2 text-xs px-3 py-2 bg-amber-500/5 border border-amber-500/20 rounded">
                <span className="font-mono text-indigo-400">{dep.forSerial}</span>
                <span className="text-slate-500">({dep.forFormCode})</span>
                <ArrowRight className="w-3 h-3 text-slate-600" />
                <span className="text-amber-300">missing {dep.expectedPattern}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Records with Issues */}
      {recordsWithIssues.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-200">Records with Issues ({recordsWithIssues.length})</h3>
          </div>
          <div className="space-y-3">
            {recordsWithIssues.map((report) => (
              <div key={report.recordSerial} className={`border rounded-lg p-3 ${getSeverityBg(report.overallSeverity)}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 text-sm">{report.recordSerial}</span>
                    <span className="text-xs text-slate-500">{report.formCode}</span>
                  </div>
                  <SeverityBadge severity={report.overallSeverity} />
                </div>
                <div className="space-y-1.5 ml-4">
                  {report.signals.map((signal, j) => (
                    <div key={j} className="flex items-start gap-2 text-xs">
                      <span className={getSeverityColor(signal.severity)}>
                        {getSeverityIcon(signal.severity)}
                      </span>
                      <div>
                        <span className="text-slate-300">{signal.message}</span>
                        {signal.details && (
                          <span className="text-slate-500 ml-1">— {signal.details}</span>
                        )}
                        <span className="text-slate-600 ml-1">({signal.ruleId})</span>
                      </div>
                    </div>
                  ))}
                  {report.missingReferences.map((ref, j) => (
                    <div key={`ref-${j}`} className="flex items-center gap-2 text-xs text-amber-300">
                      <Link2 className="w-3 h-3" />
                      <span>Missing {ref.referencedFormCode} reference (field: {ref.fromField})</span>
                    </div>
                  ))}
                  {report.missingDependencies.map((dep, j) => (
                    <div key={`dep-${j}`} className="flex items-center gap-2 text-xs text-amber-300">
                      <ArrowRight className="w-3 h-3" />
                      <span>Missing dependency: {dep.expectedPattern}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Issues */}
      {recordsWithIssues.length === 0 && serialGaps.length === 0 && (
        <div className="flex flex-col items-center py-12 text-slate-500">
          <CheckCircle className="w-12 h-12 mb-3 text-green-400/50" />
          <p className="text-lg font-medium text-slate-300">All Clear</p>
          <p className="text-xs">No integrity issues detected across {summary.total} records.</p>
        </div>
      )}

      {/* Rules Registry */}
      <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-200">Active Rules ({rules.length})</h3>
          <span className="text-xs text-slate-500 ml-2">All in WARN mode</span>
        </div>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded text-xs">
              <div className="flex items-center gap-2">
                <span className={`font-mono ${getRuleModeColor(rule.mode)}`}>[{rule.mode.toUpperCase()}]</span>
                <span className="text-slate-300">{rule.description}</span>
              </div>
              <span className="text-slate-600 font-mono">{rule.id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataIntegrityPage;