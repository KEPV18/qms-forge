// ============================================================================
// QMS Forge — Record List Page (Phase 8 Enhanced)
// Read-only list of all records with filtering, pagination, selection,
// batch export, and improved visual design.
// Real Google Sheets data via useRecords() hook.
// ============================================================================

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, AlertTriangle, Eye, ChevronRight, Loader2,
  RefreshCw, Shield, CheckCircle, Download, FileJson, FileSpreadsheet,
  FileText as FileTextIcon, ChevronLeft, ChevronRight as ChevronRightIcon,
  CheckSquare, Square, XCircle,
} from 'lucide-react';
import { FORM_SCHEMAS } from '../data/formSchemas';
import { isoToDisplay } from '../schemas';
import { useRecords } from '../hooks/useRecordStorage';
import { evaluateRulesForRecord, getSeverityColor as getIntSeverityColor, type RuleSeverity, type RecordData } from '../services/ruleEngine';
import { getEditRiskLevel, type QMSRecord } from '../data/mockRecords';
import { exportRecordsToDocx } from '../services/docxExport';
import { exportRecordsToJson, exportRecordsToCsv } from '../services/fileExport';
import { toast } from 'sonner';

// ============================================================================
// Constants
// ============================================================================

const PAGE_SIZE = 15;

const STATUS_COLORS: Record<string, string> = {
  'Open': 'bg-red-500/20 text-red-400 border border-red-500/30',
  'In Progress': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Closed': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Verified': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Active': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'Completed': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'On Hold': 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  'Achieved': 'bg-green-500/20 text-green-400 border border-green-500/30',
  'On Track': 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  'Planned': 'bg-slate-500/20 text-slate-400 border border-slate-500/30',
};

const RISK_COLORS: Record<string, string> = {
  'none': '',
  'low': 'text-slate-400',
  'medium': 'text-amber-400',
  'high': 'text-red-400',
};

// ============================================================================
// Record List Page
// ============================================================================

const RecordListPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'serial' | 'date' | 'edited'>('serial');
  const [page, setPage] = useState(1);
  const [selectedSerials, setSelectedSerials] = useState<Set<string>>(new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // ✅ Real data from Google Sheets
  const { data: records, isLoading, error, refetch } = useRecords();
  const activeFormCodes = [...new Set(records?.map(r => r.formCode as string) || [])].sort();

  const formNames: Record<string, string> = {};
  FORM_SCHEMAS.forEach(f => { formNames[f.code] = f.name; });

  // Integrity signals — memoized per record
  const integrityCache = useMemo(() => {
    const cache = new Map<string, RuleSeverity>();
    if (!records) return cache;
    for (const record of records) {
      const serial = record.serial as string;
      const signals = evaluateRulesForRecord(record as unknown as RecordData, records as unknown as RecordData[]);
      const sev: RuleSeverity = signals.length === 0 ? 'clean' : signals.some(s => s.severity === 'critical') ? 'critical' : 'warning';
      cache.set(serial, sev);
    }
    return cache;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!records) return [];

    let list = [...records];

    // Filter by form code
    if (formFilter !== 'all') {
      list = list.filter(r => r.formCode === formFilter);
    }

    // Search by serial or content
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        (r.serial as string).toLowerCase().includes(q) ||
        (r.formName as string).toLowerCase().includes(q) ||
        Object.values(r).some(v => typeof v === 'string' && v.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'serial':
          return (a.serial as string).localeCompare(b.serial as string);
        case 'date':
          return ((a._createdAt as string) || '').localeCompare((b._createdAt as string) || '');
        case 'edited': {
          const ae = (a._editCount as number) || 0;
          const be = (b._editCount as number) || 0;
          return be - ae;
        }
        default:
          return 0;
      }
    });

    return list;
  }, [records, formFilter, search, sortBy]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedRecords = filteredRecords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset page when filter/search changes
  const handleSearchChange = (val: string) => { setSearch(val); setPage(1); setSelectedSerials(new Set()); };
  const handleFilterChange = (val: string) => { setFormFilter(val); setPage(1); setSelectedSerials(new Set()); };

  // Selection
  const toggleSelect = (serial: string) => {
    setSelectedSerials(prev => {
      const next = new Set(prev);
      if (next.has(serial)) next.delete(serial); else next.add(serial);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSerials.size === pagedRecords.length) {
      setSelectedSerials(new Set());
    } else {
      setSelectedSerials(new Set(pagedRecords.map(r => r.serial as string)));
    }
  };

  // Batch export
  const handleBatchExport = async (format: 'docx' | 'json' | 'csv') => {
    setExportMenuOpen(false);
    setIsExporting(true);
    try {
      const selected = selectedSerials.size > 0
        ? records!.filter(r => selectedSerials.has(r.serial as string))
        : filteredRecords;
      if (selected.length === 0) { toast.error('No records to export'); return; }

      switch (format) {
        case 'docx': await exportRecordsToDocx(selected as Record<string, unknown>[]); break;
        case 'json': exportRecordsToJson(selected as Record<string, unknown>[]); break;
        case 'csv': exportRecordsToCsv(selected as Record<string, unknown>[]); break;
      }
      toast.success(`Exported ${selected.length} record(s) as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error('Export failed: ' + (err as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  // ─── Loading state ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-4" />
        <p className="text-slate-400">Loading records from Google Sheets...</p>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl text-slate-300 mb-2">Failed to Load Records</h2>
        <p className="text-slate-500 mb-4">{(error as Error).message}</p>
        <button onClick={() => refetch()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Records</h1>
          <p className="text-sm text-slate-400 mt-1">
            {records?.length || 0} records across {activeFormCodes.length} form types
            {selectedSerials.size > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-500/20 text-indigo-400 rounded-full">
                {selectedSerials.size} selected
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Batch export */}
          <div className="relative">
            <button
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={isExporting}
              className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
            {exportMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs text-slate-500 border-b border-slate-700 bg-slate-800/80">
                    {selectedSerials.size > 0
                      ? `Export ${selectedSerials.size} selected record(s)`
                      : `Export all ${filteredRecords.length} visible record(s)`}
                  </div>
                  <button
                    onClick={() => handleBatchExport('docx')}
                    className="w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3"
                  >
                    <FileTextIcon className="w-4 h-4 text-blue-400" />
                    <div className="text-left">
                      <div className="font-medium">Word Document</div>
                      <div className="text-xs text-slate-500">.docx — formatted report</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleBatchExport('json')}
                    className="w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 border-t border-slate-700"
                  >
                    <FileJson className="w-4 h-4 text-green-400" />
                    <div className="text-left">
                      <div className="font-medium">JSON</div>
                      <div className="text-xs text-slate-500">.json — raw data</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleBatchExport('csv')}
                    className="w-full px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 border-t border-slate-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    <div className="text-left">
                      <div className="font-medium">CSV</div>
                      <div className="text-xs text-slate-500">.csv — spreadsheet</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => refetch()}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by serial, name, or content..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={formFilter}
          onChange={e => handleFilterChange(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="all">All Forms</option>
          {activeFormCodes.map(code => (
            <option key={code} value={code}>
              {code} — {formNames[code] || code}
            </option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'serial' | 'date' | 'edited')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="serial">Sort by Serial</option>
          <option value="date">Sort by Date</option>
          <option value="edited">Sort by Edits</option>
        </select>

        {selectedSerials.size > 0 && (
          <button
            onClick={() => setSelectedSerials(new Set())}
            className="px-3 py-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg flex items-center gap-1"
          >
            <XCircle className="w-4 h-4" /> Clear
          </button>
        )}
      </div>

      {/* Record List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg text-slate-400 mb-2">No Records Found</h3>
          <p className="text-sm text-slate-500">
            {records?.length === 0
              ? 'Create your first record to get started.'
              : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <>
          {/* Select All bar */}
          <div className="flex items-center gap-3 mb-2 px-4 py-2 bg-slate-900/30 rounded-t-lg border border-b-0 border-slate-700/30">
            <button onClick={toggleSelectAll} className="text-slate-400 hover:text-indigo-400 transition-colors">
              {selectedSerials.size === pagedRecords.length && pagedRecords.length > 0
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />}
            </button>
            <span className="text-xs text-slate-500">
              Page {safePage} of {totalPages} · Showing {pagedRecords.length} of {filteredRecords.length}
            </span>
          </div>

          <div className="space-y-1">
            {pagedRecords.map(record => {
              const risk = getEditRiskLevel(record as QMSRecord);
              const sev = integrityCache.get(record.serial as string) || 'clean';
              const isSelected = selectedSerials.has(record.serial as string);

              return (
                <button
                  key={record.serial as string}
                  onClick={() => navigate(`/records/${encodeURIComponent(record.serial as string)}`)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg transition-all text-left group ${
                    isSelected
                      ? 'bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/15'
                      : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-indigo-500/30'
                  }`}
                >
                  {/* Checkbox — stop propagation so click doesn't navigate */}
                  <div
                    className="shrink-0"
                    onClick={e => { e.stopPropagation(); toggleSelect(record.serial as string); }}
                  >
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-indigo-400 cursor-pointer" />
                      : <Square className="w-4 h-4 text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors" />}
                  </div>

                  {/* Serial + Type */}
                  <div className="w-28 shrink-0">
                    <span className="font-mono text-sm font-semibold text-indigo-400 group-hover:text-indigo-300">
                      {record.serial as string}
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">{record.formCode as string}</p>
                  </div>

                  {/* Name + Status */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate group-hover:text-slate-100">
                      {record.formName as string}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {record.status && (
                        <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[record.status as string] || 'bg-slate-600/30 text-slate-400'}`}>
                          {record.status as string}
                        </span>
                      )}
                      {record.date && (
                        <span className="text-xs text-slate-500">
                          {isoToDisplay(record.date as string)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Integrity + Edit count */}
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-xs flex items-center gap-1 ${
                      sev === 'clean' ? 'text-green-400' : sev === 'warning' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {sev === 'clean' ? <CheckCircle className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                      {sev !== 'clean' && `${integrityCache.get(record.serial as string) === 'clean' ? '' : ''}`}
                    </span>
                    {(record._editCount as number) > 0 && (
                      <span className={`text-xs ${risk === 'high' ? 'text-red-400' : risk === 'medium' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {(record._editCount as number)} edit{(record._editCount as number) !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 transition-colors" />
                </button>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-2">
              <p className="text-xs text-slate-500">
                {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} total
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    acc.push(p);
                    if (i < arr.length - 1 && arr[i + 1] !== p + 1) acc.push('...');
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-slate-600">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-sm rounded-lg ${
                          p === safePage
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RecordListPage;